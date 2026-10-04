import { Test, TestingModule } from '@nestjs/testing';
import { DashboardSummaryService } from './dashboard-summary.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('DashboardSummaryService', () => {
  let service: DashboardSummaryService;
  let prisma: any;

  const mockPrisma = {
    investment: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    campaign: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardSummaryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardSummaryService>(DashboardSummaryService);
    prisma = mockPrisma;
    jest.clearAllMocks();
  });

  // ---- getCaptado30d ----

  it('getCaptado30d: founder sem investments retorna sparkline 30 zeros + valor 0 + variacao 0', async () => {
    mockPrisma.investment.groupBy.mockResolvedValue([]);
    mockPrisma.investment.aggregate.mockResolvedValue({
      _sum: { amount: null },
    });

    const result = await service.getCaptado30d(1);

    expect(result.valor).toBe(0);
    expect(result.variacaoPercent).toBe(0);
    expect(result.sparkline).toHaveLength(30);
    expect(result.sparkline.every((p) => p.valor === 0)).toBe(true);
  });

  it('getCaptado30d: founder com 3 investments em 3 dias distintos retorna sparkline com 3 nao-zero', async () => {
    const now = new Date();
    const d0 = new Date(now);
    const d5 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const d10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    mockPrisma.investment.groupBy.mockResolvedValue([
      { createdAt: d0, _sum: { amount: 100_00 } },
      { createdAt: d5, _sum: { amount: 200_00 } },
      { createdAt: d10, _sum: { amount: 300_00 } },
    ]);
    mockPrisma.investment.aggregate.mockResolvedValue({
      _sum: { amount: null },
    });

    const result = await service.getCaptado30d(1);

    expect(result.sparkline).toHaveLength(30);
    const nonZero = result.sparkline.filter((p) => p.valor > 0);
    expect(nonZero.length).toBeGreaterThanOrEqual(3);
  });

  it('getCaptado30d: valor e soma dos pontos do sparkline', async () => {
    const now = new Date();
    const d0 = new Date(now);
    mockPrisma.investment.groupBy.mockResolvedValue([
      { createdAt: d0, _sum: { amount: 500_00 } },
    ]);
    mockPrisma.investment.aggregate.mockResolvedValue({
      _sum: { amount: 100_00 },
    });

    const result = await service.getCaptado30d(1);

    expect(result.valor).toBe(500_00);
    expect(result.variacaoPercent).toBe(400); // (500-100)/100 * 100
  });

  // ---- getInvestidoresUnicos ----
  // distinct: ['userId'] faz Prisma retornar apenas o campo userId (nao o registro completo)

  it('getInvestidoresUnicos: 5 investments do mesmo user retorna 1 (distinct)', async () => {
    // Prisma com distinct retorna [{userId: 10}] - array de 1 elemento
    mockPrisma.investment.findMany.mockResolvedValue([{ userId: 10 }]);

    const result = await service.getInvestidoresUnicos(1);

    expect(result).toBe(1);
  });

  it('getInvestidoresUnicos: 5 investments de 3 users distintos retorna 3 (distinct)', async () => {
    // distinct retorna 3 registros, um por userId unico
    mockPrisma.investment.findMany.mockResolvedValue([
      { userId: 10 },
      { userId: 20 },
      { userId: 30 },
    ]);

    const result = await service.getInvestidoresUnicos(1);

    expect(result).toBe(3);
  });

  it('getInvestidoresUnicos: retorna tipo number (LGPD)', async () => {
    mockPrisma.investment.findMany.mockResolvedValue([{ userId: 1 }]);

    const result = await service.getInvestidoresUnicos(1);

    expect(typeof result).toBe('number');
    expect(Array.isArray(result)).toBe(false);
  });

  // ---- getProgressoMedio ----

  it('getProgressoMedio: 0 se sem campanhas OPEN', async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([]);

    const result = await service.getProgressoMedio(1);

    expect(result).toBe(0);
  });

  it('getProgressoMedio: 50 se 2 campanhas com tokensSold/totalTokens = 0.5 cada', async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([
      { tokensSold: 50, totalTokens: 100 },
      { tokensSold: 500, totalTokens: 1000 },
    ]);

    const result = await service.getProgressoMedio(1);

    // (50/100 + 500/1000) / 2 = (0.5 + 0.5) / 2 = 0.5 = 50%
    expect(result).toBe(50);
  });

  it('getProgressoMedio: 0 se totalTokens e 0', async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([
      { tokensSold: 50, totalTokens: 0 },
    ]);

    const result = await service.getProgressoMedio(1);

    expect(result).toBe(0);
  });

  // ---- getRestantes ----

  it('getRestantes: null/null se sem campanha OPEN com deadline futuro', async () => {
    mockPrisma.campaign.findFirst.mockResolvedValue(null);

    const result = await service.getRestantes(1);

    expect(result.diasAteProximoFechamento).toBeNull();
    expect(result.dataFechamentoMaisProxima).toBeNull();
  });

  it('getRestantes: diasAteProximoFechamento > 0 e dataFechamentoMaisProxima ISO se ha campanha', async () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    mockPrisma.campaign.findFirst.mockResolvedValue({
      deadline: futureDate,
    });

    const result = await service.getRestantes(1);

    expect(result.diasAteProximoFechamento).toBeGreaterThanOrEqual(4);
    expect(result.dataFechamentoMaisProxima).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // ---- getCampanhasCount ----

  it('getCampanhasCount: 2 abertas de 5 total retorna {abertas:2, total:5}', async () => {
    mockPrisma.campaign.count
      .mockResolvedValueOnce(2) // abertas
      .mockResolvedValueOnce(5); // total

    const result = await service.getCampanhasCount(1);

    expect(result).toEqual({ abertas: 2, total: 5 });
  });

  // ---- buildSummary ----

  it('buildSummary: retorna objeto com 5 chaves', async () => {
    mockPrisma.investment.groupBy.mockResolvedValue([]);
    mockPrisma.investment.aggregate.mockResolvedValue({
      _sum: { amount: null },
    });
    mockPrisma.investment.findMany.mockResolvedValue([]);
    mockPrisma.campaign.findMany.mockResolvedValue([]);
    mockPrisma.campaign.findFirst.mockResolvedValue(null);
    mockPrisma.campaign.count.mockResolvedValue(0);

    const result = await service.buildSummary(1);

    expect(result).toHaveProperty('captado30d');
    expect(result).toHaveProperty('investidoresUnicos');
    expect(result).toHaveProperty('progressoMedio');
    expect(result).toHaveProperty('restantes');
    expect(result).toHaveProperty('campanhas');
  });
});
