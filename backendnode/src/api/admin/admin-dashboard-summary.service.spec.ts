import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminDashboardSummaryService } from './admin-dashboard-summary.service';

/**
 * RED phase — define o contrato do AdminDashboardSummaryService.getSummary().
 * O service é o ponto único de leitura do dashboard executivo /admin/dashboard.
 *
 * Cobre:
 *   - 8 KPIs (gmv, totalRedeemed, tokensGenerated, tokensSold, activeInvestors,
 *     totalUsers, totalStartups, activeCampaigns)
 *   - 3 séries mensais (gmvMonthly e userGrowth últimos 12m; startupsMonthly últimos 6m)
 *   - 2 filas operacionais (pendingRedemptions, activeCampaigns)
 *
 * Estes testes devem FALHAR até a implementação ser escrita (Phase GREEN).
 */
describe('AdminDashboardSummaryService', () => {
  let service: AdminDashboardSummaryService;

  const mockPrisma = {
    investment: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    withdrawal: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    campaign: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    startup: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    token: {
      aggregate: jest.fn(),
    },
    kYCProfile: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    payment: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  /**
   * Stub default: zera tudo (sums null + counts 0 + listas vazias).
   * Cada teste pode sobrescrever mocks específicos via `mockResolvedValueOnce`.
   */
  const stubEmpty = () => {
    mockPrisma.investment.aggregate.mockResolvedValue({
      _sum: { amount: null },
    });
    mockPrisma.investment.findMany.mockResolvedValue([]);
    mockPrisma.withdrawal.aggregate.mockResolvedValue({
      _sum: { amount: null },
    });
    mockPrisma.withdrawal.count.mockResolvedValue(0);
    mockPrisma.withdrawal.findMany.mockResolvedValue([]);
    mockPrisma.campaign.aggregate.mockResolvedValue({
      _sum: { totalTokens: null, tokensSold: null },
    });
    mockPrisma.campaign.count.mockResolvedValue(0);
    mockPrisma.campaign.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.startup.count.mockResolvedValue(0);
    mockPrisma.startup.findMany.mockResolvedValue([]);
    mockPrisma.token.aggregate.mockResolvedValue({ _sum: { quantity: null } });
    mockPrisma.kYCProfile.count.mockResolvedValue(0);
    mockPrisma.kYCProfile.findFirst.mockResolvedValue(null);
    mockPrisma.payment.count.mockResolvedValue(0);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    stubEmpty();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardSummaryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminDashboardSummaryService>(
      AdminDashboardSummaryService,
    );
  });

  describe('getSummary — KPIs', () => {
    it('should compute gmv from SUM(investment.amount WHERE status=CONFIRMED)', async () => {
      mockPrisma.investment.aggregate.mockResolvedValueOnce({
        _sum: { amount: 2_500_000 },
      });

      const result = await service.getSummary();

      expect(result.data.kpis.gmv).toBe(2_500_000);
      expect(mockPrisma.investment.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          _sum: { amount: true },
          where: { status: 'CONFIRMED' },
        }),
      );
    });

    it('should compute totalRedeemed from SUM(withdrawal.amount WHERE status=COMPLETED)', async () => {
      mockPrisma.withdrawal.aggregate.mockResolvedValueOnce({
        _sum: { amount: 750_000 },
      });

      const result = await service.getSummary();

      expect(result.data.kpis.totalRedeemed).toBe(750_000);
      expect(mockPrisma.withdrawal.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          _sum: { amount: true },
          where: { status: 'COMPLETED' },
        }),
      );
    });

    it('should default totals to 0 when SUM returns null (no records)', async () => {
      const result = await service.getSummary();

      expect(result.data.kpis.gmv).toBe(0);
      expect(result.data.kpis.totalRedeemed).toBe(0);
      expect(result.data.kpis.tokensGenerated).toBe(0);
      expect(result.data.kpis.tokensSold).toBe(0);
    });

    it('should compute tokensGenerated from SUM(campaign.totalTokens)', async () => {
      mockPrisma.campaign.aggregate.mockResolvedValueOnce({
        _sum: { totalTokens: 50_000 },
      });

      const result = await service.getSummary();

      expect(result.data.kpis.tokensGenerated).toBe(50_000);
      expect(mockPrisma.campaign.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          _sum: { totalTokens: true },
        }),
      );
    });

    it('should compute tokensSold from SUM(campaign.tokensSold)', async () => {
      // First call returns totalTokens, second returns tokensSold.
      mockPrisma.campaign.aggregate
        .mockResolvedValueOnce({ _sum: { totalTokens: 1000 } })
        .mockResolvedValueOnce({ _sum: { tokensSold: 700 } });

      const result = await service.getSummary();

      expect(result.data.kpis.tokensGenerated).toBe(1000);
      expect(result.data.kpis.tokensSold).toBe(700);
    });

    it('should count activeInvestors as DISTINCT users with CONFIRMED investments', async () => {
      mockPrisma.investment.findMany.mockResolvedValueOnce([
        { userId: 1 },
        { userId: 2 },
        { userId: 3 },
      ]);

      const result = await service.getSummary();

      expect(result.data.kpis.activeInvestors).toBe(3);
    });

    it('should count totalUsers, totalStartups, activeCampaigns from their respective tables', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(150);
      mockPrisma.startup.count.mockResolvedValueOnce(25);
      mockPrisma.campaign.count.mockResolvedValueOnce(8);

      const result = await service.getSummary();

      expect(result.data.kpis.totalUsers).toBe(150);
      expect(result.data.kpis.totalStartups).toBe(25);
      expect(result.data.kpis.activeCampaigns).toBe(8);
      expect(mockPrisma.campaign.count).toHaveBeenCalledWith({
        where: { status: 'OPEN' },
      });
    });

    it('should expose the total pending redemptions count separately from the limited queue', async () => {
      mockPrisma.withdrawal.count.mockResolvedValueOnce(27);

      const result = await service.getSummary();

      expect(result.data.kpis.pendingRedemptionsCount).toBe(27);
      expect(mockPrisma.withdrawal.count).toHaveBeenCalledWith({
        where: { status: { in: ['REQUESTED', 'PROCESSING'] } },
      });
    });
  });

  describe('getSummary — series', () => {
    it('should build userGrowth with 12 monthly buckets (chronological order)', async () => {
      mockPrisma.investment.findMany.mockResolvedValueOnce([]); // activeInvestors
      mockPrisma.user.findMany.mockResolvedValueOnce([
        // meio do mês evita TZ shifts
        { createdAt: new Date('2026-01-15T12:00:00Z') },
        { createdAt: new Date('2026-03-20T12:00:00Z') },
        { createdAt: new Date('2026-03-25T12:00:00Z') },
      ]);

      const result = await service.getSummary();

      expect(result.data.userGrowth.labels).toHaveLength(12);
      expect(result.data.userGrowth.data).toHaveLength(12);
      expect(
        result.data.userGrowth.data.reduce((a: number, b: number) => a + b, 0),
      ).toBe(3);
    });

    it('should build startupsMonthly with 6 monthly buckets', async () => {
      mockPrisma.startup.findMany.mockResolvedValueOnce([
        { createdAt: new Date('2026-04-15T12:00:00Z') },
        { createdAt: new Date('2026-04-20T12:00:00Z') },
      ]);

      const result = await service.getSummary();

      expect(result.data.startupsMonthly.labels).toHaveLength(6);
      expect(result.data.startupsMonthly.data).toHaveLength(6);
      expect(
        result.data.startupsMonthly.data.reduce(
          (a: number, b: number) => a + b,
          0,
        ),
      ).toBe(2);
    });

    it('should build gmvMonthly as a 12-month amount series', async () => {
      mockPrisma.investment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { createdAt: new Date('2026-01-15T12:00:00Z'), amount: 1000 },
          { createdAt: new Date('2026-03-20T12:00:00Z'), amount: 2000 },
        ]);

      const result = await service.getSummary();

      expect(result.data.gmvMonthly.labels).toHaveLength(12);
      expect(result.data.gmvMonthly.data).toHaveLength(12);
      expect(
        result.data.gmvMonthly.data.reduce((a: number, b: number) => a + b, 0),
      ).toBe(3000);
    });
  });

  describe('getSummary — hero metrics (Tile Mosaic)', () => {
    it('should compute gmvToday from SUM(investment.amount WHERE status=CONFIRMED AND createdAt >= startOfToday)', async () => {
      // Ordem das chamadas no service: gmvTotal, gmvToday, gmvYesterday.
      // Só configuramos a 2ª (gmvToday); as outras usam default (null).
      mockPrisma.investment.aggregate.mockResolvedValueOnce({
        _sum: { amount: null },
      });
      mockPrisma.investment.aggregate.mockResolvedValueOnce({
        _sum: { amount: 5_000 },
      });

      const result = await service.getSummary();

      expect(result.data.kpis.gmvToday).toBe(5_000);
      expect(mockPrisma.investment.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          _sum: { amount: true },
          where: expect.objectContaining({
            status: 'CONFIRMED',
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should compute gmvYesterday from SUM(investment.amount WHERE createdAt BETWEEN yesterday start and today start)', async () => {
      // gmvTotal → null, gmvToday → null, gmvYesterday → 4000
      mockPrisma.investment.aggregate.mockResolvedValueOnce({
        _sum: { amount: null },
      });
      mockPrisma.investment.aggregate.mockResolvedValueOnce({
        _sum: { amount: null },
      });
      mockPrisma.investment.aggregate.mockResolvedValueOnce({
        _sum: { amount: 4_000 },
      });

      const result = await service.getSummary();

      expect(result.data.kpis.gmvYesterday).toBe(4_000);
    });

    it('should compute gmvDeltaPct as percentage change vs yesterday', async () => {
      mockPrisma.investment.aggregate
        // gmv total
        .mockResolvedValueOnce({ _sum: { amount: 100_000 } })
        // gmvToday
        .mockResolvedValueOnce({ _sum: { amount: 5_000 } })
        // gmvYesterday
        .mockResolvedValueOnce({ _sum: { amount: 4_000 } });

      const result = await service.getSummary();

      // (5000 - 4000) / 4000 * 100 = 25
      expect(result.data.kpis.gmvDeltaPct).toBe(25);
    });

    it('should return null gmvDeltaPct when yesterday was zero (no baseline)', async () => {
      mockPrisma.investment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100_000 } }) // gmv total
        .mockResolvedValueOnce({ _sum: { amount: 1_000 } }) // gmvToday
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // gmvYesterday

      const result = await service.getSummary();

      expect(result.data.kpis.gmvDeltaPct).toBeNull();
    });

    it('should compute pendingRedemptionsAmount from SUM(withdrawal.amount WHERE status IN pending)', async () => {
      // withdrawal.aggregate é chamado 2x: totalRedeemed + pendingRedemptionsAmount.
      mockPrisma.withdrawal.aggregate.mockResolvedValueOnce({
        _sum: { amount: null },
      });
      mockPrisma.withdrawal.aggregate.mockResolvedValueOnce({
        _sum: { amount: 19_500 },
      });

      const result = await service.getSummary();

      expect(result.data.kpis.pendingRedemptionsAmount).toBe(19_500);
    });

    it('should compute activeCampaignsAvgProgress as rounded average of OPEN campaigns', async () => {
      mockPrisma.campaign.findMany
        // pendingRedemptions not affected (uses withdrawal.findMany)
        // activeCampaigns queue
        .mockResolvedValueOnce([
          {
            id: 1,
            tokensSold: 800,
            totalTokens: 1000,
            title: 'A',
            startup: { nome: 'X' },
          },
          {
            id: 2,
            tokensSold: 500,
            totalTokens: 1000,
            title: 'B',
            startup: { nome: 'Y' },
          },
          {
            id: 3,
            tokensSold: 1000,
            totalTokens: 1000,
            title: 'C',
            startup: { nome: 'Z' },
          },
        ]);

      const result = await service.getSummary();

      // Progressos: 80, 50, 100. Média: 76.66... → rounded 77.
      expect(result.data.kpis.activeCampaignsAvgProgress).toBe(77);
    });

    it('should return 0 activeCampaignsAvgProgress when no OPEN campaigns', async () => {
      const result = await service.getSummary();

      expect(result.data.kpis.activeCampaignsAvgProgress).toBe(0);
    });

    it('should compute kycPendingCount from KYCProfile WHERE status IN (PENDING, UNDER_REVIEW)', async () => {
      mockPrisma.kYCProfile.count.mockResolvedValueOnce(5);

      const result = await service.getSummary();

      expect(result.data.kpis.kycPendingCount).toBe(5);
      expect(mockPrisma.kYCProfile.count).toHaveBeenCalledWith({
        where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      });
    });

    it('should compute kycOldestAgeHours as hours since oldest pending KYC', async () => {
      const now = new Date('2026-09-08T15:00:00Z');
      jest.useFakeTimers().setSystemTime(now);
      mockPrisma.kYCProfile.findFirst.mockResolvedValueOnce({
        createdAt: new Date('2026-09-07T15:00:00Z'), // 24h atrás
      });

      const result = await service.getSummary();

      expect(result.data.kpis.kycOldestAgeHours).toBe(24);
      jest.useRealTimers();
    });

    it('should return 0 kycOldestAgeHours when no pending KYC', async () => {
      const result = await service.getSummary();

      expect(result.data.kpis.kycOldestAgeHours).toBe(0);
    });
  });

  describe('getSummary — queues', () => {
    it('should only include REQUESTED/PROCESSING withdrawals in pendingRedemptions', async () => {
      const result = await service.getSummary();

      expect(mockPrisma.withdrawal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['REQUESTED', 'PROCESSING'] } },
        }),
      );
      expect(Array.isArray(result.data.pendingRedemptions)).toBe(true);
    });

    it('should only include OPEN campaigns in activeCampaigns queue', async () => {
      const result = await service.getSummary();

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'OPEN' },
        }),
      );
      expect(Array.isArray(result.data.activeCampaigns)).toBe(true);
    });

    it('should compute campaign progress as floor(tokensSold/totalTokens*100)', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([
        {
          id: 1,
          title: 'Rodada Seed',
          tokensSold: 700,
          totalTokens: 1000,
          startup: { nome: 'Acme Tech' },
        },
      ]);

      const result = await service.getSummary();

      expect(result.data.activeCampaigns).toEqual([
        {
          id: 1,
          title: 'Rodada Seed',
          startupNome: 'Acme Tech',
          progress: 70,
        },
      ]);
    });
  });

  describe('getSummary — response envelope', () => {
    it('should wrap payload in standard ResponseDto.success envelope', async () => {
      const result = await service.getSummary();

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(200);
      expect(result.message).toMatch(/dashboard/i);
      expect(result.data).toHaveProperty('kpis');
      expect(result.data).toHaveProperty('userGrowth');
      expect(result.data).toHaveProperty('startupsMonthly');
      expect(result.data).toHaveProperty('pendingRedemptions');
      expect(result.data).toHaveProperty('activeCampaigns');
    });
  });

  describe('Payments KPI (montador de Ordens e Pagamentos)', () => {
    it('should expose paymentsPaidToday, paymentsPendingCount, paymentsExpiredCount', async () => {
      mockPrisma.payment.count
        .mockResolvedValueOnce(3) // paymentsPaidToday
        .mockResolvedValueOnce(7) // paymentsPendingCount
        .mockResolvedValueOnce(1); // paymentsExpiredCount
      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 2500 } }) // paymentsPaidTodayAmount
        .mockResolvedValueOnce({ _sum: { amount: 1750 } }); // paymentsPendingAmount

      const result = await service.getSummary();

      expect(result.error).toBe(false);
      expect(result.data.kpis.paymentsPaidToday).toBe(3);
      expect(result.data.kpis.paymentsPaidTodayAmount).toBe(2500);
      expect(result.data.kpis.paymentsPendingCount).toBe(7);
      expect(result.data.kpis.paymentsPendingAmount).toBe(1750);
      expect(result.data.kpis.paymentsExpiredCount).toBe(1);
    });

    it('should query payments with PAID + paidAt for paidToday', async () => {
      mockPrisma.payment.count.mockResolvedValue(0);
      await service.getSummary();
      const calls = mockPrisma.payment.count.mock.calls;
      const paidTodayCall = calls.find(
        (c) =>
          c[0]?.where?.status === 'PAID' &&
          c[0]?.where?.paidAt?.gte instanceof Date,
      );
      expect(paidTodayCall).toBeDefined();
    });

    it('should return zero-valued KPIs when no payments exist', async () => {
      const result = await service.getSummary();
      expect(result.error).toBe(false);
      expect(result.data.kpis.paymentsPaidToday).toBe(0);
      expect(result.data.kpis.paymentsPaidTodayAmount).toBe(0);
      expect(result.data.kpis.paymentsPendingCount).toBe(0);
      expect(result.data.kpis.paymentsPendingAmount).toBe(0);
      expect(result.data.kpis.paymentsExpiredCount).toBe(0);
    });
  });

  describe('Split financeiro (admin-only)', () => {
    it('should expose startupRepasseTotal from Σ startupRepasseAmount WHERE CONFIRMED', async () => {
      // As 4 agregações de split são chamadas DEPOIS das agregações originais
      // (gmv/gmvToday/gmvYesterday). Para simplificar, sobrescrevemos todas as
      // chamadas da rodada para retornar 200k apenas no repasse e zero no resto.
      mockPrisma.investment.aggregate.mockReset();
      mockPrisma.investment.aggregate
        // gmv total / gmvToday / gmvYesterday
        .mockResolvedValueOnce({ _sum: { amount: 0 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } })
        // split: repasseTotalResult
        .mockResolvedValueOnce({ _sum: { startupRepasseAmount: 200_000 } })
        // split: platformSpreadTotalResult
        .mockResolvedValueOnce({ _sum: { platformSpreadAmount: 30_000 } })
        // split: platformFeeTotalResult
        .mockResolvedValueOnce({ _sum: { platformFeeAmount: 12_000 } })
        // split: platformRevenueTotalResult
        .mockResolvedValueOnce({ _sum: { platformRevenueAmount: 42_000 } });

      const result = await service.getSummary();

      expect(result.data.kpis.startupRepasseTotal).toBe(200_000);
      expect(result.data.kpis.platformSpreadTotal).toBe(30_000);
      expect(result.data.kpis.platformFeeTotal).toBe(12_000);
      expect(result.data.kpis.platformRevenueTotal).toBe(42_000);
      // As 4 agregações de split devem filtrar status=CONFIRMED.
      const splitCalls = mockPrisma.investment.aggregate.mock.calls.filter(
        (c) =>
          c[0]?._sum &&
          ('startupRepasseAmount' in c[0]._sum ||
            'platformSpreadAmount' in c[0]._sum ||
            'platformFeeAmount' in c[0]._sum ||
            'platformRevenueAmount' in c[0]._sum),
      );
      expect(splitCalls.length).toBeGreaterThanOrEqual(4);
      splitCalls.forEach((c) => {
        expect(c[0].where).toEqual({ status: 'CONFIRMED' });
      });
    });

    it('should default split totals to 0 when SUM returns null', async () => {
      const result = await service.getSummary();
      expect(result.data.kpis.startupRepasseTotal).toBe(0);
      expect(result.data.kpis.platformSpreadTotal).toBe(0);
      expect(result.data.kpis.platformFeeTotal).toBe(0);
      expect(result.data.kpis.platformRevenueTotal).toBe(0);
    });

    it('should build splitMonthly with 12 buckets aligned to gmvMonthly labels', async () => {
      // 3ª chamada findMany = splitMonthlyRows (após activeInvestors/userGrowth).
      mockPrisma.investment.findMany
        .mockResolvedValueOnce([]) // activeInvestors
        .mockResolvedValueOnce([
          { createdAt: new Date('2026-01-15T12:00:00Z'), amount: 1000 },
          { createdAt: new Date('2026-03-20T12:00:00Z'), amount: 2000 },
        ]) // gmvMonthly
        .mockResolvedValueOnce([
          // splitMonthly
          {
            allocatedAt: new Date('2026-02-15T12:00:00Z'),
            startupRepasseAmount: 800,
            platformRevenueAmount: 200,
          },
          {
            allocatedAt: new Date('2026-04-15T12:00:00Z'),
            startupRepasseAmount: 1500,
            platformRevenueAmount: 500,
          },
        ]);

      const result = await service.getSummary();

      expect(result.data.splitMonthly.labels).toHaveLength(12);
      expect(result.data.splitMonthly.repasse).toHaveLength(12);
      expect(result.data.splitMonthly.lucro).toHaveLength(12);
      expect(
        result.data.splitMonthly.repasse.reduce(
          (a: number, b: number) => a + b,
          0,
        ),
      ).toBe(2300);
      expect(
        result.data.splitMonthly.lucro.reduce(
          (a: number, b: number) => a + b,
          0,
        ),
      ).toBe(700);
    });

    it('should query splitMonthly rows with allocatedAt not createdAt', async () => {
      await service.getSummary();
      const splitCall = mockPrisma.investment.findMany.mock.calls.find(
        (c) =>
          c[0]?.where?.allocatedAt &&
          c[0]?.select?.startupRepasseAmount === true,
      );
      expect(splitCall).toBeDefined();
      expect(splitCall?.[0].where.status).toBe('CONFIRMED');
    });
  });
});
