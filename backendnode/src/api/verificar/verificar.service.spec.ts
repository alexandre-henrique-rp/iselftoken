import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VerificarService } from './verificar.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../s3/s3.service';
import { CertificateService } from '../../common/pki/certificate.service';

describe('VerificarService', () => {
  let service: VerificarService;
  let prisma: PrismaService;
  let s3Service: S3Service;
  let certificateService: CertificateService;

  const mockPrismaService = {
    signedDocument: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockS3Service = {
    download: jest.fn(),
    getUrl: jest.fn(),
  };

  const mockCertificateService = {
    getActiveCert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificarService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: CertificateService, useValue: mockCertificateService },
      ],
    }).compile();

    service = module.get<VerificarService>(VerificarService);
    prisma = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
    certificateService = module.get<CertificateService>(CertificateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verificarDocumento', () => {
    const validDocumentId = 'doc-valid-123';
    // This is the actual SHA-256 hash of "fake pdf content"
    const validStoredHash =
      '65f0a35a19c356b113ec994fd2895ccb903e4a55dacd9e8f9bbe6d945531c7ce';

    const mockSignedDocument = {
      id: validDocumentId,
      startupId: 1,
      founderId: 100,
      type: 'termo_adesao',
      templateVersion: '1.0.0',
      fileKey: 'termo-adesao/1/1705312200000.pdf',
      documentHash: validStoredHash,
      signatureFounderCertId: 'cert-founder-1',
      signatureStartupCertId: 'cert-startup-1',
      signatureFounderAt: new Date('2024-01-15T10:30:00.000Z'),
      signatureStartupAt: new Date('2024-01-15T10:30:05.000Z'),
      createdAt: new Date('2024-01-15T10:30:05.000Z'),
      startup: {
        id: 1,
        nome: 'Startup XYZ LTDA',
        cnpj: '12345678000190',
      },
      signatureFounderCert: {
        id: 'cert-founder-1',
        serialNumber: 'FOUNDER123',
        publicKeyFingerprint: 'founderfingerprint123',
        issuedAt: new Date('2024-01-01T00:00:00.000Z'),
        expiresAt: new Date('2027-01-01T00:00:00.000Z'), // Future date
        status: 'active',
      },
      signatureStartupCert: {
        id: 'cert-startup-1',
        serialNumber: 'STARTUP456',
        publicKeyFingerprint: 'startupfingerprint456',
        issuedAt: new Date('2024-01-01T00:00:00.000Z'),
        expiresAt: new Date('2027-01-01T00:00:00.000Z'), // Future date
        status: 'active',
      },
      audits: [
        {
          action: 'aceite_checkbox',
          createdAt: new Date('2024-01-15T10:25:00.000Z'),
        },
        {
          action: 'documento_assinado',
          createdAt: new Date('2024-01-15T10:30:00.000Z'),
        },
      ],
    };

    const mockFounder = {
      id: 100,
      nome: 'Francisco Silva',
      tipo_documento: 'CPF',
      reg_documento: '12345678957',
    };

    it('should return valid=true when all checks pass', async () => {
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(
        mockSignedDocument,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockFounder);
      mockS3Service.download.mockResolvedValue({
        body: Buffer.from('fake pdf content'),
        contentType: 'application/pdf',
        size: 1000,
      });

      const result = await service.verificarDocumento(validDocumentId);

      expect(result.exists).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.validation.hashMatches).toBe(true);
      expect(result.validation.certificatesActive).toBe(true);
      expect(result.validation.signedWithinValidity).toBe(true);
    });

    it('should return exists=false when document not found', async () => {
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(null);

      await expect(service.verificarDocumento('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return hashMatches=false when hash does not match', async () => {
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(
        mockSignedDocument,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockFounder);
      // Return different content to generate different hash
      mockS3Service.download.mockResolvedValue({
        body: Buffer.from('different pdf content'),
        contentType: 'application/pdf',
        size: 1000,
      });

      const result = await service.verificarDocumento(validDocumentId);

      expect(result.valid).toBe(false);
      expect(result.validation.hashMatches).toBe(false);
    });

    it('should return certificatesActive=false when founder cert is expired', async () => {
      const expiredDoc = {
        ...mockSignedDocument,
        signatureFounderCert: {
          ...mockSignedDocument.signatureFounderCert,
          status: 'active',
          expiresAt: new Date('2020-01-01T00:00:00.000Z'), // Expired - in the past
        },
      };
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(expiredDoc);
      mockPrismaService.user.findUnique.mockResolvedValue(mockFounder);
      mockS3Service.download.mockResolvedValue({
        body: Buffer.from('fake pdf content'),
        contentType: 'application/pdf',
        size: 1000,
      });

      const result = await service.verificarDocumento(validDocumentId);

      expect(result.valid).toBe(false);
      expect(result.validation.certificatesActive).toBe(false);
    });

    it('should return certificatesActive=false when startup cert is revoked', async () => {
      const revokedStartupCertDoc = {
        ...mockSignedDocument,
        signatureStartupCert: {
          ...mockSignedDocument.signatureStartupCert,
          status: 'revoked',
        },
      };
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(
        revokedStartupCertDoc,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockFounder);
      mockS3Service.download.mockResolvedValue({
        body: Buffer.from('fake pdf content'),
        contentType: 'application/pdf',
        size: 1000,
      });

      const result = await service.verificarDocumento(validDocumentId);

      expect(result.valid).toBe(false);
      expect(result.validation.certificatesActive).toBe(false);
    });

    it('should mask CPF correctly', async () => {
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(
        mockSignedDocument,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockFounder);
      mockS3Service.download.mockResolvedValue({
        body: Buffer.from('fake pdf content'),
        contentType: 'application/pdf',
        size: 1000,
      });

      const result = await service.verificarDocumento(validDocumentId);

      const founderSignatary = result.signataries.find(
        (s) => s.role === 'founder',
      );
      expect(founderSignatary?.document.type).toBe('CPF');
      expect(founderSignatary?.document.masked).toBe('***.***.***-57');
      expect(founderSignatary?.document.masked).not.toContain('123456789');
    });

    it('should mask CNPJ correctly', async () => {
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(
        mockSignedDocument,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockFounder);
      mockS3Service.download.mockResolvedValue({
        body: Buffer.from('fake pdf content'),
        contentType: 'application/pdf',
        size: 1000,
      });

      const result = await service.verificarDocumento(validDocumentId);

      const startupSignatary = result.signataries.find(
        (s) => s.role === 'startup',
      );
      expect(startupSignatary?.document.type).toBe('CNPJ');
      // CNPJ masked format: **.***.***/****-XX (only last 2 digits visible)
      // For 12345678000190, masked is **.***.***/****-90
      expect(startupSignatary?.document.masked).toBe('**.***.***/****-90');
      expect(startupSignatary?.document.masked).not.toContain('12345678000190');
      expect(startupSignatary?.document.masked).not.toContain('0001');
    });

    it('should format displayName correctly from full name', async () => {
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(
        mockSignedDocument,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockFounder);
      mockS3Service.download.mockResolvedValue({
        body: Buffer.from('fake pdf content'),
        contentType: 'application/pdf',
        size: 1000,
      });

      const result = await service.verificarDocumento(validDocumentId);

      const founderSignatary = result.signataries.find(
        (s) => s.role === 'founder',
      );
      expect(founderSignatary?.displayName).toBe('F. Silva');
    });

    it('should exclude ipAddress and userAgent from audits', async () => {
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(
        mockSignedDocument,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockFounder);
      mockS3Service.download.mockResolvedValue({
        body: Buffer.from('fake pdf content'),
        contentType: 'application/pdf',
        size: 1000,
      });

      const result = await service.verificarDocumento(validDocumentId);

      for (const audit of result.audits) {
        expect(audit).not.toHaveProperty('ipAddress');
        expect(audit).not.toHaveProperty('userAgent');
      }
    });

    it('should handle founder without CPF gracefully', async () => {
      const founderWithoutCpf = {
        ...mockFounder,
        tipo_documento: null,
        reg_documento: null,
      };
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(
        mockSignedDocument,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(founderWithoutCpf);
      mockS3Service.download.mockResolvedValue({
        body: Buffer.from('fake pdf content'),
        contentType: 'application/pdf',
        size: 1000,
      });

      const result = await service.verificarDocumento(validDocumentId);

      const founderSignatary = result.signataries.find(
        (s) => s.role === 'founder',
      );
      expect(founderSignatary?.document.masked).toBe('***.***.***-**');
    });

    it('should handle S3 download error gracefully', async () => {
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(
        mockSignedDocument,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockFounder);
      mockS3Service.download.mockRejectedValue(new Error('S3 error'));

      const result = await service.verificarDocumento(validDocumentId);

      expect(result.valid).toBe(false);
      expect(result.validation.hashMatches).toBe(false);
    });
  });

  describe('getDownloadUrl', () => {
    it('should return presigned URL for valid document', async () => {
      const mockDoc = {
        id: 'doc-123',
        fileKey: 'termo-adesao/1/1705312200000.pdf',
      };
      const expectedUrl = 'https://s3.example.com/bucket/key.pdf?signature=abc';
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(mockDoc);
      mockS3Service.getUrl.mockResolvedValue(expectedUrl);

      const result = await service.getDownloadUrl('doc-123');

      expect(result).toBe(expectedUrl);
      expect(mockS3Service.getUrl).toHaveBeenCalledWith(
        'document',
        mockDoc.fileKey,
        7 * 24 * 60 * 60,
      );
    });

    it('should throw NotFoundException when document not found', async () => {
      mockPrismaService.signedDocument.findUnique.mockResolvedValue(null);

      await expect(service.getDownloadUrl('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
