import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenReservationService } from 'src/api/tokens/token-reservation.service';
import { TokensService } from 'src/api/tokens/tokens.service';
import { AuditService } from 'src/common/audit/audit.service';
import { AffiliateCommissionService } from 'src/api/affiliate/affiliate-commission.service';
import { ConfigService } from 'src/api/config/config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvestmentsService } from './investments.service';

describe('InvestmentsService', () => {
  let service: InvestmentsService;

  const mockCampaign = {
    id: 1,
    title: 'Startup Teste',
    status: 'OPEN',
    minInvestment: 100,
    tokenPrice: 10,
    totalTokens: 50000,
    tokensSold: 10000,
    startupId: 1,
    startup: { nome: 'Startup LTDA', status: 'APPROVED' },
  };

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    subscription: { findFirst: jest.fn() },
    campaign: { findUnique: jest.fn(), update: jest.fn() },
    investment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payment: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    token: { deleteMany: jest.fn() },
    affiliateCommission: { findUnique: jest.fn() },
    // Executa a callback com um `tx` que reusa os mesmos mocks. O relê de
    // status dentro da transação (tx.investment.findUnique) retorna PENDING
    // por padrão para permitir a aplicação do efeito nos testes de sucesso.
    $transaction: jest.fn(async (cb: any) =>
      cb({
        user: { findUnique: mockPrismaService.user.findUnique },
        subscription: { findFirst: mockPrismaService.subscription.findFirst },
        campaign: {
          findUnique: mockPrismaService.campaign.findUnique,
          update: mockPrismaService.campaign.update,
        },
        investment: {
          create: mockPrismaService.investment.create,
          findUnique: jest.fn().mockResolvedValue({ status: 'PENDING' }),
          update: mockPrismaService.investment.update,
        },
        payment: {
          create: mockPrismaService.payment.create,
          update: mockPrismaService.payment.update,
          updateMany: mockPrismaService.payment.updateMany,
        },
        token: { deleteMany: mockPrismaService.token.deleteMany },
      }),
    ),
  };

  const mockTokensService = {
    emitTokensForInvestment: jest.fn(),
  };

  const mockTokenReservationService = {
    reserve: jest.fn().mockResolvedValue({
      ok: true,
      reservation: { id: 'reservation-1', expiresAt: new Date() },
    }),
    confirmByInvestment: jest.fn(),
    discardByInvestment: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockConfigService = {
    // fundraising.platformFee = 5% (Modelo B — taxa cobrada do investidor).
    getEffective: jest.fn().mockResolvedValue(0.05),
  };

  const mockAffiliateCommissionService = {
    createForInvestment: jest.fn(),
    cancelForInvestment: jest.fn().mockResolvedValue({ changed: false }),
  };

  beforeEach(async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      documento: { status: 'APPROVED' },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokensService, useValue: mockTokensService },
        {
          provide: TokenReservationService,
          useValue: mockTokenReservationService,
        },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: AffiliateCommissionService,
          useValue: mockAffiliateCommissionService,
        },
      ],
    }).compile();

    service = module.get<InvestmentsService>(InvestmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar investimento com status PENDING', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 1,
        userId: 1,
        status: 'ACTIVE',
      });
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.investment.create.mockResolvedValue({
        id: 100,
        userId: 1,
        campaignId: 1,
        amount: 1000,
        tokensQty: 100,
        status: 'PENDING',
        campaign: {
          title: 'Startup Teste',
          tokenPrice: 10,
          minInvestment: 100,
        },
        createdAt: new Date(),
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 200,
        status: 'PENDING',
        method: 'PIX',
      });

      const result = await service.create(1, { campaignId: 1, amount: 1000 });

      expect(result.error).toBe(false);
      expect(result.data.investment.status).toBe('PENDING');
      expect(result.data.investment.tokensQty).toBe(100);
      expect(result.data.payment.method).toBe('PIX');
    });

    it('deve lançar 403 se usuário não tem subscription ativa', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      await expect(
        service.create(1, { campaignId: 1, amount: 1000 }),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 404 se campanha não existir', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
      });
      mockPrismaService.campaign.findUnique.mockResolvedValue(null);
      await expect(
        service.create(1, { campaignId: 999, amount: 1000 }),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 400 se campanha não estiver OPEN', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
      });
      mockPrismaService.campaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        status: 'FUNDED',
      });
      await expect(
        service.create(1, { campaignId: 1, amount: 1000 }),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 400 se o valor não compra pelo menos um token', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
      });
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      await expect(
        service.create(1, { campaignId: 1, amount: 5 }),
      ).rejects.toThrow(HttpException);
    });

    it('deve calcular tokensQty corretamente (amount / tokenPrice)', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
      });
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.investment.create.mockResolvedValue({
        id: 100,
        userId: 1,
        campaignId: 1,
        amount: 1000,
        tokensQty: 100,
        status: 'PENDING',
        campaign: {
          title: 'Startup Teste',
          tokenPrice: 10,
          minInvestment: 100,
        },
        createdAt: new Date(),
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 200,
        status: 'PENDING',
        method: 'PIX',
      });

      const result = await service.create(1, { campaignId: 1, amount: 1000 });
      expect(result.data.investment.tokensQty).toBe(100);
    });

    it('deve lançar erro se tokensQty < 1', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
      });
      mockPrismaService.campaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        tokenPrice: 500,
      });
      await expect(
        service.create(1, { campaignId: 1, amount: 100 }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('confirmInvestment', () => {
    it('deve atualizar status para CONFIRMED e emitir tokens', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue({
        id: 100,
        status: 'PENDING',
        campaignId: 1,
        tokensQty: 100,
        payment: { status: 'PAID' },
        campaign: { startupId: 1 },
      });
      mockPrismaService.investment.update.mockResolvedValue({
        id: 100,
        status: 'CONFIRMED',
        tokensQty: 100,
      });
      mockPrismaService.campaign.update.mockResolvedValue({});
      mockTokensService.emitTokensForInvestment.mockResolvedValue({
        error: false,
        data: { tokensCount: 100, tokens: [] },
      });

      const result = await service.confirmInvestment(100);

      expect(result.error).toBe(false);
      expect(result.data!.investment.status).toBe('CONFIRMED');
      expect(mockTokensService.emitTokensForInvestment).toHaveBeenCalledWith(
        100,
      );
    });

    it('deve lançar 404 se investimento não existir', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue(null);
      await expect(service.confirmInvestment(999)).rejects.toThrow(
        HttpException,
      );
    });

    it('é idempotente: no-op se investimento já não está PENDING', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue({
        id: 100,
        status: 'CONFIRMED',
        tokensQty: 100,
        payment: { status: 'PAID' },
      });
      const result = await service.confirmInvestment(100);
      expect(result.error).toBe(false);
      expect(result.data!.investment.status).toBe('CONFIRMED');
      // Não reemite tokens nem reprocessa.
      expect(mockTokensService.emitTokensForInvestment).not.toHaveBeenCalled();
    });

    it('deve lançar 400 se pagamento não estiver PAID', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue({
        id: 100,
        status: 'PENDING',
        payment: { status: 'PENDING' },
      });
      await expect(service.confirmInvestment(100)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('findByUser', () => {
    it('deve retornar lista de investimentos do usuário', async () => {
      mockPrismaService.investment.findMany.mockResolvedValue([
        {
          id: 100,
          amount: 1000,
          tokensQty: 100,
          status: 'CONFIRMED',
          createdAt: new Date(),
          campaign: { title: 'Startup Teste', status: 'OPEN', tokenPrice: 10 },
          payment: { id: 200, status: 'PAID', method: 'PIX' },
        },
      ]);

      const result = await service.findByUser(1);

      expect(result.error).toBe(false);
      expect(result.data.total).toBe(1);
      expect(result.data.investments[0].campaignTitle).toBe('Startup Teste');
      expect(result.data.investments[0].paymentStatus).toBe('PAID');
    });

    it('deve retornar lista vazia quando usuário não tem investimentos', async () => {
      mockPrismaService.investment.findMany.mockResolvedValue([]);

      const result = await service.findByUser(1);

      expect(result.error).toBe(false);
      expect(result.data.total).toBe(0);
      expect(result.data.investments).toHaveLength(0);
    });
  });

  describe('create - boundary cases', () => {
    it('deve calcular tokensQty corretamente quando amount/tokenPrice é exato', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
      });
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.investment.create.mockResolvedValue({
        id: 100,
        userId: 1,
        campaignId: 1,
        amount: 1000,
        tokensQty: 100,
        status: 'PENDING',
        campaign: {
          title: 'Startup Teste',
          tokenPrice: 10,
          minInvestment: 100,
        },
        createdAt: new Date(),
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 200,
        status: 'PENDING',
        method: 'PIX',
      });

      const result = await service.create(1, { campaignId: 1, amount: 1000 });

      expect(result.error).toBe(false);
      expect(mockPrismaService.investment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tokensQty: 100 }),
        }),
      );
    });

    it('deve arredondar para baixo (floor) quando amount/tokenPrice não é inteiro', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
      });
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.investment.create.mockResolvedValue({
        id: 100,
        userId: 1,
        campaignId: 1,
        amount: 1050,
        tokensQty: 105,
        status: 'PENDING',
        campaign: {
          title: 'Startup Teste',
          tokenPrice: 10,
          minInvestment: 100,
        },
        createdAt: new Date(),
      });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 200,
        status: 'PENDING',
        method: 'PIX',
      });

      await service.create(1, { campaignId: 1, amount: 1050 });

      expect(mockPrismaService.investment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tokensQty: 105 }),
        }),
      );
    });
  });

  describe('confirmInvestment - error paths', () => {
    it('deve retornar error quando emitTokensForInvestment falha', async () => {
      mockPrismaService.investment.findUnique.mockResolvedValue({
        id: 100,
        status: 'PENDING',
        campaignId: 1,
        tokensQty: 100,
        payment: { status: 'PAID' },
        campaign: { startupId: 1 },
      });
      mockPrismaService.investment.update.mockResolvedValue({
        id: 100,
        status: 'CONFIRMED',
        tokensQty: 100,
      });
      mockPrismaService.campaign.update.mockResolvedValue({});
      mockTokensService.emitTokensForInvestment.mockResolvedValue({
        error: true,
        message: 'Falha ao emitir tokens',
        codigo: 500,
        data: null,
      });

      const result = await service.confirmInvestment(100);

      expect(result.error).toBe(false);
      expect(result.data!.tokens).toBeNull();
    });
  });

  describe('calcularTokensQty (helper)', () => {
    // Testes canonicos baseados na planilha de referencia do Marcos
    // amount: valor em reais (R$), tokenPrice: R$ 200,00

    it('deve retornar 5 tokens para R$ 1.000 (amount=1000, tokenPrice=200)', () => {
      const result = service.calcularTokensQty(1000, 200);
      expect(result).toBe(5);
    });

    it('deve retornar 25 tokens para R$ 5.000 (amount=5000, tokenPrice=200)', () => {
      const result = service.calcularTokensQty(5000, 200);
      expect(result).toBe(25);
    });

    it('deve retornar 250 tokens para R$ 50.000 (amount=50000, tokenPrice=200)', () => {
      const result = service.calcularTokensQty(50000, 200);
      expect(result).toBe(250);
    });

    it('deve retornar 1000 tokens para R$ 200.000 (amount=200000, tokenPrice=200)', () => {
      const result = service.calcularTokensQty(200000, 200);
      expect(result).toBe(1000);
    });

    it('deve retornar 0 quando tokenPrice e 0', () => {
      const result = service.calcularTokensQty(1000, 0);
      expect(result).toBe(0);
    });

    it('deve retornar 0 quando tokenPrice e negativo', () => {
      const result = service.calcularTokensQty(1000, -200);
      expect(result).toBe(0);
    });

    it('deve retornar 0 quando amount e 0', () => {
      const result = service.calcularTokensQty(0, 200);
      expect(result).toBe(0);
    });

    it('deve truncar para baixo em valores com parte fracionaria', () => {
      // 1050 / 10 = 105 (exato)
      const result = service.calcularTokensQty(1050, 10);
      expect(result).toBe(105);
    });

    it('deve truncar para baixo descartando parte fracionaria', () => {
      // 1051 / 10 = 105.1 => trunc => 105
      const result = service.calcularTokensQty(1051, 10);
      expect(result).toBe(105);
    });

    it('deve funcionar com tokenPrice fracionado (R$ 0.05)', () => {
      // 1000 / 0.05 = 20000
      const result = service.calcularTokensQty(1000, 0.05);
      expect(result).toBe(20000);
    });
  });

  describe('findMyInvestedStartups', () => {
    it('deve agrupar investments CONFIRMED por startup', async () => {
      mockPrismaService.investment.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 10,
          amount: 1000,
          tokensQty: 50,
          status: 'CONFIRMED',
          createdAt: new Date('2026-01-01'),
          campaign: {
            id: 1,
            status: 'OPEN',
            startup: {
              id: 100,
              nome: 'Startup A',
              logo: 'logo-a.png',
              segmento: 'Fintech',
            },
          },
          tokens: [{ quantity: 50, currentVal: 1200 }],
        },
        {
          id: 2,
          userId: 10,
          amount: 500,
          tokensQty: 25,
          status: 'CONFIRMED',
          createdAt: new Date('2026-02-01'),
          campaign: {
            id: 1,
            status: 'OPEN',
            startup: {
              id: 100,
              nome: 'Startup A',
              logo: 'logo-a.png',
              segmento: 'Fintech',
            },
          },
          tokens: [{ quantity: 25, currentVal: 600 }],
        },
      ]);

      const result = await service.findMyInvestedStartups(10);

      expect(result.error).toBe(false);
      expect(result.data.totalStartups).toBe(1);
      expect(result.data.totalInvestido).toBe(1500);
      expect(result.data.currentValueTotal).toBe(1800);
      expect(result.data.startups[0]).toMatchObject({
        startupId: 100,
        nome: 'Startup A',
        aportes: 2,
        totalInvestido: 1500,
        totalTokens: 75,
        currentValue: 1800,
      });
    });

    it('deve ignorar investments PENDING/CANCELED', async () => {
      mockPrismaService.investment.findMany.mockResolvedValue([]);

      const result = await service.findMyInvestedStartups(10);

      expect(result.error).toBe(false);
      expect(result.data.totalStartups).toBe(0);
      expect(result.data.totalInvestido).toBe(0);
      expect(result.data.currentValueTotal).toBe(0);
      expect(result.data.startups).toEqual([]);
    });

    it('deve retornar currentValue null quando tokens nao tem currentVal', async () => {
      mockPrismaService.investment.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 10,
          amount: 1000,
          tokensQty: 10,
          status: 'CONFIRMED',
          createdAt: new Date(),
          campaign: {
            id: 1,
            status: 'OPEN',
            startup: { id: 100, nome: 'B', logo: null, segmento: null },
          },
          tokens: [{ quantity: 10, currentVal: null }],
        },
      ]);

      const result = await service.findMyInvestedStartups(10);

      expect(result.data.startups[0].currentValue).toBeNull();
      expect(result.data.currentValueTotal).toBe(0);
    });
  });
});
