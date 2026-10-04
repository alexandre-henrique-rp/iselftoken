import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IKeyStorageService } from './key-storage/key-storage.interface';
import { CaInitService, KEY_STORAGE_SERVICE } from './ca-init.service';
import * as forge from 'node-forge';
import * as crypto from 'crypto';

/**
 * Validity period for digital certificates (1 year in days).
 */
const CERT_VALIDITY_DAYS = 365;

/**
 * Supported owner types for digital certificates.
 */
export type OwnerType = 'founder' | 'startup';

/**
 * Result of issuing a certificate.
 */
export interface IssueCertificateResult {
  certificate: {
    id: string;
    ownerType: string;
    ownerId: string;
    serialNumber: string;
    publicKeyFingerprint: string;
    issuedAt: Date;
    expiresAt: Date;
    status: string;
  };
  wasCreated: boolean; // false if existing certificate was returned (idempotency)
}

/**
 * Certificate expiration info.
 */
export interface ExpiringCertificateInfo {
  id: string;
  ownerType: string;
  ownerId: string;
  serialNumber: string;
  expiresAt: Date;
  daysUntilExpiry: number;
}

/**
 * Service for managing digital certificates for the Termo de Adesao.
 *
 * This service:
 * - Issues digital certificates (X.509) signed by the Intermediate CA
 * - Provides idempotent certificate issuance (one active cert per owner)
 * - Supports revocation of certificates
 * - Finds certificates expiring within a threshold
 * - Runs daily cron job to mark expired certificates
 *
 * @description Issues and manages digital certificates for term of adhesion digital signatures.
 */
@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(KEY_STORAGE_SERVICE)
    private readonly keyStorage: IKeyStorageService,
    private readonly caInitService: CaInitService,
  ) {}

  /**
   * Issues a digital certificate for an owner or returns existing active one.
   *
   * This method is idempotent: if an active certificate already exists for
   * the (ownerType, ownerId) pair, it returns the existing certificate.
   * If no active certificate exists or the existing one is expired, a new
   * certificate is issued.
   *
   * @param ownerType - Type of owner: 'founder' or 'startup'
   * @param ownerId - ID of the owner (user.id for founder, startup.id for startup)
   * @returns IssueCertificateResult with certificate data and whether it was newly created
   * @throws {Error} If no Intermediate CA is available
   *
   * @example
   * const result = await certificateService.issue('founder', 'user-123');
   * // result.wasCreated === true if new cert, false if existing cert returned
   */
  async issue(
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<IssueCertificateResult> {
    // First check if an active certificate already exists (idempotency)
    const existingCert = await this.getActiveCert(ownerType, ownerId);
    if (existingCert) {
      this.logger.debug(
        `[CertificateService] Active certificate exists for ${ownerType}:${ownerId}, returning existing`,
      );
      return {
        certificate: {
          id: existingCert.id,
          ownerType: existingCert.ownerType,
          ownerId: existingCert.ownerId,
          serialNumber: existingCert.serialNumber,
          publicKeyFingerprint: existingCert.publicKeyFingerprint,
          issuedAt: existingCert.issuedAt,
          expiresAt: existingCert.expiresAt,
          status: existingCert.status,
        },
        wasCreated: false,
      };
    }

    // No active certificate found - issue a new one
    this.logger.log(
      `[CertificateService] Issuing new certificate for ${ownerType}:${ownerId}`,
    );

    // Get Intermediate CA
    const intermediateCa = await this.getIntermediateCa();
    if (!intermediateCa) {
      throw new Error(
        'Intermediate CA not found. Please run PKI initialization first.',
      );
    }

    // Generate RSA key pair
    const { publicKeyPem, privateKeyPem, publicKeyDer } =
      this.generateKeyPair();

    // Generate serial number
    const serialNumber = this.generateSerialNumber();

    // Create CSR
    const csrPem = this.createCsr(
      ownerType,
      ownerId,
      publicKeyPem,
      privateKeyPem,
    );

    // Sign certificate with Intermediate CA
    const certificatePem = await this.signCertificate(
      csrPem,
      intermediateCa,
      serialNumber,
    );

    // Compute public key fingerprint (SHA-256 of DER-encoded public key)
    const publicKeyFingerprint = this.computePublicKeyFingerprint(publicKeyDer);

    // Store private key in KeyStorageService
    const privateKeyRef = `iselftoken/pki/certs/${serialNumber}/private`;
    await this.keyStorage.store(privateKeyRef, privateKeyPem);

    // Calculate expiry date
    const issuedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CERT_VALIDITY_DAYS);

    // Persist certificate
    const certificate = await this.prisma.digitalCertificate.create({
      data: {
        issuerCaId: intermediateCa.id,
        ownerType,
        ownerId,
        serialNumber,
        certificatePem,
        privateKeyRef,
        publicKeyFingerprint,
        issuedAt,
        expiresAt,
        status: 'active',
      },
    });

    this.logger.log(
      `[CertificateService] Certificate issued: ${certificate.id} for ${ownerType}:${ownerId}`,
    );

    return {
      certificate: {
        id: certificate.id,
        ownerType: certificate.ownerType,
        ownerId: certificate.ownerId,
        serialNumber: certificate.serialNumber,
        publicKeyFingerprint: certificate.publicKeyFingerprint,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        status: certificate.status,
      },
      wasCreated: true,
    };
  }

  /**
   * Retrieves the active certificate for an owner, if exists.
   *
   * @param ownerType - Type of owner: 'founder' or 'startup'
   * @param ownerId - ID of the owner
   * @returns The active certificate or null if not found
   */
  async getActiveCert(
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<{
    id: string;
    ownerType: string;
    ownerId: string;
    serialNumber: string;
    certificatePem: string;
    publicKeyFingerprint: string;
    issuedAt: Date;
    expiresAt: Date;
    status: string;
  } | null> {
    const now = new Date();

    const certificate = await this.prisma.digitalCertificate.findFirst({
      where: {
        ownerType,
        ownerId,
        status: 'active',
        expiresAt: { gt: now }, // Must not be expired
      },
      orderBy: { createdAt: 'desc' },
    });

    return certificate;
  }

  /**
   * Revokes a certificate.
   *
   * @param certId - ID of the certificate to revoke
   * @param reason - Reason for revocation
   * @throws {Error} If certificate not found
   */
  async revoke(certId: string, reason: string): Promise<void> {
    const certificate = await this.prisma.digitalCertificate.findUnique({
      where: { id: certId },
    });

    if (!certificate) {
      throw new Error(`Certificate not found: ${certId}`);
    }

    await this.prisma.digitalCertificate.update({
      where: { id: certId },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });

    this.logger.log(
      `[CertificateService] Certificate revoked: ${certId}, reason: ${reason}`,
    );
  }

  /**
   * Finds certificates expiring within the specified threshold.
   *
   * @param thresholdDays - Number of days from now to consider as expiring
   * @returns List of expiring certificates with days until expiry
   */
  async findExpiringSoon(
    thresholdDays: number,
  ): Promise<ExpiringCertificateInfo[]> {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);

    const certificates = await this.prisma.digitalCertificate.findMany({
      where: {
        status: 'active',
        expiresAt: {
          gt: now, // Already expired ones are handled by cron
          lte: thresholdDate, // Within threshold
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return certificates.map((cert) => ({
      id: cert.id,
      ownerType: cert.ownerType,
      ownerId: cert.ownerId,
      serialNumber: cert.serialNumber,
      expiresAt: cert.expiresAt,
      daysUntilExpiry: Math.ceil(
        (cert.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  /**
   * Marks expired certificates as 'expired' status.
   * Called by the daily cron job.
   *
   * @returns Number of certificates marked as expired
   */
  async markExpiredCertificates(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.digitalCertificate.updateMany({
      where: {
        status: 'active',
        expiresAt: { lt: now },
      },
      data: {
        status: 'expired',
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `[CertificateService] Marked ${result.count} certificates as expired`,
      );
    }

    return result.count;
  }

  /**
   * Generates an RSA 2048 key pair.
   *
   * @private
   * @returns Public key PEM, private key PEM, and DER-encoded public key
   */
  private generateKeyPair(): {
    publicKeyPem: string;
    privateKeyPem: string;
    publicKeyDer: Buffer;
  } {
    // Generate RSA key pair using Node.js crypto
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    // Get DER-encoded public key for fingerprint
    const publicKeyDer = crypto.createPublicKey(publicKey).export({
      type: 'spki',
      format: 'der',
    });

    return {
      publicKeyPem: publicKey,
      privateKeyPem: privateKey,
      publicKeyDer: Buffer.from(publicKeyDer),
    };
  }

  /**
   * Generates a unique serial number for certificates.
   *
   * @private
   * @returns Hex-encoded serial number
   */
  private generateSerialNumber(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Creates a CSR (Certificate Signing Request) for the certificate.
   *
   * @private
   * @param ownerType - Type of owner
   * @param ownerId - ID of the owner
   * @param publicKeyPem - Public key in PEM format
   * @param privateKeyPem - Private key in PEM format (for signing the CSR)
   * @returns CSR in PEM format
   */
  private createCsr(
    ownerType: OwnerType,
    ownerId: string,
    publicKeyPem: string,
    privateKeyPem: string,
  ): string {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = publicKey;

    // Set subject based on owner type
    const commonName =
      ownerType === 'founder' ? `USER:${ownerId}` : `STARTUP:${ownerId}`;

    csr.setSubject([
      { name: 'commonName', value: commonName },
      { name: 'organizationName', value: 'Iselftoken' },
      { name: 'countryName', value: 'BR' },
    ]);

    // Sign CSR with SHA-256 using the private key
    csr.sign(privateKey, forge.md.sha256.create());

    return forge.pki.certificationRequestToPem(csr);
  }

  /**
   * Signs a certificate using the Intermediate CA.
   *
   * @private
   * @param csrPem - CSR in PEM format
   * @param intermediateCa - Intermediate CA record from database
   * @param serialNumber - Serial number for the certificate
   * @returns Certificate in PEM format
   */
  private async signCertificate(
    csrPem: string,
    intermediateCa: {
      id: string;
      certificatePem: string;
      privateKeyRef: string;
    },
    serialNumber: string,
  ): Promise<string> {
    // Parse CSR
    const csr = forge.pki.certificationRequestFromPem(csrPem);
    if (!csr.verify()) {
      throw new Error('CSR verification failed');
    }

    // Get Intermediate CA private key from KeyStorage
    const intermediatePrivateKeyPem = await this.keyStorage.retrieve(
      intermediateCa.privateKeyRef,
    );
    const intermediatePrivateKey = forge.pki.privateKeyFromPem(
      intermediatePrivateKeyPem,
    );

    // Parse Intermediate CA certificate
    const intermediateCert = forge.pki.certificateFromPem(
      intermediateCa.certificatePem,
    );

    // Create certificate
    const cert = forge.pki.createCertificate();
    if (!csr.publicKey) {
      throw new Error('CSR has no public key');
    }
    cert.publicKey = csr.publicKey;
    cert.serialNumber = serialNumber;
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setDate(
      cert.validity.notAfter.getDate() + CERT_VALIDITY_DAYS,
    );

    // Set subject from CSR
    cert.setSubject(csr.subject.attributes);

    // Set issuer to Intermediate CA
    cert.setIssuer(intermediateCert.subject.attributes);

    // Extensions for end-entity certificate
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false,
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: false,
        dataEncipherment: false,
      },
      {
        name: 'subjectKeyIdentifier',
        hash: true,
      },
      {
        name: 'authorityKeyIdentifier',
        issuer: true,
        keyIdentifier: true,
        serialNumber: true,
      },
    ]);

    // Sign with Intermediate CA private key
    cert.sign(intermediatePrivateKey, forge.md.sha256.create());

    return forge.pki.certificateToPem(cert);
  }

  /**
   * Computes SHA-256 fingerprint of a public key.
   *
   * @private
   * @param publicKeyDer - DER-encoded public key
   * @returns Hex-encoded SHA-256 fingerprint
   */
  private computePublicKeyFingerprint(publicKeyDer: Buffer): string {
    return crypto.createHash('sha256').update(publicKeyDer).digest('hex');
  }

  /**
   * Retrieves the Intermediate CA for signing certificates.
   *
   * @private
   * @returns The Intermediate CA record or null
   */
  private async getIntermediateCa(): Promise<{
    id: string;
    certificatePem: string;
    privateKeyRef: string;
  } | null> {
    return this.prisma.certificateAuthority.findFirst({
      where: {
        type: 'intermediate',
        status: 'active',
      },
      select: {
        id: true,
        certificatePem: true,
        privateKeyRef: true,
      },
    });
  }
}
