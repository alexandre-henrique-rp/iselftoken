import { Test, TestingModule } from '@nestjs/testing';
import { StartupQueryService } from './startup-query.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DashboardSummaryService } from './dashboard-summary.service';
import { EnrichmentService } from './enrichment.service';
import { NextActionService } from './next-action.service';

describe('StartupQueryService', () => {
  let service: StartupQueryService;
  let prisma: any;
  let dashboardSummary: any;
  let enrichment: any;
  let nextAction: any;

  beforeEach(async () => {
    prisma = {
      startup: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      investment: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
    };
    dashboardSummary = { buildSummary: jest.fn().mockResolvedValue({}) };
    enrichment = { enrichStartup: jest.fn().mockResolvedValue({}) };
    nextAction = { getNextAction: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupQueryService,
        { provide: PrismaService, useValue: prisma },
        { provide: DashboardSummaryService, useValue: dashboardSummary },
        { provide: EnrichmentService, useValue: enrichment },
        { provide: NextActionService, useValue: nextAction },
      ],
    }).compile();

    service = module.get(StartupQueryService);
  });

  describe('findAll()', () => {
    it('deve retornar startups vazias para founder sem dados', async () => {
      const result = await service.findAll({ id: 42 } as any);
      expect(result.error).toBe(false);
      expect(result.data).toEqual([]);
    });
  });

  describe('getFounderDashboardMetrics()', () => {
    it('deve retornar metricas zeradas sem startups', async () => {
      const result = await service.getFounderDashboardMetrics({
        id: 42,
      } as any);
      expect(result.error).toBe(false);
      expect(result.data.investor_count).toBe(0);
      expect(result.data.amount_raised).toBe(0);
      expect(result.data.total_campaigns).toBe(0);
    });

    it('deve calcular investidores e amount raised', async () => {
      prisma.startup.findMany.mockResolvedValueOnce([
        {
          id: 1,
          campaigns: [
            {
              id: 10,
              tokensSold: 500,
              totalTokens: 1000,
              tokenPrice: 200,
              status: 'OPEN',
              deadline: null,
              targetAmount: 200000,
            },
          ],
        },
      ] as any);
      prisma.investment.findMany.mockResolvedValueOnce([
        { userId: 1 },
        { userId: 2 },
      ] as any);
      // Soma dos investments CONFIRMED — em REAIS (repasse a startup).
      // Alinhado com `valorCaptado` exposto pelo enrichment service
      // (consistência KPI ↔ cards). 1a aggregate = split novo
      // (startupRepasseAmount), 2a = legado (amount).
      prisma.investment.aggregate
        .mockResolvedValueOnce({
          _sum: { startupRepasseAmount: 100_000 },
        } as any)
        .mockResolvedValueOnce({ _sum: { amount: 0 } } as any);

      const result = await service.getFounderDashboardMetrics({
        id: 42,
      } as any);
      expect(result.data.investor_count).toBe(2);
      expect(result.data.amount_raised).toBe(100_000);
    });
  });

  describe('getFounderStartupOverview()', () => {
    it('deve retornar overview vazio', async () => {
      prisma.startup.findMany.mockResolvedValueOnce([]);
      const result = await service.getFounderStartupOverview({ id: 42 } as any);
      expect(result.error).toBe(false);
      expect(result.data.startups).toEqual([]);
      expect(result.data.totalCaptado).toBe(0);
    });

    it('deve retornar overview com campanhas mapeando totalTokens e tokensSold corretamente', async () => {
      prisma.startup.findMany.mockResolvedValueOnce([
        {
          id: 1,
          nome: 'TechNova',
          slug: 'technova',
          area_atuacao: 'FINTECH',
          estagio: 'MVP',
          status: 'APPROVED',
          pais: { iso3: 'BRA', nome: 'Brasil', emoji: '🇧🇷' },
          logo: { url_sm: 'logo.png' },
          campaigns: [
            {
              id: 10,
              status: 'OPEN',
              totalTokens: 1000,
              tokensSold: 150,
              createdAt: new Date(),
            },
          ],
          createdAt: new Date(),
        },
      ]);

      prisma.token = {
        findMany: jest.fn().mockResolvedValue([
          {
            campaignId: 10,
            userId: 2,
            purchaseVal: 300.0,
          },
        ]),
      };

      const result = await service.getFounderStartupOverview({ id: 42 } as any);
      expect(result.error).toBe(false);
      expect(result.data.startups).toHaveLength(1);

      const mappedStartup = result.data.startups[0];
      expect(mappedStartup.campaigns).toEqual({
        id: 10,
        status: 'OPEN',
        tokens: 1000,
        tokens_sale: 150,
      });
      expect(result.data.progressoCampanhaAtiva).toBe(15); // 150 / 1000 = 15%
    });
  });

  describe('findAllAdmin() — busca por texto (regressão S34 — SQLite driver adapter)', () => {
    /**
     * BUG ORIGINAL: a query Prisma `{ contains: q, mode: 'insensitive' }`
     * lança "Unknown argument `mode`" no @prisma/adapter-better-sqlite3 (v7.8.0).
     * Fix: remover `mode` — SQLite `LIKE` já é case-insensitive para ASCII.
     * Estes testes travam o contrato para que o `mode` não volte.
     */
    beforeEach(() => {
      // findAllAdmin usa apenas findMany + count; mocks default já bastam,
      // só resetamos chamadas para isolar asserções por teste.
      prisma.startup.findMany.mockReset();
      prisma.startup.count.mockReset();
      prisma.startup.findMany.mockResolvedValue([]);
      prisma.startup.count.mockResolvedValue(0);
    });

    it('sem search NÃO adiciona where.OR (filtro vazio)', async () => {
      await service.findAllAdmin({ page: 1, limit: 25 });

      const findManyCall = prisma.startup.findMany.mock.calls[0][0];
      expect(findManyCall.where).toEqual({});
    });

    it('com search usa contains SEM mode (regressão)', async () => {
      await service.findAllAdmin({ page: 1, limit: 25, search: 'FintechPro' });

      const findManyCall = prisma.startup.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toEqual([
        { nome: { contains: 'FintechPro' } },
        { area_atuacao: { contains: 'FintechPro' } },
        { estagio: { contains: 'FintechPro' } },
      ]);
      expect(findManyCall.where.OR).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nome: expect.objectContaining({ mode: 'insensitive' }),
          }),
        ]),
      );
    });

    it('faz trim defensivo em search com espaços à frente/atrás', async () => {
      await service.findAllAdmin({
        page: 1,
        limit: 25,
        search: '  FintechPro  ',
      });

      const findManyCall = prisma.startup.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toEqual([
        { nome: { contains: 'FintechPro' } },
        { area_atuacao: { contains: 'FintechPro' } },
        { estagio: { contains: 'FintechPro' } },
      ]);
    });

    it('search com string vazia após trim é tratado como sem search', async () => {
      await service.findAllAdmin({ page: 1, limit: 25, search: '   ' });

      const findManyCall = prisma.startup.findMany.mock.calls[0][0];
      expect(findManyCall.where).toEqual({});
    });

    it('aplica paginação (skip = (page - 1) * limit)', async () => {
      await service.findAllAdmin({ page: 3, limit: 10, search: 'X' });

      const findManyCall = prisma.startup.findMany.mock.calls[0][0];
      expect(findManyCall.skip).toBe(20);
      expect(findManyCall.take).toBe(10);
    });

    it('passa o mesmo `where` para findMany e count (consistência)', async () => {
      await service.findAllAdmin({ page: 1, limit: 25, search: 'FintechPro' });

      const findManyWhere = prisma.startup.findMany.mock.calls[0][0].where;
      const countWhere = prisma.startup.count.mock.calls[0][0].where;
      expect(countWhere).toEqual(findManyWhere);
    });

    it('retorna error=true quando Prisma lança (preserva contrato existente)', async () => {
      prisma.startup.findMany.mockRejectedValueOnce(new Error('DB down'));

      const result = await service.findAllAdmin({
        page: 1,
        limit: 25,
        search: 'FintechPro',
      });

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(500);
    });
  });
});
