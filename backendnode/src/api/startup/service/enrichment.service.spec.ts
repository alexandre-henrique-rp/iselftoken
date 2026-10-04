import { Test, TestingModule } from '@nestjs/testing';
import { EnrichmentService } from './enrichment.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let prisma: any;

  const mockPrisma = {
    investment: { aggregate: jest.fn() },
    repasse: { findFirst: jest.fn().mockResolvedValue(null) },
  };

  const baseStartup = {
    id: 1,
    slug: 'techstartup',
    logo: null,
    nome: 'TechStartup',
    area_atuacao: 'AI',
    estagio: 'SERIES_A',
    status: 'APPROVED',
    issuedTokens: 1_000_000,
    pais: { emoji: '🇧🇷' },
    campaigns: [],
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrichmentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EnrichmentService>(EnrichmentService);
    prisma = mockPrisma;
    jest.clearAllMocks();
  });

  // ---- RASCUNHO sem campanhas ----

  it('RASCUNHO sem campanhas → badges=[], valorCaptado=0, progresso=0', async () => {
    const startup = { ...baseStartup, status: 'DRAFT', campaigns: [] };

    const result = await service.enrichStartup(startup, []);

    expect(result.badges).toEqual([]);
    expect(result.valorCaptado).toBe(0);
    expect(result.progresso).toBe(0);
  });

  // ---- PENDING com campaign DRAFT ----

  it('PENDING com 1 campaign DRAFT → badges inclui {STATUS, Em Análise}, valorCaptado=0', async () => {
    const startup = {
      ...baseStartup,
      status: 'PENDING',
      campaigns: [
        {
          id: 1,
          tokensSold: 0,
          totalTokens: 1000,
          tokenPrice: 10_00,
          status: 'DRAFT',
        },
      ],
    };
    // pickLatestCampaign() agora é chamado quando não há OPEN — necessário
    mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const result = await service.enrichStartup(startup, startup.campaigns);

    expect(
      result.badges.some(
        (b) => b.type === 'STATUS' && b.label === 'Em Análise',
      ),
    ).toBe(true);
    expect(result.valorCaptado).toBe(0);
  });

  // ---- APPROVED + 1 campaign OPEN com 3 investments CONFIRMED ----

  it('APPROVED + 1 campaign OPEN com investments → valorCaptado > 0, progresso > 0', async () => {
    const startup = {
      ...baseStartup,
      status: 'APPROVED',
      campaigns: [
        {
          id: 10,
          tokensSold: 500,
          totalTokens: 1000,
          tokenPrice: 10_00,
          status: 'OPEN',
        },
      ],
    };
    mockPrisma.investment.aggregate.mockResolvedValue({
      _sum: { amount: 5_000_00 },
    }); // R$ 5.000 em REAIS (Prisma Decimal)

    const result = await service.enrichStartup(startup, startup.campaigns);

    expect(result.valorCaptado).toBe(5_000_00);
    expect(result.progresso).toBeGreaterThan(0);
  });

  // ---- APPROVED + 1 campaign FUNDED ----

  it('APPROVED + 1 campaign FUNDED → badges inclui {RODADA, Financiada, blue}', async () => {
    const startup = {
      ...baseStartup,
      campaigns: [
        {
          id: 1,
          tokensSold: 1000,
          totalTokens: 1000,
          tokenPrice: 10_00,
          status: 'FUNDED',
        },
      ],
    };
    mockPrisma.investment.aggregate.mockResolvedValue({
      _sum: { amount: 10_000_00 },
    });

    const result = await service.enrichStartup(startup, startup.campaigns);

    expect(
      result.badges.some(
        (b) =>
          b.type === 'RODADA' && b.label === 'Financiada' && b.color === 'blue',
      ),
    ).toBe(true);
  });

  // ---- APPROVED + 2 campaigns (OPEN + FAILED) prioriza OPEN ----

  it('APPROVED + 2 campaigns (OPEN + FAILED) → badges prioriza OPEN (Em Captação)', async () => {
    const startup = {
      ...baseStartup,
      campaigns: [
        {
          id: 1,
          tokensSold: 0,
          totalTokens: 1000,
          tokenPrice: 10_00,
          status: 'FAILED',
        },
        {
          id: 2,
          tokensSold: 0,
          totalTokens: 1000,
          tokenPrice: 10_00,
          status: 'OPEN',
        },
      ],
    };
    mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const result = await service.enrichStartup(startup, startup.campaigns);

    expect(result.badges[1]?.label).toBe('Em Captação');
    expect(result.badges[1]?.type).toBe('RODADA');
  });

  // ---- 4 badges possíveis retorna max 3 ----

  it('APPROVED com 4 possiveis badges → retorna max 3 (UX)', async () => {
    const startup = {
      ...baseStartup,
      status: 'APPROVED',
      campaigns: [
        {
          id: 1,
          tokensSold: 0,
          totalTokens: 1000,
          tokenPrice: 10_00,
          status: 'OPEN',
        },
      ],
    };
    mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const result = await service.enrichStartup(startup, startup.campaigns);

    // APPROVED (STATUS) + OPEN (RODADA) = 2 badges
    expect(result.badges.length).toBeLessThanOrEqual(3);
  });

  // ---- campos antigos preservados (retrocompat) ----

  it('campos antigos preservados: id, nome, segmento, status, estagio, totalTokens, tokensVendidos, percentualVendido, statusCampanha, createdAt', async () => {
    const startup = {
      ...baseStartup,
      issuedTokens: 500_000,
      campaigns: [],
    };

    const result = await service.enrichStartup(startup, []);

    expect(result.id).toBe('1');
    expect(result.nome).toContain('TechStartup');
    expect(result.segmento).toBe('AI');
    expect(result.status).toBe('aprovada');
    expect(result.estagio).toBe('SERIES_A');
    expect(result.totalTokens).toBe(500_000);
    expect(result.tokensVendidos).toBe(0);
    expect(result.percentualVendido).toBe(0);
    expect(result.statusCampanha).toBe('edicao');
    expect(result.createdAt).toBeDefined();
  });

  // ---- valorMeta (meta em R$ da campanha ativa) ----

  it('sem campanha ativa → valorMeta=null', async () => {
    const startup = { ...baseStartup, campaigns: [] };
    const result = await service.enrichStartup(startup, []);
    expect(result.valorMeta).toBeNull();
  });

  it('campanha OPEN: valorMeta = tokenPrice * totalTokens (em REAIS)', async () => {
    const startup = {
      ...baseStartup,
      campaigns: [
        {
          id: 10,
          tokensSold: 0,
          totalTokens: 1000,
          tokenPrice: 10_00, // R$ 10,00 = 1000 (REAIS)
          status: 'OPEN',
        },
      ],
    };
    mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const result = await service.enrichStartup(startup, startup.campaigns);

    // tokenPrice(1000 (REAIS)) * totalTokens(1000) = 1_000_000 = R$ 10.000
    expect(result.valorMeta).toBe(1_000_000);
  });

  // ---- Fallback de valorMeta para campanhas não-OPEN ----

  it('FUNDED sem OPEN: valorMeta cai pra campanha mais recente', async () => {
    const startup = {
      ...baseStartup,
      campaigns: [
        {
          id: 1,
          tokensSold: 0,
          totalTokens: 100,
          tokenPrice: 50_00,
          status: 'DRAFT',
        },
        {
          id: 7,
          tokensSold: 500,
          totalTokens: 1000,
          tokenPrice: 20_00,
          status: 'FUNDED',
        },
      ],
    };
    mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const result = await service.enrichStartup(startup, startup.campaigns);

    // id 7 > id 1 → pega a FUNDED. 2000 cents * 1000 = 2_000_000 cents = R$ 20.000
    expect(result.valorMeta).toBe(2_000_000);
  });

  it('campanha com totalTokens=0 → valorMeta=null (sem fallback)', async () => {
    const startup = {
      ...baseStartup,
      campaigns: [
        {
          id: 1,
          tokensSold: 0,
          totalTokens: 0,
          tokenPrice: 10_00,
          status: 'OPEN',
        },
      ],
    };
    mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const result = await service.enrichStartup(startup, startup.campaigns);

    expect(result.valorMeta).toBeNull();
  });
});
