import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../s3/s3.service';
import { CertificateService } from '../../common/pki/certificate.service';
import * as crypto from 'crypto';
import {
  VerificarResponseDto,
  SignataryDto,
  AuditDto,
  ValidationDto,
  DocumentInfoDto,
  CertificateInfoDto,
  DocumentMaskedDto,
} from './dto/verificar-response.dto';

/**
 * Tempo de validade da presigned URL em segundos (7 dias).
 */
const PRESIGNED_URL_TTL = 7 * 24 * 60 * 60;

/**
 * Tempo de cache da resposta publica em segundos (5 minutos).
 */
const CACHE_TTL_SECONDS = 300;

/**
 * Service for public document verification.
 *
 * @description Handles public verification of signed documents:
 * - Validates document existence
 * - Verifies PDF hash integrity by recalculating SHA-256
 * - Checks certificate validity (active and not expired)
 * - Sanitizes sensitive data (CPF, CNPJ, IPs, user-agents)
 * - Returns cached responses for performance
 */
@Injectable()
export class VerificarService {
  private readonly logger = new Logger(VerificarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly certificateService: CertificateService,
  ) {}

  /**
   * Verifies the authenticity of a signed document.
   *
   * This method performs comprehensive validation:
   * 1. Document existence check
   * 2. PDF hash integrity (recalculate SHA-256 and compare)
   * 3. Certificate validity (active, not expired)
   * 4. Signature recency (signed within certificate validity)
   *
   * All sensitive data (CPF, CNPJ, IPs, user-agents) is masked.
   *
   * @param documentId - UUID of the signed document
   * @returns VerificarResponseDto with validation results
   * @throws NotFoundException if document does not exist
   */
  async verificarDocumento(documentId: string): Promise<VerificarResponseDto> {
    this.logger.debug(`[VerificarService] Verifying document: ${documentId}`);

    // Step 1: Find the signed document
    const signedDoc = await this.prisma.signedDocument.findUnique({
      where: { id: documentId },
      include: {
        startup: {
          select: {
            id: true,
            nome: true,
            cnpj: true,
          },
        },
        signatureFounderCert: true,
        signatureStartupCert: true,
        audits: {
          orderBy: { createdAt: 'asc' },
          select: {
            action: true,
            createdAt: true,
          },
        },
      },
    });

    if (!signedDoc) {
      throw new NotFoundException({
        exists: false,
        message: 'Documento nao encontrado',
      });
    }

    // Step 2: Recalculate PDF hash from S3
    const hashMatches = await this.verifyPdfHash(
      signedDoc.fileKey,
      signedDoc.documentHash,
    );

    // Step 3: Check certificate validity
    const now = new Date();
    const founderCert = signedDoc.signatureFounderCert;
    const startupCert = signedDoc.signatureStartupCert;

    const founderCertActive =
      founderCert.status === 'active' && founderCert.expiresAt > now;
    const startupCertActive =
      startupCert.status === 'active' && startupCert.expiresAt > now;
    const certificatesActive = founderCertActive && startupCertActive;

    // Step 4: Check if signed within certificate validity
    const signedWithinValidity =
      signedDoc.signatureFounderAt >= founderCert.issuedAt &&
      signedDoc.signatureFounderAt <= founderCert.expiresAt &&
      signedDoc.signatureStartupAt >= startupCert.issuedAt &&
      signedDoc.signatureStartupAt <= startupCert.expiresAt;

    // Step 5: Build validation result
    const validation: ValidationDto = {
      hashMatches,
      certificatesActive,
      signedWithinValidity,
    };

    const isValid = hashMatches && certificatesActive && signedWithinValidity;

    // Step 6: Get founder info (with masking)
    const founder = await this.prisma.user.findUnique({
      where: { id: signedDoc.founderId },
      select: {
        id: true,
        nome: true,
        tipo_documento: true,
        reg_documento: true,
      },
    });

    // Step 7: Build signataries with masked data
    const signataries: SignataryDto[] = [];

    if (founder) {
      signataries.push({
        role: 'founder',
        displayName: this.formatDisplayName(founder.nome),
        document: {
          type: founder.tipo_documento === 'CPF' ? 'CPF' : 'DOCUMENT',
          masked: this.maskDocument(
            founder.tipo_documento,
            founder.reg_documento,
          ),
        },
        certificate: this.buildCertificateInfo(founderCert),
      });
    }

    signataries.push({
      role: 'startup',
      displayName: signedDoc.startup.nome,
      document: {
        type: 'CNPJ',
        masked: this.maskCnpj(signedDoc.startup.cnpj || ''),
      },
      certificate: this.buildCertificateInfo(startupCert),
    });

    // Step 8: Build audits (without sensitive data)
    const audits: AuditDto[] = signedDoc.audits.map((audit) => ({
      action: audit.action,
      createdAt: audit.createdAt.toISOString(),
    }));

    // Step 9: Build document info
    const document: DocumentInfoDto = {
      type: signedDoc.type,
      signedAt: signedDoc.signatureFounderAt.toISOString(),
      templateVersion: signedDoc.templateVersion,
    };

    this.logger.log(
      `[VerificarService] Document ${documentId} verified: valid=${isValid}, hashMatches=${hashMatches}, certsActive=${certificatesActive}`,
    );

    return {
      exists: true,
      valid: isValid,
      validation,
      document,
      signataries,
      audits,
    };
  }

  /**
   * Gets the presigned download URL for a signed document.
   *
   * @param documentId - UUID of the signed document
   * @returns Presigned URL for S3 download
   * @throws NotFoundException if document does not exist
   */
  async getDownloadUrl(documentId: string): Promise<string> {
    const signedDoc = await this.prisma.signedDocument.findUnique({
      where: { id: documentId },
      select: { fileKey: true },
    });

    if (!signedDoc) {
      throw new NotFoundException({
        exists: false,
        message: 'Documento nao encontrado',
      });
    }

    return this.s3Service.getUrl(
      'document',
      signedDoc.fileKey,
      PRESIGNED_URL_TTL,
    );
  }

  /**
   * Verifies the PDF hash by recalculating SHA-256 from S3.
   *
   * @private
   * @param fileKey - S3 key of the PDF
   * @param storedHash - Stored hash to compare against
   * @returns true if hashes match
   */
  private async verifyPdfHash(
    fileKey: string,
    storedHash: string,
  ): Promise<boolean> {
    try {
      const result = await this.s3Service.download('document', fileKey);
      const recalculatedHash = crypto
        .createHash('sha256')
        .update(result.body)
        .digest('hex');

      const matches = recalculatedHash === storedHash;

      if (!matches) {
        this.logger.warn(
          `[VerificarService] Hash mismatch for ${fileKey}: stored=${storedHash.substring(0, 16)}..., calculated=${recalculatedHash.substring(0, 16)}...`,
        );
      }

      return matches;
    } catch (error) {
      this.logger.error(
        `[VerificarService] Failed to verify PDF hash for ${fileKey}: ${error}`,
      );
      return false;
    }
  }

  /**
   * Formats a display name from a full name.
   *
   * @private
   * @param fullName - Full name to format
   * @returns Formatted display name (e.g., "F. Silva" from "Francisco Silva")
   */
  private formatDisplayName(fullName: string): string {
    if (!fullName || fullName.trim().length === 0) {
      return 'Fundador';
    }

    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0];
    }

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const initial = firstName.charAt(0).toUpperCase();

    return `${initial}. ${lastName}`;
  }

  /**
   * Masks a document number (CPF or other).
   *
   * @private
   * @param tipo - Document type (CPF, CNH, etc.)
   * @param numero - Document number
   * @returns Masked document number
   */
  private maskDocument(
    tipo: string | null | undefined,
    numero: string | null | undefined,
  ): string {
    if (tipo === 'CPF' && numero) {
      const digits = numero.replace(/\D/g, '');
      if (digits.length === 11) {
        return `***.***.***-${digits.slice(-2)}`;
      }
    }

    // For other documents or invalid data
    if (numero && numero.length > 4) {
      return `***.***-${numero.slice(-2)}`;
    }

    return '***.***.***-**';
  }

  /**
   * Masks a CNPJ number.
   *
   * @private
   * @param cnpj - CNPJ number (with or without mask)
   * @returns Masked CNPJ (format: XX.XXX.XXX/XXXX-XX, only last 2 digits visible)
   */
  private maskCnpj(cnpj: string): string {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length === 14) {
      // CNPJ format: 12.345.678/0001-90
      // Masked format: **.***.***/****-90 (only last 2 digits visible)
      return `**.***.***/****-${digits.slice(-2)}`;
    }
    return '**.***.***/****-**';
  }

  /**
   * Builds certificate info DTO from a certificate record.
   *
   * @private
   * @param cert - DigitalCertificate record
   * @returns CertificateInfoDto
   */
  private buildCertificateInfo(cert: {
    serialNumber: string;
    publicKeyFingerprint: string;
    issuedAt: Date;
    expiresAt: Date;
    status: string;
  }): CertificateInfoDto {
    return {
      serialNumber: cert.serialNumber,
      fingerprint: cert.publicKeyFingerprint,
      issuedAt: cert.issuedAt.toISOString(),
      expiresAt: cert.expiresAt.toISOString(),
      status: cert.status as 'active' | 'revoked' | 'expired',
    };
  }
}
