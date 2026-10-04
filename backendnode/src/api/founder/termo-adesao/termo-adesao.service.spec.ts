import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TermoAdesaoService } from './termo-adesao.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CertificateService } from '../../../common/pki/certificate.service';
import { PdfTemplateBuilderService } from '../../../template/pdf-template-builder.service';
import { SignatureService } from '../../../signature/signature.service';
import { S3Service } from '../../../s3/s3.service';

// Mock all external services
jest.mock('../../../prisma/prisma.service');
jest.mock('../../../common/pki/certificate.service');
jest.mock('../../../template/pdf-template-builder.service');
jest.mock('../../../signature/signature.service');
jest.mock('../../../s3/s3.service');

describe('TermoAdesaoService', () => {
  let service: TermoAdesaoService;
  let prismaService: jest.Mocked<PrismaService>;
  let certificateService: jest.Mocked<CertificateService>;
  let pdfTemplateBuilder: jest.Mocked<PdfTemplateBuilderService>;
  let signatureService: jest.Mocked<SignatureService>;
  let s3Service: jest.Mocked<S3Service>;

  const mockStartup = {
    id: 1,
    founderId: 10,
    nome: 'Tech Startup',
    cnpj: '12345678000195',
    email: 'contato@techstartup.com.br',
    slug: 'tech-startup',
    razao_social: 'Tech Startup Ltda',
    site: null,
    telefone: null,
    pais: null,
    redes_sociais: null,
    area_atuacao: null,
    category: null,
    estagio: null,
    descricao: null,
    problema: null,
    solucao: null,
    modelo_receita: null,
    descritivo_basico: null,
    youtube_url: null,
    socios: null,
    teams: null,
    uso_recursos: null,
    banco: null,
    agencia: null,
    conta: null,
    digito: null,
    tipo_conta: null,
    pix_key: null,
    titular: null,
    documento_titular: null,
    data_fundacao: null,
    logo_id: null,
    cover_id: null,
    mie_id: null,
    contrato_social_id: null,
    cnpj_id: null,
    balanco_atual_id: null,
    declaracao_veracidade_id: null,
    ata_eleicao_id: null,
    balanco_anterior_id: null,
    procuracao_id: null,
    cv_socios_id: null,
    pitch_deck_id: null,
    projecoes_id: null,
    modelo_contrato_oferta_id: null,
    comprovante_endereco_id: null,
    declaracao_receita_id: null,
    status: 'APPROVED',
    verificationStatus: 'NOT_REQUESTED',
    score: 0,
    isExited: false,
    exitValuation: null,
    exitDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    founder: {
      id: 10,
      publicId: 'user-uuid-123',
      email: 'founder@techstartup.com.br',
      nome: 'Joao Silva',
      role: 'FOUNDER',
      senha: 'hashed',
      telefone: null,
      data_nascimento: null,
      genero: null,
      endereco: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      uf: null,
      cep: null,
      pais: null,
      termosAceitos: true,
      politicaAceita: true,
      tipo_documento: 'CPF',
      reg_documento: '52998224725',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      avatar_id: null,
      comprovante_id: null,
      documento_id: null,
      biofacial_id: null,
    },
  };

  const mockFounderCert = {
    id: 'cert-founder-123',
    issuerCaId: 'ca-intermediate-123',
    ownerType: 'founder',
    ownerId: '10',
    serialNumber: 'FOUNDER-CERT-001',
    certificatePem:
      '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
    privateKeyRef: 'iselftoken/pki/certs/FOUNDER-CERT-001/private',
    publicKeyFingerprint: 'a1b2c3d4e5f6g7h8i9j0...',
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status: 'active',
    revokedAt: null,
    revocationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStartupCert = {
    id: 'cert-startup-123',
    issuerCaId: 'ca-intermediate-123',
    ownerType: 'startup',
    ownerId: '1',
    serialNumber: 'STARTUP-CERT-001',
    certificatePem:
      '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
    privateKeyRef: 'iselftoken/pki/certs/STARTUP-CERT-001/private',
    publicKeyFingerprint: 'b2c3d4e5f6g7h8i9j0k1...',
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status: 'active',
    revokedAt: null,
    revocationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSignedDocument = {
    id: 'signed-doc-123',
    startupId: 1,
    founderId: 10,
    type: 'termo_adesao',
    templateVersion: '1.0.0',
    fileKey: 'termo-adesao/1/1234567890.pdf',
    documentHash: 'abc123def456...',
    signatureFounderCertId: 'cert-founder-123',
    signatureFounderAt: new Date(),
    signatureStartupCertId: 'cert-startup-123',
    signatureStartupAt: new Date(),
    createdAt: new Date(),
    signatureFounderCert: mockFounderCert,
    signatureStartupCert: mockStartupCert,
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermoAdesaoService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            startup: { findUnique: jest.fn() },
            signedDocument: { findUnique: jest.fn(), create: jest.fn() },
            signatureAuditLog: { createMany: jest.fn() },
            digitalCertificate: { findUnique: jest.fn() },
          },
        },
        { provide: CertificateService, useValue: { issue: jest.fn() } },
        {
          provide: PdfTemplateBuilderService,
          useValue: { generateTermoPdf: jest.fn() },
        },
        { provide: SignatureService, useValue: { signPdf: jest.fn() } },
        {
          provide: S3Service,
          useValue: { upload: jest.fn(), getUrl: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TermoAdesaoService>(TermoAdesaoService);
    prismaService = module.get(PrismaService);
    certificateService = module.get(CertificateService);
    pdfTemplateBuilder = module.get(PdfTemplateBuilderService);
    signatureService = module.get(SignatureService);
    s3Service = module.get(S3Service);
  });

  describe('signTermoAdesao', () => {
    it('should reject when aceite is false', async () => {
      await expect(
        service.signTermoAdesao(1, 10, { aceite: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when startup does not exist', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          const tx = {
            startup: { findUnique: jest.fn().mockResolvedValue(null) },
          };
          return callback(tx);
        },
      );

      await expect(
        service.signTermoAdesao(999, 10, { aceite: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is not the founder', async () => {
      const otherFounderStartup = { ...mockStartup, founderId: 999 };
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          const tx = {
            startup: {
              findUnique: jest.fn().mockResolvedValue(otherFounderStartup),
            },
          };
          return callback(tx);
        },
      );

      await expect(
        service.signTermoAdesao(1, 10, { aceite: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return existing document when already signed (idempotency)', async () => {
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          const tx = {
            startup: { findUnique: jest.fn().mockResolvedValue(mockStartup) },
          };
          return callback(tx);
        },
      );

      (prismaService.signedDocument.findUnique as jest.Mock).mockResolvedValue(
        mockSignedDocument,
      );
      (s3Service.getUrl as jest.Mock).mockResolvedValue(
        'https://s3.example.com/presigned-url',
      );

      const result = await service.signTermoAdesao(1, 10, { aceite: true });

      expect(result.id).toBe(mockSignedDocument.id);
      expect(result.documentHash).toBe(mockSignedDocument.documentHash);
      expect(certificateService.issue).not.toHaveBeenCalled();
    });

    it('should create new signed document when none exists', async () => {
      const pdfBuffer = Buffer.from('PDF content');
      const signedBuffer = Buffer.from('Signed PDF content');

      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          const tx = {
            startup: { findUnique: jest.fn().mockResolvedValue(mockStartup) },
          };
          return callback(tx);
        },
      );

      (prismaService.signedDocument.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (certificateService.issue as jest.Mock)
        .mockResolvedValueOnce({
          certificate: mockFounderCert,
          wasCreated: true,
        })
        .mockResolvedValueOnce({
          certificate: mockStartupCert,
          wasCreated: true,
        });

      (pdfTemplateBuilder.generateTermoPdf as jest.Mock).mockResolvedValue({
        buffer: pdfBuffer,
        hash: 'pdf-hash-123',
        pageCount: 1,
      });

      (signatureService.signPdf as jest.Mock)
        .mockResolvedValueOnce({
          signedBuffer: Buffer.from('founder-signed'),
          hash: 'founder-hash',
          signatureInfo: {
            reason: 'test',
            location: 'test',
            signerName: 'test',
            signedAt: new Date(),
          },
        })
        .mockResolvedValueOnce({
          signedBuffer,
          hash: 'final-hash',
          signatureInfo: {
            reason: 'test',
            location: 'test',
            signerName: 'test',
            signedAt: new Date(),
          },
        });

      (prismaService.digitalCertificate.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFounderCert)
        .mockResolvedValueOnce(mockStartupCert);

      (s3Service.upload as jest.Mock).mockResolvedValue({
        url: 'https://s3.example.com/termo-adesao/1/1234567890.pdf',
        key: 'termo-adesao/1/1234567890.pdf',
        bucket: 'document',
        size: signedBuffer.length,
      });

      (prismaService.signedDocument.create as jest.Mock).mockResolvedValue(
        mockSignedDocument,
      );
      (
        prismaService.signatureAuditLog.createMany as jest.Mock
      ).mockResolvedValue({ count: 4 });
      (s3Service.getUrl as jest.Mock).mockResolvedValue(
        'https://s3.example.com/presigned-url',
      );

      const result = await service.signTermoAdesao(1, 10, {
        aceite: true,
        reason: 'Test reason',
      });

      expect(result.id).toBe(mockSignedDocument.id);
      expect(certificateService.issue).toHaveBeenCalledTimes(2);
      expect(pdfTemplateBuilder.generateTermoPdf).toHaveBeenCalledTimes(1);
      expect(signatureService.signPdf).toHaveBeenCalledTimes(2);
      expect(s3Service.upload).toHaveBeenCalledTimes(1);
      expect(prismaService.signedDocument.create).toHaveBeenCalledTimes(1);
      expect(prismaService.signatureAuditLog.createMany).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('getTermoAdesao', () => {
    it('should throw NotFoundException when startup does not exist', async () => {
      (prismaService.startup.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getTermoAdesao(999, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user is not the founder', async () => {
      const otherFounderStartup = { ...mockStartup, founderId: 999 };
      (prismaService.startup.findUnique as jest.Mock).mockResolvedValue(
        otherFounderStartup,
      );

      await expect(service.getTermoAdesao(1, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return exists: false when no document exists', async () => {
      (prismaService.startup.findUnique as jest.Mock).mockResolvedValue(
        mockStartup,
      );
      (prismaService.signedDocument.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.getTermoAdesao(1, 10);

      expect(result.exists).toBe(false);
      expect(result.document).toBeNull();
      expect(result.downloadUrl).toBeNull();
    });

    it('should return document metadata when signed document exists', async () => {
      (prismaService.startup.findUnique as jest.Mock).mockResolvedValue(
        mockStartup,
      );
      (prismaService.signedDocument.findUnique as jest.Mock).mockResolvedValue(
        mockSignedDocument,
      );
      (s3Service.getUrl as jest.Mock).mockResolvedValue(
        'https://s3.example.com/presigned-url',
      );

      const result = await service.getTermoAdesao(1, 10);

      expect(result.exists).toBe(true);
      expect(result.document).not.toBeNull();
      expect(result.document?.id).toBe(mockSignedDocument.id);
      expect(result.downloadUrl).toBe('https://s3.example.com/presigned-url');
      expect(result.readUrl).toBe('https://s3.example.com/presigned-url');
    });
  });
});
