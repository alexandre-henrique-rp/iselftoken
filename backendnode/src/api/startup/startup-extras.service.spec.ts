import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../s3/s3.service';
import { StartupExtrasService } from './service/startup-extras.service';

describe('StartupExtrasService — updateBanking() com documentoTitular', () => {
  let service: StartupExtrasService;
  let prismaService: any;

  const mockStartup = {
    id: 1,
    founderId: 100,
    nome: 'Startup Teste',
    titular: null,
    documento_titular: null,
    banco: null,
    tipo_conta: null,
    agencia: null,
    conta: null,
    digito: null,
    pix_key: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      startup: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockS3 = {
      upload: jest.fn(),
      getUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupExtrasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = module.get<StartupExtrasService>(StartupExtrasService);
    prismaService = module.get(PrismaService);

    // Setup default mock: user owns the startup
    prismaService.startup.findUnique.mockResolvedValue(mockStartup);
    prismaService.startup.update.mockImplementation(
      async ({ where, data }) => ({
        ...mockStartup,
        ...data,
      }),
    );
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('documentoTitular — validação de CPF/CNPJ', () => {
    it('aceita CPF 11 dígitos válido (123.456.789-09 formatado)', async () => {
      prismaService.startup.update.mockResolvedValue({
        ...mockStartup,
        documento_titular: '12345678909',
      });

      const result = await service.updateBanking(1, 100, {
        documentoTitular: '123.456.789-09',
      });

      expect(result.error).toBe(false);
      expect(prismaService.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documento_titular: '12345678909',
          }),
        }),
      );
    });

    it('aceita CPF 11 dígitos válido (sem máscara)', async () => {
      prismaService.startup.update.mockResolvedValue({
        ...mockStartup,
        documento_titular: '12345678909',
      });

      const result = await service.updateBanking(1, 100, {
        documentoTitular: '12345678909',
      });

      expect(result.error).toBe(false);
      expect(prismaService.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documento_titular: '12345678909',
          }),
        }),
      );
    });

    it('aceita CNPJ numérico 14 dígitos válido legado', async () => {
      // CNPJ "12.345.678/0001-95" → "12345678000195"
      prismaService.startup.update.mockResolvedValue({
        ...mockStartup,
        documento_titular: '12345678000195',
      });

      const result = await service.updateBanking(1, 100, {
        documentoTitular: '12.345.678/0001-95',
      });

      expect(result.error).toBe(false);
      expect(prismaService.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documento_titular: '12345678000195',
          }),
        }),
      );
    });

    it('aceita CNPJ alfanumérico válido (manual RFB IN 2.229/2024)', async () => {
      // "12.ABC.345/01DE-35" → "12ABC34501DE35"
      prismaService.startup.update.mockResolvedValue({
        ...mockStartup,
        documento_titular: '12ABC34501DE35',
      });

      const result = await service.updateBanking(1, 100, {
        documentoTitular: '12.ABC.345/01DE-35',
      });

      expect(result.error).toBe(false);
      expect(prismaService.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documento_titular: '12ABC34501DE35',
          }),
        }),
      );
    });

    it('normaliza mixed-case + remove máscara', async () => {
      // "12.abc.345/01de-35" → "12ABC34501DE35"
      prismaService.startup.update.mockResolvedValue({
        ...mockStartup,
        documento_titular: '12ABC34501DE35',
      });

      const result = await service.updateBanking(1, 100, {
        documentoTitular: '12.abc.345/01de-35',
      });

      expect(result.error).toBe(false);
      expect(prismaService.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documento_titular: '12ABC34501DE35',
          }),
        }),
      );
    });

    it('rejeita length 12 (documento alfanumérico incompleto)', async () => {
      // 12 chars é inválido (nem CPF 11 nem CNPJ 14)
      await expect(
        service.updateBanking(1, 100, { documentoTitular: '12ABC34501DE' }),
      ).rejects.toThrow(HttpException);

      await expect(
        service.updateBanking(1, 100, { documentoTitular: '12ABC34501DE' }),
      ).rejects.toThrow(
        'CPF/CNPJ do titular deve ter 11 (CPF) ou 14 (CNPJ) caracteres',
      );
    });

    it('rejeita length 13 (documento incompleto)', async () => {
      // 13 chars também é inválido
      await expect(
        service.updateBanking(1, 100, { documentoTitular: '12ABC34501DE3' }),
      ).rejects.toThrow(HttpException);

      await expect(
        service.updateBanking(1, 100, { documentoTitular: '12ABC34501DE3' }),
      ).rejects.toThrow(
        'CPF/CNPJ do titular deve ter 11 (CPF) ou 14 (CNPJ) caracteres',
      );
    });

    it('rejeita CNPJ alfanumérico com DV errado', async () => {
      // "12.ABC.345/01DE-99" → DV errado
      await expect(
        service.updateBanking(1, 100, {
          documentoTitular: '12.ABC.345/01DE-99',
        }),
      ).rejects.toThrow(HttpException);

      await expect(
        service.updateBanking(1, 100, {
          documentoTitular: '12.ABC.345/01DE-99',
        }),
      ).rejects.toThrow('CNPJ do titular inválido');
    });

    it('rejeita CNPJ numérico com DV errado', async () => {
      // "12.345.678/0001-94" → DV errado
      await expect(
        service.updateBanking(1, 100, {
          documentoTitular: '12.345.678/0001-94',
        }),
      ).rejects.toThrow(HttpException);

      await expect(
        service.updateBanking(1, 100, {
          documentoTitular: '12.345.678/0001-94',
        }),
      ).rejects.toThrow('CNPJ do titular inválido');
    });

    it('rejeita documento vazio (string vazia) — não lança erro, apenas não define', async () => {
      // String vazia resulta em docLimpo.length === 0 → vai para undefined
      prismaService.startup.update.mockResolvedValue({
        ...mockStartup,
        documento_titular: undefined,
      });

      const result = await service.updateBanking(1, 100, {
        documentoTitular: '',
      });

      expect(result.error).toBe(false);
      expect(prismaService.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documento_titular: undefined,
          }),
        }),
      );
    });

    it('define documento_titular como null quando input é null explicitamente', async () => {
      prismaService.startup.update.mockResolvedValue({
        ...mockStartup,
        documento_titular: null,
      });

      const result = await service.updateBanking(1, 100, {
        documentoTitular: null,
      });

      expect(result.error).toBe(false);
      // When null, the service explicitly sets it to null (not undefined)
      expect(prismaService.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documento_titular: null,
          }),
        }),
      );
    });
  });

  describe('assertOwnership', () => {
    it('rejeita quando usuário não é o founder', async () => {
      // Override the default mock for this specific test
      prismaService.startup.findUnique.mockResolvedValue({
        ...mockStartup,
        founderId: 999, // Different user
      });

      await expect(service.updateBanking(1, 100, {})).rejects.toThrow(
        HttpException,
      );

      await expect(service.updateBanking(1, 100, {})).rejects.toThrow(
        'permissão para editar',
      );
    });

    it('rejeita quando startup não existe', async () => {
      prismaService.startup.findUnique.mockResolvedValue(null);

      await expect(service.updateBanking(1, 100, {})).rejects.toThrow(
        HttpException,
      );

      await expect(service.updateBanking(1, 100, {})).rejects.toThrow(
        'não encontrada',
      );
    });
  });

  describe('tipoConta validation', () => {
    it('aceita tipoConta "corrente"', async () => {
      prismaService.startup.update.mockResolvedValue({
        ...mockStartup,
        tipo_conta: 'corrente',
      });

      const result = await service.updateBanking(1, 100, {
        tipoConta: 'corrente',
        documentoTitular: null,
      });

      expect(result.error).toBe(false);
    });

    it('aceita tipoConta "poupanca"', async () => {
      prismaService.startup.update.mockResolvedValue({
        ...mockStartup,
        tipo_conta: 'poupanca',
      });

      const result = await service.updateBanking(1, 100, {
        tipoConta: 'poupanca',
        documentoTitular: null,
      });

      expect(result.error).toBe(false);
    });

    it('rejeita tipoConta inválido', async () => {
      await expect(
        service.updateBanking(1, 100, { tipoConta: 'investimento' as any }),
      ).rejects.toThrow(HttpException);

      await expect(
        service.updateBanking(1, 100, { tipoConta: 'investimento' as any }),
      ).rejects.toThrow('tipoConta deve ser');
    });
  });
});

describe('StartupExtrasService — createProrrogacaoCheckout', () => {
  let service: StartupExtrasService;
  let prisma: any;

  const startup = { id: 1, founderId: 100 };
  const campaign = { id: 9, targetAmount: 500000, tokenPrice: 40 };

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn().mockResolvedValue(startup) },
      campaign: { findFirst: jest.fn().mockResolvedValue(campaign) },
      campaignExtension: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
      payment: { create: jest.fn().mockResolvedValue({ id: 555 }) },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StartupExtrasService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: S3Service,
          useValue: { upload: jest.fn(), getUrl: jest.fn() },
        },
      ],
    }).compile();
    service = moduleRef.get(StartupExtrasService);
  });

  it('cria Payment TOKEN_RESERVATION_EXTENSION + CampaignExtension', async () => {
    const r: any = await service.createProrrogacaoCheckout(1, 100, 200000, 30);
    expect(r.error).toBe(false);
    expect(r.data.paymentId).toBe(555);
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purpose: 'TOKEN_RESERVATION_EXTENSION',
          status: 'PENDING',
          amount: 200000,
          campaignId: 9,
        }),
      }),
    );
    // Reserva = 200000 / 40 = 5000 tokens; nova meta = 700000.
    expect(prisma.campaignExtension.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenReserve: 5000,
          totalAmountShown: 700000,
          status: 'PENDING_RESERVATION_PAYMENT',
          paymentId: 555,
        }),
      }),
    );
  });

  it('idempotente: reaproveita extensão PENDENTE existente', async () => {
    prisma.campaignExtension.findFirst.mockResolvedValueOnce({
      id: 7,
      paymentId: 999,
    });
    const r: any = await service.createProrrogacaoCheckout(1, 100, 200000);
    expect(r.data.reused).toBe(true);
    expect(r.data.paymentId).toBe(999);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejeita valor adicional <= 0', async () => {
    await expect(service.createProrrogacaoCheckout(1, 100, 0)).rejects.toThrow(
      HttpException,
    );
  });

  it('rejeita quando não há campanha FUNDED', async () => {
    prisma.campaign.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.createProrrogacaoCheckout(1, 100, 200000),
    ).rejects.toThrow('Nenhuma campanha finalizada');
  });

  it('rejeita quando o adicional não cobre 1 token', async () => {
    // tokenPrice 40, adicional 10 → floor(10/40)=0.
    await expect(service.createProrrogacaoCheckout(1, 100, 10)).rejects.toThrow(
      'insuficiente',
    );
  });
});

describe('StartupExtrasService — getCaptacaoData (S35: banner rejeição Etapa 3)', () => {
  let service: StartupExtrasService;
  let prisma: any;

  const mockCampaign = {
    id: 9,
    startupId: 1,
    title: 'Rodada Seed',
    status: 'DRAFT',
    targetAmount: 500000,
    minInvestment: 100,
    valuation: 5000000,
    tokenPrice: 40,
    totalTokens: 12500,
    tokensSold: 0,
    deadline: new Date('2026-12-31'),
    reservationFeePaid: false,
    affiliateCommissionPct: 5,
    payments: [],
    resources: [],
    problema: 'X',
    solucao: 'Y',
    modeloReceita: 'Z',
    diferencial: 'W',
    mercadoAlvo: 'V',
    sociosCount: 2,
    dedicacao: 'full-time',
    compradores: 'PMEs',
    investimentoPrevio: null,
    concorrencia: 'Nenhuma',
    participacaoLucros: true,
    faturamentoMinimoLucros: null,
    politicaLucros: null,
    beneficiosAdicionais: false,
    beneficiosDescricao: null,
    oQueEsperaAlcancar: 'Atingir R$ 1M ARR',
    objetivoCaptacao: 'Expandir',
  };

  beforeEach(() => {
    prisma = {
      startup: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          founderId: 100,
        }),
      },
      campaign: {
        findFirst: jest.fn().mockResolvedValue(mockCampaign),
      },
      startupReviewDecision: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
  });

  async function buildService() {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StartupExtrasService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: S3Service,
          useValue: { upload: jest.fn(), getUrl: jest.fn() },
        },
      ],
    }).compile();
    return moduleRef.get<StartupExtrasService>(StartupExtrasService);
  }

  it('expõe phase3Rejected=true + justification + at quando a última decisão da fase 3 é REJECTED', async () => {
    const rejectedAt = new Date('2026-09-15T14:30:00.000Z');
    prisma.startupReviewDecision.findFirst.mockResolvedValueOnce({
      decision: 'REJECTED',
      justification: 'Falta clareza na tese de receitas projetadas.',
      createdAt: rejectedAt,
    });

    const svc = await buildService();
    const r: any = await svc.getCaptacaoData(1, 100);
    expect(r.error).toBe(false);
    expect(r.data.campaign.phase3Rejected).toBe(true);
    expect(r.data.campaign.phase3RejectedJustification).toBe(
      'Falta clareza na tese de receitas projetadas.',
    );
    expect(r.data.campaign.phase3RejectedAt).toBe(rejectedAt.toISOString());

    // Confirma que filtra por phase=3 na query (defesa contra
    // falsos positivos caso o admin rejeite a fase 1 depois).
    expect(prisma.startupReviewDecision.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ startupId: 1, phase: 3 }),
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('expõe phase3Rejected=false quando a startup nunca foi rejeitada na fase 3', async () => {
    prisma.startupReviewDecision.findFirst.mockResolvedValueOnce(null);

    const svc = await buildService();
    const r: any = await svc.getCaptacaoData(1, 100);
    expect(r.error).toBe(false);
    expect(r.data.campaign.phase3Rejected).toBe(false);
    expect(r.data.campaign.phase3RejectedJustification).toBeNull();
    expect(r.data.campaign.phase3RejectedAt).toBeNull();
  });

  it('expõe phase3Rejected=false quando a última decisão da fase 3 é APPROVED', async () => {
    prisma.startupReviewDecision.findFirst.mockResolvedValueOnce({
      decision: 'APPROVED',
      justification: null,
      createdAt: new Date('2026-09-10T10:00:00.000Z'),
    });

    const svc = await buildService();
    const r: any = await svc.getCaptacaoData(1, 100);
    expect(r.error).toBe(false);
    expect(r.data.campaign.phase3Rejected).toBe(false);
    expect(r.data.campaign.phase3RejectedJustification).toBeNull();
    expect(r.data.campaign.phase3RejectedAt).toBeNull();
  });

  it('best-effort: se a query de decisões falhar, retorna phase3Rejected=false (banner não aparece, página não quebra)', async () => {
    prisma.startupReviewDecision.findFirst.mockRejectedValueOnce(
      new Error('DB timeout'),
    );

    const svc = await buildService();
    const r: any = await svc.getCaptacaoData(1, 100);
    expect(r.error).toBe(false);
    expect(r.data.campaign.phase3Rejected).toBe(false);
    expect(r.data.campaign.phase3RejectedJustification).toBeNull();
  });
});
