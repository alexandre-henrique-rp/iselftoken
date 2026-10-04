import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { VerificarController } from './verificar.controller';
import { VerificarService } from './verificar.service';

describe('VerificarController', () => {
  let controller: VerificarController;
  let service: VerificarService;

  const mockVerificarService = {
    verificarDocumento: jest.fn(),
    getDownloadUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
        }),
      ],
      controllers: [VerificarController],
      providers: [
        {
          provide: VerificarService,
          useValue: mockVerificarService,
        },
      ],
    }).compile();

    controller = module.get<VerificarController>(VerificarController);
    service = module.get<VerificarService>(VerificarService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verificarDocumento', () => {
    const mockValidResponse = {
      exists: true as const,
      valid: true,
      validation: {
        hashMatches: true,
        certificatesActive: true,
        signedWithinValidity: true,
      },
      document: {
        type: 'termo_adesao',
        signedAt: '2024-01-15T10:30:00.000Z',
        templateVersion: '1.0.0',
      },
      signataries: [
        {
          role: 'founder' as const,
          displayName: 'F. Silva',
          document: { type: 'CPF' as const, masked: '***.***.***-57' },
          certificate: {
            serialNumber: 'ABC123',
            fingerprint: 'xyz789',
            issuedAt: '2024-01-15T00:00:00.000Z',
            expiresAt: '2025-01-15T00:00:00.000Z',
            status: 'active' as const,
          },
        },
        {
          role: 'startup' as const,
          displayName: 'Startup XYZ LTDA',
          document: { type: 'CNPJ' as const, masked: '12.345.***/****-00' },
          certificate: {
            serialNumber: 'DEF456',
            fingerprint: 'abc123',
            issuedAt: '2024-01-15T00:00:00.000Z',
            expiresAt: '2025-01-15T00:00:00.000Z',
            status: 'active' as const,
          },
        },
      ],
      audits: [
        { action: 'aceite_checkbox', createdAt: '2024-01-15T10:30:00.000Z' },
        { action: 'documento_assinado', createdAt: '2024-01-15T10:30:05.000Z' },
      ],
    };

    it('should return valid=true when document is valid with active certificates', async () => {
      mockVerificarService.verificarDocumento.mockResolvedValue(
        mockValidResponse,
      );

      const result = await controller.verificarDocumento('doc-123');

      expect(result).toEqual(mockValidResponse);
      expect(result.exists).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.validation.hashMatches).toBe(true);
      expect(result.validation.certificatesActive).toBe(true);
      expect(result.validation.signedWithinValidity).toBe(true);
    });

    it('should return valid=false when hash does not match', async () => {
      const hashMismatchResponse = {
        ...mockValidResponse,
        valid: false,
        validation: {
          hashMatches: false,
          certificatesActive: true,
          signedWithinValidity: true,
        },
      };
      mockVerificarService.verificarDocumento.mockResolvedValue(
        hashMismatchResponse,
      );

      const result = await controller.verificarDocumento('doc-123');

      expect(result.valid).toBe(false);
      expect(result.validation.hashMatches).toBe(false);
      expect(result.validation.certificatesActive).toBe(true);
    });

    it('should return valid=false when certificate is expired', async () => {
      const expiredCertResponse = {
        ...mockValidResponse,
        valid: false,
        validation: {
          hashMatches: true,
          certificatesActive: false,
          signedWithinValidity: false,
        },
      };
      mockVerificarService.verificarDocumento.mockResolvedValue(
        expiredCertResponse,
      );

      const result = await controller.verificarDocumento('doc-123');

      expect(result.valid).toBe(false);
      expect(result.validation.certificatesActive).toBe(false);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      mockVerificarService.verificarDocumento.mockRejectedValue(
        new NotFoundException({
          exists: false,
          message: 'Documento nao encontrado',
        }),
      );

      await expect(
        controller.verificarDocumento('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mask sensitive data in response - CPF', async () => {
      mockVerificarService.verificarDocumento.mockResolvedValue(
        mockValidResponse,
      );

      const result = await controller.verificarDocumento('doc-123');

      const founderSignatary = result.signataries.find(
        (s) => s.role === 'founder',
      );
      expect(founderSignatary?.document.masked).toBe('***.***.***-57');
      expect(founderSignatary?.document.masked).not.toContain('12345678900');
    });

    it('should mask sensitive data in response - CNPJ', async () => {
      mockVerificarService.verificarDocumento.mockResolvedValue(
        mockValidResponse,
      );

      const result = await controller.verificarDocumento('doc-123');

      const startupSignatary = result.signataries.find(
        (s) => s.role === 'startup',
      );
      expect(startupSignatary?.document.masked).toBe('12.345.***/****-00');
      expect(startupSignatary?.document.masked).not.toContain('12345678000190');
    });

    it('should not expose IP addresses or user-agents in audits', async () => {
      mockVerificarService.verificarDocumento.mockResolvedValue(
        mockValidResponse,
      );

      const result = await controller.verificarDocumento('doc-123');

      // Audits should only contain action and createdAt
      for (const audit of result.audits) {
        expect(audit).not.toHaveProperty('ipAddress');
        expect(audit).not.toHaveProperty('userAgent');
      }
    });

    it('should format displayName correctly for founder', async () => {
      mockVerificarService.verificarDocumento.mockResolvedValue(
        mockValidResponse,
      );

      const result = await controller.verificarDocumento('doc-123');

      const founderSignatary = result.signataries.find(
        (s) => s.role === 'founder',
      );
      expect(founderSignatary?.displayName).toBe('F. Silva');
    });
  });

  describe('downloadDocumento', () => {
    it('should redirect to presigned URL', async () => {
      const mockRedirectUrl =
        'https://s3.example.com/bucket/doc-123.pdf?signature=abc';
      mockVerificarService.getDownloadUrl.mockResolvedValue(mockRedirectUrl);

      const mockRes = {
        redirect: jest.fn().mockReturnThis(),
      } as any;

      await controller.downloadDocumento('doc-123', mockRes);

      expect(mockVerificarService.getDownloadUrl).toHaveBeenCalledWith(
        'doc-123',
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(302, mockRedirectUrl);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      mockVerificarService.getDownloadUrl.mockRejectedValue(
        new NotFoundException({
          exists: false,
          message: 'Documento nao encontrado',
        }),
      );

      const mockRes = {
        redirect: jest.fn(),
      } as any;

      await expect(
        controller.downloadDocumento('nonexistent', mockRes),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
