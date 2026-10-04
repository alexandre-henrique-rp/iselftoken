import { Test, TestingModule } from '@nestjs/testing';
import { AdminFinanceiroSplitService } from './admin-financeiro-split.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseDto } from 'src/common/dto/response.dto';

/**
 * RED phase — AdminFinanceiroSplitService
 *
 * Cobre a auditoria admin do split financeiro (repasse × lucro plataforma):
 *  - list(): filtra campanhas + agrega split por groupBy
 *  - detail(): campaign + lista de investments + breakdown
 *  - exportCsv(): gera CSV dos investments
 *
 * Os valores são lidos dos snapshots gravados em Investment desde a
 * migration 20261001000000_investment_financial_split.
 */
describe('AdminFinanceiroSplitService', () => {
  let service: AdminFinanceiroSplitService;

  const mockPrisma = {
    campaign: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    investment: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminFinanceiroSplitService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminFinanceiroSplitService>(
      AdminFinanceiroSplitService,
    );
  });

  describe('list', () => {
    it('should default status filter to FUNDED/PAID_OUT/CLOSED (exclude OPEN/DRAFT)', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([]);
      mockPrisma.campaign.count.mockResolvedValueOnce(0);

      await service.list({});

      const findManyCall = mockPrisma.campaign.findMany.mock.calls[0]?.[0];
      expect(findManyCall?.where?.status).toEqual({
        in: ['FUNDED', 'PAID_OUT', 'CLOSED'],
      });
    });

    it('should accept explicit status filter (single value)', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([]);
      mockPrisma.campaign.count.mockResolvedValueOnce(0);

      await service.list({ status: 'FUNDED' });

      const findManyCall = mockPrisma.campaign.findMany.mock.calls[0]?.[0];
      expect(findManyCall?.where?.status).toBe('FUNDED');
    });

    it('should apply startup search filter (nome OR slug)', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([]);
      mockPrisma.campaign.count.mockResolvedValueOnce(0);

      await service.list({ search: 'Acme' });

      const findManyCall = mockPrisma.campaign.findMany.mock.calls[0]?.[0];
      expect(findManyCall?.where?.startup).toEqual({
        OR: [{ nome: { contains: 'Acme' } }, { slug: { contains: 'Acme' } }],
      });
    });

    it('should paginate with skip/take based on page and pageSize', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([]);
      mockPrisma.campaign.count.mockResolvedValueOnce(0);

      await service.list({ page: 3, pageSize: 25 });

      const findManyCall = mockPrisma.campaign.findMany.mock.calls[0]?.[0];
      expect(findManyCall?.skip).toBe(50);
      expect(findManyCall?.take).toBe(25);
    });

    it('should aggregate split via groupBy campaignId with status=CONFIRMED', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([
        {
          id: 1,
          title: 'Rodada Seed',
          status: 'FUNDED',
          targetAmount: '500000',
          deadline: new Date('2026-12-31'),
          closedAt: new Date('2026-12-01'),
          startup: { id: 10, nome: 'Acme', slug: 'acme' },
        },
      ]);
      mockPrisma.campaign.count.mockResolvedValueOnce(1);
      mockPrisma.investment.groupBy.mockResolvedValueOnce([
        {
          campaignId: 1,
          _sum: {
            amount: '12000',
            startupRepasseAmount: '10000',
            platformSpreadAmount: '1500',
            platformFeeAmount: '500',
            platformRevenueAmount: '2000',
            affiliateCommissionAmount: '300',
          },
          _count: { _all: 5, userId: 5 },
        },
      ]);

      const result = await service.list({});

      expect(result.error).toBe(false);
      expect(result.data.data).toHaveLength(1);
      const row = result.data.data[0];
      expect(row.campaignId).toBe(1);
      expect(row.amountRaised).toBe(12000);
      expect(row.startupRepasseTotal).toBe(10000);
      expect(row.platformSpreadTotal).toBe(1500);
      expect(row.platformFeeTotal).toBe(500);
      expect(row.platformRevenueTotal).toBe(2000);
      expect(row.affiliateCommissionTotal).toBe(300);
      expect(row.investorsCount).toBe(5);

      expect(mockPrisma.investment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['campaignId'],
          where: expect.objectContaining({ status: 'CONFIRMED' }),
        }),
      );
    });

    it('should compute page-level totals from current page rows', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([
        {
          id: 1,
          title: 'A',
          status: 'FUNDED',
          targetAmount: '0',
          deadline: new Date(),
          closedAt: new Date(),
          startup: { id: 1, nome: 'A', slug: 'a' },
        },
        {
          id: 2,
          title: 'B',
          status: 'PAID_OUT',
          targetAmount: '0',
          deadline: new Date(),
          closedAt: new Date(),
          startup: { id: 2, nome: 'B', slug: 'b' },
        },
      ]);
      mockPrisma.campaign.count.mockResolvedValueOnce(2);
      mockPrisma.investment.groupBy.mockResolvedValueOnce([
        {
          campaignId: 1,
          _sum: {
            amount: '5000',
            startupRepasseAmount: '4000',
            platformSpreadAmount: '500',
            platformFeeAmount: '500',
            platformRevenueAmount: '1000',
            affiliateCommissionAmount: '100',
          },
          _count: { _all: 2, userId: 2 },
        },
        {
          campaignId: 2,
          _sum: {
            amount: '3000',
            startupRepasseAmount: '2000',
            platformSpreadAmount: '500',
            platformFeeAmount: '500',
            platformRevenueAmount: '1000',
            affiliateCommissionAmount: '50',
          },
          _count: { _all: 1, userId: 1 },
        },
      ]);

      const result = await service.list({});

      expect(result.data.totals.startupRepasseTotal).toBe(6000);
      expect(result.data.totals.platformRevenueTotal).toBe(2000);
      expect(result.data.totals.amountRaised).toBe(8000);
      expect(result.data.totals.platformSpreadTotal).toBe(1000);
      expect(result.data.totals.platformFeeTotal).toBe(1000);
      expect(result.data.totals.affiliateCommissionTotal).toBe(150);
    });

    it('should apply allocatedAt range filter when from/to provided', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([
        {
          id: 1,
          title: 'A',
          status: 'FUNDED',
          targetAmount: '0',
          deadline: new Date(),
          closedAt: new Date(),
          startup: { id: 1, nome: 'A', slug: 'a' },
        },
      ]);
      mockPrisma.campaign.count.mockResolvedValueOnce(1);
      mockPrisma.investment.groupBy.mockResolvedValueOnce([]);

      await service.list({ from: '2026-01-01', to: '2026-12-31' });

      const groupByCall = mockPrisma.investment.groupBy.mock.calls[0]?.[0];
      expect(groupByCall?.where?.allocatedAt).toEqual({
        gte: new Date('2026-01-01'),
        lte: new Date('2026-12-31T23:59:59.999Z'),
      });
    });

    it('should skip groupBy when no campaigns found (avoid empty IN query)', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([]);
      mockPrisma.campaign.count.mockResolvedValueOnce(0);

      await service.list({});

      expect(mockPrisma.investment.groupBy).not.toHaveBeenCalled();
    });

    it('should clamp pageSize to max 100', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([]);
      mockPrisma.campaign.count.mockResolvedValueOnce(0);

      await service.list({ pageSize: 500 });

      const findManyCall = mockPrisma.campaign.findMany.mock.calls[0]?.[0];
      expect(findManyCall?.take).toBe(100);
    });
  });

  describe('detail', () => {
    it('should return 404 when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValueOnce(null);

      const result = await service.detail(999);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });

    it('should return campaign + breakdown + investments for a valid campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        title: 'Rodada Seed',
        status: 'FUNDED',
        targetAmount: '500000',
        tokenPrice: '200',
        tokenBaseValue: '200',
        tokenSellPrice: '240',
        tokenMintingCost: '2500',
        totalTokens: 2500,
        tokensSold: 50,
        deadline: new Date('2026-12-31'),
        closedAt: new Date('2026-12-01'),
        startup: {
          id: 10,
          nome: 'Acme',
          slug: 'acme',
          cnpj: '11.222.333/0001-44',
        },
      });
      mockPrisma.investment.findMany.mockResolvedValueOnce([
        {
          id: 100,
          tokensQty: 5,
          tokenBasePrice: '200',
          tokenSellPrice: '240',
          tokenSubtotal: '1200',
          platformFeePct: '0.05',
          platformFeeAmount: '60',
          startupRepasseAmount: '1000',
          platformSpreadAmount: '200',
          platformRevenueAmount: '260',
          affiliateCommissionAmount: '30',
          allocatedAt: new Date('2026-09-15'),
          user: { id: 1, publicId: 'abc-123', nome: 'João' },
          payment: {
            id: 1,
            amount: '1260',
            method: 'PIX',
            paidAt: new Date('2026-09-15'),
          },
        },
      ]);

      const result = await service.detail(1);

      expect(result.error).toBe(false);
      expect(result.data.campaign.id).toBe(1);
      expect(result.data.campaign.startup.cnpj).toBe('11.222.333/0001-44');

      const breakdown = result.data.breakdown;
      expect(breakdown.startupRepasseTotal).toBe(1000);
      expect(breakdown.platformSpreadTotal).toBe(200);
      expect(breakdown.platformFeeTotal).toBe(60);
      expect(breakdown.platformRevenueTotal).toBe(260);
      expect(breakdown.affiliateCommissionTotal).toBe(30);
      expect(breakdown.investorsCount).toBe(1);
      expect(breakdown.amountRaised).toBe(1200);

      const inv = result.data.investments[0];
      expect(inv.id).toBe(100);
      expect(inv.userPublicId).toBe('abc-123');
      expect(inv.tokenSellPrice).toBe(240);
      expect(inv.startupRepasseAmount).toBe(1000);
      expect(inv.platformSpreadAmount).toBe(200);
      expect(inv.platformRevenueAmount).toBe(260);
      expect(inv.totalCharged).toBe(1260);
      expect(inv.method).toBe('PIX');
    });

    it('should fall back to subtotal+fee for totalCharged when payment missing', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        title: 'A',
        status: 'FUNDED',
        targetAmount: '0',
        tokenPrice: '0',
        tokenBaseValue: '0',
        tokenSellPrice: '0',
        tokenMintingCost: '0',
        totalTokens: 0,
        tokensSold: 0,
        deadline: new Date(),
        closedAt: null,
        startup: { id: 1, nome: 'A', slug: 'a', cnpj: null },
      });
      mockPrisma.investment.findMany.mockResolvedValueOnce([
        {
          id: 1,
          tokensQty: 1,
          tokenBasePrice: '200',
          tokenSellPrice: '240',
          tokenSubtotal: '240',
          platformFeePct: '0.05',
          platformFeeAmount: '12',
          startupRepasseAmount: '200',
          platformSpreadAmount: '40',
          platformRevenueAmount: '52',
          affiliateCommissionAmount: null,
          allocatedAt: null,
          user: { id: 1, publicId: 'p1', nome: 'X' },
          payment: null,
        },
      ]);

      const result = await service.detail(1);

      const inv = result.data.investments[0];
      expect(inv.totalCharged).toBe(252); // 240 + 12
      expect(inv.affiliateCommissionAmount).toBe(0);
    });
  });

  describe('exportCsv', () => {
    it('should generate CSV header + one row per investment', async () => {
      const detailSpy = jest.spyOn(service, 'detail').mockResolvedValueOnce(
        ResponseDto.success('ok', 200, {
          campaign: { id: 1, title: 'X' },
          investments: [
            {
              id: 1,
              userPublicId: 'p1',
              userNome: 'A',
              tokensQty: 5,
              tokenBasePrice: 200,
              tokenSellPrice: 240,
              tokenSubtotal: 1200,
              platformFeePct: 0.05,
              platformFeeAmount: 60,
              startupRepasseAmount: 1000,
              platformSpreadAmount: 200,
              platformRevenueAmount: 260,
              affiliateCommissionAmount: 30,
              totalCharged: 1260,
              method: 'PIX',
              paidAt: new Date('2026-09-15T12:00:00Z'),
              allocatedAt: new Date('2026-09-15T12:00:00Z'),
            },
          ],
        }) as never,
      );

      const csv = await service.exportCsv(1);
      const lines = csv.split('\n');
      expect(lines[0]).toMatch(/^investment_id,/);
      expect(lines[1]).toMatch(/^1,/);
      detailSpy.mockRestore();
    });

    it('should return empty string when campaign not found', async () => {
      jest
        .spyOn(service, 'detail')
        .mockResolvedValueOnce(
          ResponseDto.error('not found', 404, null) as never,
        );

      const csv = await service.exportCsv(999);
      expect(csv).toBe('');
    });

    it('should escape commas/quotes in CSV values', async () => {
      jest.spyOn(service, 'detail').mockResolvedValueOnce(
        ResponseDto.success('ok', 200, {
          campaign: { id: 1, title: 'X' },
          investments: [
            {
              id: 1,
              userPublicId: 'p1',
              userNome: 'A, B', // valor com vírgula
              tokensQty: 1,
              tokenBasePrice: 1,
              tokenSellPrice: 1,
              tokenSubtotal: 1,
              platformFeePct: 0,
              platformFeeAmount: 0,
              startupRepasseAmount: 1,
              platformSpreadAmount: 0,
              platformRevenueAmount: 0,
              affiliateCommissionAmount: 0,
              totalCharged: 1,
              method: 'PIX',
              paidAt: null,
              allocatedAt: null,
            },
          ],
        }) as never,
      );

      const csv = await service.exportCsv(1);
      expect(csv).toContain('"A, B"');
    });
  });

  describe('response envelope', () => {
    it('should wrap payload in ResponseDto.success', async () => {
      mockPrisma.campaign.findMany.mockResolvedValueOnce([]);
      mockPrisma.campaign.count.mockResolvedValueOnce(0);
      const okSpy = jest.spyOn(ResponseDto, 'success');

      await service.list({});

      expect(okSpy).toHaveBeenCalled();
      okSpy.mockRestore();
    });
  });
});
