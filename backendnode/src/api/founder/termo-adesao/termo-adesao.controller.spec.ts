import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TermoAdesaoController } from './termo-adesao.controller';
import { TermoAdesaoService } from './termo-adesao.service';
import { ValidateFundador } from '../../startup/service/validate.fundador';
import { CookiesService } from '../../../auth/cookies/cookies.service';
import { SessionService } from '../../../auth/session/session.service';
import { PayloadEntity } from '../../../common/entities/payload.entity';

// Mock the validateFundador to avoid AuthGuard dependency issues
jest.mock('../../startup/service/validate.fundador');

describe('TermoAdesaoController', () => {
  let controller: TermoAdesaoController;
  let termoAdesaoService: jest.Mocked<TermoAdesaoService>;
  let validateFundador: jest.Mocked<ValidateFundador>;

  const mockUser: PayloadEntity = {
    id: 10,
    publicId: 'user-uuid-123',
    email: 'founder@test.com',
    nome: 'Joao Silva',
    role: 'FOUNDER',
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
    bandeira: null,
    paisCountry: null,
    tipo_documento: 'CPF',
    reg_documento: '52998224725',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: null,
    comprovante: null,
    documento: null,
    biofacial: null,
    wallet: null,
    payments: [],
    subscriptions: [],
    startups: [],
    investments: [],
    tokens: [],
    tokenHistory: [],
    auditLogs: [],
  };

  const mockRequest = {
    user: mockUser,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    get: jest.fn().mockReturnValue('Mozilla/5.0'),
  } as any;

  const mockSignedDocumentResponse = {
    id: 'signed-doc-123',
    documentHash: 'abc123def456',
    signedAt: '2026-07-10T15:30:00.000Z',
    downloadUrl: 'https://s3.example.com/presigned-url',
    founderCert: {
      serialNumber: 'FOUNDER-CERT-001',
      fingerprint: 'a1b2c3d4e5f6...',
    },
    startupCert: {
      serialNumber: 'STARTUP-CERT-001',
      fingerprint: 'b2c3d4e5f6g7...',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TermoAdesaoController],
      providers: [
        {
          provide: TermoAdesaoService,
          useValue: {
            signTermoAdesao: jest.fn(),
            getTermoAdesao: jest.fn(),
          },
        },
        {
          provide: ValidateFundador,
          useValue: {
            validateOrThrow: jest.fn(),
          },
        },
        { provide: CookiesService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: Reflector, useValue: {} },
      ],
    }).compile();

    controller = module.get<TermoAdesaoController>(TermoAdesaoController);
    termoAdesaoService = module.get(TermoAdesaoService);
    validateFundador = module.get(ValidateFundador);
  });

  describe('signTermoAdesao', () => {
    it('should sign the Termo de Adesao successfully', async () => {
      (validateFundador.validateOrThrow as jest.Mock).mockResolvedValue(
        undefined,
      );
      (termoAdesaoService.signTermoAdesao as jest.Mock).mockResolvedValue(
        mockSignedDocumentResponse,
      );

      const result = await controller.signTermoAdesao(
        '1',
        { aceite: true },
        mockRequest,
      );

      expect(validateFundador.validateOrThrow).toHaveBeenCalledWith(mockUser);
      expect(termoAdesaoService.signTermoAdesao).toHaveBeenCalledWith(
        1,
        10,
        { aceite: true },
        '127.0.0.1',
        'Mozilla/5.0',
      );
      expect(result).toEqual(mockSignedDocumentResponse);
    });

    it('should throw error for invalid startup ID', async () => {
      (validateFundador.validateOrThrow as jest.Mock).mockResolvedValue(
        undefined,
      );

      await expect(
        controller.signTermoAdesao('invalid', { aceite: true }, mockRequest),
      ).rejects.toThrow('ID da startup invalido');
    });

    it('should reject aceite: false with BadRequestException', async () => {
      (validateFundador.validateOrThrow as jest.Mock).mockResolvedValue(
        undefined,
      );
      (termoAdesaoService.signTermoAdesao as jest.Mock).mockRejectedValue(
        new BadRequestException(
          'Nao e possivel revogar aceite apos assinatura. Use o fluxo formal de revogacao.',
        ),
      );

      await expect(
        controller.signTermoAdesao('1', { aceite: false }, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTermoAdesao', () => {
    it('should return Termo de Adesao metadata successfully', async () => {
      (validateFundador.validateOrThrow as jest.Mock).mockResolvedValue(
        undefined,
      );
      (termoAdesaoService.getTermoAdesao as jest.Mock).mockResolvedValue({
        exists: true,
        document: {
          id: 'signed-doc-123',
          documentHash: 'abc123def456',
          signedAt: '2026-07-10T15:30:00.000Z',
          founderCert: {
            serialNumber: 'FOUNDER-CERT-001',
            fingerprint: 'a1b2c3...',
          },
          startupCert: {
            serialNumber: 'STARTUP-CERT-001',
            fingerprint: 'b2c3d4...',
          },
        },
        downloadUrl: 'https://s3.example.com/presigned-url',
        readUrl: 'https://s3.example.com/presigned-url',
      });

      const result = await controller.getTermoAdesao('1', mockRequest);

      expect(validateFundador.validateOrThrow).toHaveBeenCalledWith(mockUser);
      expect(termoAdesaoService.getTermoAdesao).toHaveBeenCalledWith(1, 10);
      expect(result.exists).toBe(true);
      expect(result.document).not.toBeNull();
    });

    it('should return exists: false when no document exists', async () => {
      (validateFundador.validateOrThrow as jest.Mock).mockResolvedValue(
        undefined,
      );
      (termoAdesaoService.getTermoAdesao as jest.Mock).mockResolvedValue({
        exists: false,
        document: null,
        downloadUrl: null,
        readUrl: null,
      });

      const result = await controller.getTermoAdesao('1', mockRequest);

      expect(result.exists).toBe(false);
      expect(result.document).toBeNull();
    });

    it('should throw error for invalid startup ID', async () => {
      (validateFundador.validateOrThrow as jest.Mock).mockResolvedValue(
        undefined,
      );

      await expect(
        controller.getTermoAdesao('invalid', mockRequest),
      ).rejects.toThrow('ID da startup invalido');
    });
  });
});
