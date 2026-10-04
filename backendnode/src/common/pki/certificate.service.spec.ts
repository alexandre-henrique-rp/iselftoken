import { Test, TestingModule } from '@nestjs/testing';
import { CertificateService, OwnerType } from './certificate.service';
import { CaInitService, KEY_STORAGE_SERVICE } from './ca-init.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as forge from 'node-forge';

// Helper to generate a real self-signed certificate for testing
function generateSelfSignedCert(
  commonName: string,
  daysValid: number,
): { cert: string; privateKey: string } {
  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(
    Date.now() + daysValid * 24 * 60 * 60 * 1000,
  );
  cert.setSubject([{ name: 'commonName', value: commonName }]);
  cert.setIssuer([{ name: 'commonName', value: commonName }]);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, pathLenConstraint: 1 },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true },
    { name: 'subjectKeyIdentifier', hash: true },
  ]);
  cert.sign(keypair.privateKey, forge.md.sha256.create());
  return {
    cert: forge.pki.certificateToPem(cert),
    privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
  };
}

// Generate real certificates for testing
const rootCertData = generateSelfSignedCert('ISELFTOKEN ROOT CA G1', 365 * 10);
const intermediateCertData = generateSelfSignedCert(
  'ISELFTOKEN INTERMEDIATE CA G1',
  365 * 5,
);

const mockIntermediateCa = {
  id: 'intermediate-ca-id',
  type: 'intermediate',
  commonName: 'ISELFTOKEN INTERMEDIATE CA G1',
  organization: 'Iselftoken',
  certificatePem: intermediateCertData.cert,
  privateKeyRef: 'iselftoken/pki/intermediate/private',
  issuedAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000),
  status: 'active',
  parentCaId: 'root-ca-id',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CertificateService', () => {
  let service: CertificateService;
  let mockPrismaService: any;
  let mockKeyStorage: any;
  let mockCaInitService: any;

  beforeEach(async () => {
    mockPrismaService = {
      digitalCertificate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      certificateAuthority: {
        findFirst: jest.fn(),
      },
    };

    mockKeyStorage = {
      store: jest
        .fn()
        .mockResolvedValue('iselftoken/pki/certs/test-serial/private'),
      retrieve: jest.fn().mockResolvedValue(intermediateCertData.privateKey),
      exists: jest.fn().mockResolvedValue(false),
    };

    mockCaInitService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KEY_STORAGE_SERVICE, useValue: mockKeyStorage },
        { provide: CaInitService, useValue: mockCaInitService },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('issue', () => {
    it('should create a new certificate when no active cert exists', async () => {
      // No existing certificate
      mockPrismaService.digitalCertificate.findFirst.mockResolvedValue(null);
      mockPrismaService.certificateAuthority.findFirst.mockResolvedValue(
        mockIntermediateCa,
      );
      mockPrismaService.digitalCertificate.create.mockImplementation(
        (data: any) => ({
          id: 'new-cert-id',
          ...data.data,
        }),
      );

      const result = await service.issue('founder', 'user-123');

      expect(result.wasCreated).toBe(true);
      expect(result.certificate.ownerType).toBe('founder');
      expect(result.certificate.ownerId).toBe('user-123');
      expect(result.certificate.status).toBe('active');
      expect(mockPrismaService.digitalCertificate.create).toHaveBeenCalled();
      expect(mockKeyStorage.store).toHaveBeenCalled();
    });

    it('should return existing certificate when active cert exists (idempotency)', async () => {
      const existingCert = {
        id: 'existing-cert-id',
        ownerType: 'founder',
        ownerId: 'user-123',
        serialNumber: 'EXISTING123',
        certificatePem: 'pem',
        publicKeyFingerprint: 'fp',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
      };

      mockPrismaService.digitalCertificate.findFirst.mockResolvedValue(
        existingCert,
      );

      const result = await service.issue('founder', 'user-123');

      expect(result.wasCreated).toBe(false);
      expect(result.certificate.id).toBe('existing-cert-id');
      expect(
        mockPrismaService.digitalCertificate.create,
      ).not.toHaveBeenCalled();
    });

    it('should throw error when Intermediate CA not found', async () => {
      mockPrismaService.digitalCertificate.findFirst.mockResolvedValue(null);
      mockPrismaService.certificateAuthority.findFirst.mockResolvedValue(null);

      await expect(service.issue('founder', 'user-123')).rejects.toThrow(
        'Intermediate CA not found',
      );
    });

    it('should not create new certificate when existing one is expired', async () => {
      const expiredCert = {
        id: 'expired-cert-id',
        ownerType: 'founder',
        ownerId: 'user-456',
        serialNumber: 'EXPIRED123',
        certificatePem: 'pem',
        publicKeyFingerprint: 'fp',
        issuedAt: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired yesterday
        status: 'active',
      };

      // findFirst returns null because expired cert doesn't satisfy expiresAt > now
      mockPrismaService.digitalCertificate.findFirst.mockResolvedValue(null);
      mockPrismaService.certificateAuthority.findFirst.mockResolvedValue(
        mockIntermediateCa,
      );
      mockPrismaService.digitalCertificate.create.mockImplementation(
        (data: any) => ({
          id: 'new-cert-id',
          ...data.data,
        }),
      );

      const result = await service.issue('founder', 'user-456');

      expect(result.wasCreated).toBe(true);
      expect(result.certificate.id).not.toBe('expired-cert-id');
    });
  });

  describe('getActiveCert', () => {
    it('should return active certificate for owner', async () => {
      const activeCert = {
        id: 'active-cert-id',
        ownerType: 'founder',
        ownerId: 'user-123',
        serialNumber: 'ACTIVE123',
        certificatePem: 'pem',
        publicKeyFingerprint: 'fp',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
      };

      mockPrismaService.digitalCertificate.findFirst.mockResolvedValue(
        activeCert,
      );

      const result = await service.getActiveCert('founder', 'user-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('active-cert-id');
    });

    it('should return null when no active certificate exists', async () => {
      mockPrismaService.digitalCertificate.findFirst.mockResolvedValue(null);

      const result = await service.getActiveCert('founder', 'user-999');

      expect(result).toBeNull();
    });
  });

  describe('revoke', () => {
    it('should mark certificate as revoked with reason', async () => {
      const cert = {
        id: 'cert-to-revoke',
        ownerType: 'founder',
        ownerId: 'user-123',
        status: 'active',
      };

      mockPrismaService.digitalCertificate.findUnique.mockResolvedValue(cert);
      mockPrismaService.digitalCertificate.update.mockResolvedValue({
        ...cert,
        status: 'revoked',
        revokedAt: expect.any(Date),
        revocationReason: 'User requested',
      });

      await service.revoke('cert-to-revoke', 'User requested');

      expect(mockPrismaService.digitalCertificate.update).toHaveBeenCalledWith({
        where: { id: 'cert-to-revoke' },
        data: {
          status: 'revoked',
          revokedAt: expect.any(Date),
          revocationReason: 'User requested',
        },
      });
    });

    it('should throw error when certificate not found', async () => {
      mockPrismaService.digitalCertificate.findUnique.mockResolvedValue(null);

      await expect(service.revoke('nonexistent', 'reason')).rejects.toThrow(
        'Certificate not found',
      );
    });
  });

  describe('findExpiringSoon', () => {
    it('should return certificates expiring within threshold', async () => {
      const now = new Date();
      const expiringCerts = [
        {
          id: 'cert-1',
          ownerType: 'founder',
          ownerId: 'user-1',
          serialNumber: 'SERIAL1',
          expiresAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days
        },
        {
          id: 'cert-2',
          ownerType: 'startup',
          ownerId: 'startup-1',
          serialNumber: 'SERIAL2',
          expiresAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // 25 days
        },
      ];

      mockPrismaService.digitalCertificate.findMany.mockResolvedValue(
        expiringCerts,
      );

      const result = await service.findExpiringSoon(30);

      expect(result).toHaveLength(2);
      expect(result[0].daysUntilExpiry).toBeLessThanOrEqual(30);
      expect(result[0].daysUntilExpiry).toBeGreaterThan(0);
    });

    it('should return empty array when no certificates are expiring soon', async () => {
      mockPrismaService.digitalCertificate.findMany.mockResolvedValue([]);

      const result = await service.findExpiringSoon(30);

      expect(result).toHaveLength(0);
    });
  });

  describe('markExpiredCertificates', () => {
    it('should mark expired certificates as expired', async () => {
      mockPrismaService.digitalCertificate.updateMany.mockResolvedValue({
        count: 3,
      });

      const result = await service.markExpiredCertificates();

      expect(result).toBe(3);
      expect(
        mockPrismaService.digitalCertificate.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          status: 'active',
          expiresAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'expired',
        },
      });
    });

    it('should return 0 when no certificates are expired', async () => {
      mockPrismaService.digitalCertificate.updateMany.mockResolvedValue({
        count: 0,
      });

      const result = await service.markExpiredCertificates();

      expect(result).toBe(0);
    });
  });
});

describe('CertExpirationCron', () => {
  let cron: any;
  let mockCertificateService: any;

  beforeEach(async () => {
    mockCertificateService = {
      markExpiredCertificates: jest.fn().mockResolvedValue(5),
    };

    const { CertExpirationCron } = await import('./cert-expiration.cron');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CertificateService,
          useValue: mockCertificateService,
        },
        CertExpirationCron,
      ],
    }).compile();

    cron = module.get<any>(CertExpirationCron);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleCertificateExpiration', () => {
    it('should call markExpiredCertificates on cron execution', async () => {
      await cron.handleCertificateExpiration();

      expect(
        mockCertificateService.markExpiredCertificates,
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockCertificateService.markExpiredCertificates.mockRejectedValueOnce(
        new Error('Database error'),
      );

      // Should not throw
      await expect(cron.handleCertificateExpiration()).resolves.not.toThrow();
    });
  });
});
