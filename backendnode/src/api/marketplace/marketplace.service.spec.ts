/**
 * S0-T01 — Regra de Rodadas em Destaque / Rodadas Quentes (marketplace.md)
 *
 * Cobre os 5 criterios da regra:
 *  1. Max 15 itens
 *  2. Apenas startups com captacao ativa (campaign OPEN)
 *  3. Apenas startups com > 4 selos ativos
 *  4. Startups com score > 98 vem ANTES das com score entre 85 e 98
 *  5. Startups com score > 85 tem ordem aleatoria ESTAVEL (mesmo seed = mesma ordem)
 *
 * Referencias:
 *  - scripts/marketplace/marketplace.md §Rodadas em Destaque / Rodadas Quentes
 *  - scripts/marketplace/sprints.json :: MKT-S0-T01
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';

type StartupFixture = {
  id: number;
  slug: string;
  nome: string;
  score: number;
  sealCount: number;
  hasOpenCampaign: boolean;
};

function buildStartupRow(s: StartupFixture) {
  return {
    id: s.id,
    slug: s.slug,
    nome: s.nome,
    descricao: 'desc',
    score: s.score,
    logo_id: 1,
    category: 'SAAS',
    area_atuacao: 'SaaS',
    campaigns: s.hasOpenCampaign
      ? [
          {
            id: s.id * 10,
            status: 'OPEN',
            deadline: new Date(),
            tokensSold: 0,
            totalTokens: 100,
            tokenPrice: 1,
            targetAmount: 1000,
            valuation: 10000,
          },
        ]
      : [],
    seals: Array.from({ length: s.sealCount }).map((_, i) => ({
      seal: {
        id: i + 1,
        slug: `s${i}`,
        name: `Seal ${i}`,
        imagePath: '',
        category: 'CUSTOM',
        active: true,
      },
    })),
    logo: { url: 'http://x/logo.png' },
    cover: null,
  };
}

function buildStartupRows(seed: StartupFixture[]): any[] {
  return seed.map(buildStartupRow);
}

const silentLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
  setLogLevels: jest.fn(),
} as unknown as Logger;

describe('MarketplaceService.getFeatured — regras marketplace.md (S0-T01)', () => {
  let service: MarketplaceService;
  let prisma: {
    startup: { findMany: jest.Mock; count: jest.Mock; groupBy: jest.Mock };
    financeConfig: { findUnique: jest.Mock };
    investment: { findMany: jest.Mock };
  };
  let s3: { getPresignedImageUrl: jest.Mock };

  beforeEach(async () => {
    prisma = {
      startup: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      financeConfig: {
        findUnique: jest.fn().mockResolvedValue({ value: '100' }),
      },
      investment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    s3 = {
      getPresignedImageUrl: jest.fn().mockResolvedValue('http://x/img.png'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
        { provide: Logger, useValue: silentLogger },
      ],
    }).compile();

    service = module.get(MarketplaceService);
  });

  it('retorna no maximo 15 startups mesmo quando ha mais elegiveis', async () => {
    const rows = buildStartupRows(
      Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        slug: `s-${i}`,
        nome: `Startup ${i}`,
        score: 50 + i,
        sealCount: 6,
        hasOpenCampaign: true,
      })),
    );
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getFeatured();
    const data = (result as any).data as any[];

    expect(data.length).toBeLessThanOrEqual(15);
  });

  it('inclui apenas startups com captacao ativa (campaign OPEN)', async () => {
    const rows = buildStartupRows([
      {
        id: 1,
        slug: 'open-1',
        nome: 'A',
        score: 90,
        sealCount: 6,
        hasOpenCampaign: true,
      },
      {
        id: 2,
        slug: 'open-2',
        nome: 'B',
        score: 80,
        sealCount: 6,
        hasOpenCampaign: false,
      },
      {
        id: 3,
        slug: 'open-3',
        nome: 'C',
        score: 70,
        sealCount: 6,
        hasOpenCampaign: true,
      },
    ]);
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getFeatured();
    const data = (result as any).data as any[];

    const slugs = data.map((d) => d.slug).sort();
    expect(slugs).toEqual(['open-1', 'open-3']);
  });

  it('inclui apenas startups com mais de 4 selos ativos', async () => {
    const rows = buildStartupRows([
      {
        id: 1,
        slug: 'rich',
        nome: 'A',
        score: 90,
        sealCount: 8,
        hasOpenCampaign: true,
      },
      {
        id: 2,
        slug: 'min',
        nome: 'B',
        score: 80,
        sealCount: 4,
        hasOpenCampaign: true,
      },
      {
        id: 3,
        slug: 'poor',
        nome: 'C',
        score: 70,
        sealCount: 2,
        hasOpenCampaign: true,
      },
    ]);
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getFeatured();
    const data = (result as any).data as any[];

    const slugs = data.map((d) => d.slug).sort();
    expect(slugs).toEqual(['rich']);
  });

  it('coloca score > 98 ANTES de score 85-98 (bloco de elite)', async () => {
    const rows = buildStartupRows([
      {
        id: 1,
        slug: 'high',
        nome: 'A',
        score: 99,
        sealCount: 6,
        hasOpenCampaign: true,
      },
      {
        id: 2,
        slug: 'mid',
        nome: 'B',
        score: 92,
        sealCount: 6,
        hasOpenCampaign: true,
      },
      {
        id: 3,
        slug: 'low',
        nome: 'C',
        score: 86,
        sealCount: 6,
        hasOpenCampaign: true,
      },
    ]);
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getFeatured();
    const data = (result as any).data as any[];

    expect(data[0].slug).toBe('high');
    expect(data.map((d) => d.slug).slice(0, 1)).toEqual(['high']);
  });

  it('mantem ordem aleatoria ESTAVEL para score > 85 (mesmo seed diario)', async () => {
    const rows = buildStartupRows([
      {
        id: 1,
        slug: 's1',
        nome: 'A',
        score: 90,
        sealCount: 6,
        hasOpenCampaign: true,
      },
      {
        id: 2,
        slug: 's2',
        nome: 'B',
        score: 89,
        sealCount: 6,
        hasOpenCampaign: true,
      },
      {
        id: 3,
        slug: 's3',
        nome: 'C',
        score: 88,
        sealCount: 6,
        hasOpenCampaign: true,
      },
      {
        id: 4,
        slug: 's4',
        nome: 'D',
        score: 87,
        sealCount: 6,
        hasOpenCampaign: true,
      },
      {
        id: 5,
        slug: 's5',
        nome: 'E',
        score: 86,
        sealCount: 6,
        hasOpenCampaign: true,
      },
    ]);

    prisma.startup.findMany.mockResolvedValueOnce(rows);
    const first = await service.getFeatured();
    const firstOrder = (first as any).data.map((d: any) => d.slug);

    prisma.startup.findMany.mockResolvedValueOnce(rows);
    const second = await service.getFeatured();
    const secondOrder = (second as any).data.map((d: any) => d.slug);

    expect(firstOrder).toEqual(secondOrder);
    expect(firstOrder).toEqual(
      expect.arrayContaining(['s1', 's2', 's3', 's4', 's5']),
    );
  });
});

type CampaignFixture = {
  status: 'OPEN' | 'CLOSED' | 'FUNDED' | 'FAILED' | 'DRAFT';
  createdAt: Date;
};

type RecentStartupFixture = {
  id: number;
  slug: string;
  nome: string;
  score: number;
  sealCount: number;
  campaigns: CampaignFixture[];
};

function buildRecentRow(s: RecentStartupFixture) {
  return {
    id: s.id,
    slug: s.slug,
    nome: s.nome,
    descricao: 'desc',
    score: s.score,
    logo_id: 1,
    category: 'SAAS',
    area_atuacao: 'SaaS',
    campaigns: s.campaigns.map((c) => ({
      id: s.id * 100,
      status: c.status,
      deadline: new Date(Date.now() + 30 * 86400000),
      createdAt: c.createdAt,
      tokensSold: 0,
      totalTokens: 100,
      tokenPrice: 1,
      targetAmount: 1000,
      valuation: 10000,
    })),
    seals: Array.from({ length: s.sealCount }).map((_, i) => ({
      seal: {
        id: i + 1,
        slug: `s${i}`,
        name: `Seal ${i}`,
        imagePath: '',
        category: 'CUSTOM',
        active: true,
      },
    })),
    logo: { url: 'http://x/logo.png' },
    cover: null,
  };
}

const NOW = new Date('2026-09-22T12:00:00Z').getTime();
const DAY_MS = 86400000;

describe('MarketplaceService.getRecentlyAdded — regras marketplace.md (S0-T02)', () => {
  let service: MarketplaceService;
  let prisma: any;
  let s3: any;

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    prisma = {
      startup: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      financeConfig: {
        findUnique: jest.fn().mockResolvedValue({ value: '100' }),
      },
      investment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    s3 = {
      getPresignedImageUrl: jest.fn().mockResolvedValue('http://x/img.png'),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
        { provide: Logger, useValue: silentLogger },
      ],
    }).compile();
    service = module.get(MarketplaceService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna no maximo 15 startups mesmo quando ha mais elegiveis', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      buildRecentRow({
        id: i + 1,
        slug: `r-${i}`,
        nome: `R ${i}`,
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 5 * DAY_MS) }],
      }),
    );
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getRecentlyAdded();
    const data = (result as any).data as any[];

    expect(data.length).toBeLessThanOrEqual(15);
  });

  it('inclui apenas startups com campanha OPEN criada ha menos de 20 dias', async () => {
    const rows = [
      buildRecentRow({
        id: 1,
        slug: 'recent-open',
        nome: 'A',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 5 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 2,
        slug: 'old-open',
        nome: 'B',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 25 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 3,
        slug: 'recent-closed',
        nome: 'C',
        score: 80,
        sealCount: 5,
        campaigns: [
          { status: 'CLOSED', createdAt: new Date(NOW - 2 * DAY_MS) },
        ],
      }),
    ];
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getRecentlyAdded();
    const data = (result as any).data as any[];

    const slugs = data.map((d) => d.slug).sort();
    expect(slugs).toEqual(['recent-open']);
  });

  it('ordena por quantidade de selos ativos DESC, createdAt DESC como tiebreaker', async () => {
    const rows = [
      buildRecentRow({
        id: 1,
        slug: 'low-seals',
        nome: 'A',
        score: 80,
        sealCount: 3,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 1 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 2,
        slug: 'high-seals',
        nome: 'B',
        score: 80,
        sealCount: 8,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 10 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 3,
        slug: 'mid-seals',
        nome: 'C',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 2 * DAY_MS) }],
      }),
    ];
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getRecentlyAdded();
    const data = (result as any).data as any[];

    expect(data.map((d) => d.slug)).toEqual([
      'high-seals',
      'mid-seals',
      'low-seals',
    ]);
  });
});

describe('MarketplaceService.getEarlyAccessStartups — mesmo conjunto com rank (S0-T02)', () => {
  let service: MarketplaceService;
  let prisma: any;
  let s3: any;

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    prisma = {
      startup: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      financeConfig: {
        findUnique: jest.fn().mockResolvedValue({ value: '100' }),
      },
      investment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    s3 = {
      getPresignedImageUrl: jest.fn().mockResolvedValue('http://x/img.png'),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
        { provide: Logger, useValue: silentLogger },
      ],
    }).compile();
    service = module.get(MarketplaceService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna o mesmo conjunto de getRecentlyAdded com campo rank incremental', async () => {
    const rows = [
      buildRecentRow({
        id: 1,
        slug: 'top',
        nome: 'Top',
        score: 90,
        sealCount: 8,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 2 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 2,
        slug: 'mid',
        nome: 'Mid',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 5 * DAY_MS) }],
      }),
    ];
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getEarlyAccessStartups();
    const data = (result as any).data as any[];

    expect(data).toHaveLength(2);
    expect(data[0].rank).toBe(1);
    expect(data[1].rank).toBe(2);
    expect(data[0].slug).toBe('top');
    expect(data[1].slug).toBe('mid');
  });
});

describe('MarketplaceService.getPicksOfWeek — regras marketplace.md (S0-T03)', () => {
  let service: MarketplaceService;
  let prisma: any;
  let s3: any;

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    prisma = {
      startup: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      financeConfig: {
        findUnique: jest.fn().mockResolvedValue({ value: '100' }),
      },
      investment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    s3 = {
      getPresignedImageUrl: jest.fn().mockResolvedValue('http://x/img.png'),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
        { provide: Logger, useValue: silentLogger },
      ],
    }).compile();
    service = module.get(MarketplaceService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna no maximo 15 startups mesmo quando ha mais elegiveis', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      buildRecentRow({
        id: i + 1,
        slug: `p-${i}`,
        nome: `P ${i}`,
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 1 * DAY_MS) }],
      }),
    );
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getPicksOfWeek();
    const data = (result as any).data as any[];

    expect(data.length).toBeLessThanOrEqual(15);
  });

  it('inclui apenas startups com campanha OPEN criada nos ultimos 7 dias', async () => {
    const rows = [
      buildRecentRow({
        id: 1,
        slug: 'fresh',
        nome: 'A',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 1 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 2,
        slug: 'edge',
        nome: 'B',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 6 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 3,
        slug: 'too-old',
        nome: 'C',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 8 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 4,
        slug: 'closed',
        nome: 'D',
        score: 80,
        sealCount: 5,
        campaigns: [
          { status: 'CLOSED', createdAt: new Date(NOW - 2 * DAY_MS) },
        ],
      }),
    ];
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getPicksOfWeek();
    const data = (result as any).data as any[];

    const slugs = data.map((d) => d.slug).sort();
    expect(slugs).toEqual(['edge', 'fresh']);
  });

  it('ordena por campaigns.createdAt ASC (captacao mais antiga primeiro)', async () => {
    const rows = [
      buildRecentRow({
        id: 1,
        slug: 'newest',
        nome: 'A',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 1 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 2,
        slug: 'oldest',
        nome: 'B',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 6 * DAY_MS) }],
      }),
      buildRecentRow({
        id: 3,
        slug: 'middle',
        nome: 'C',
        score: 80,
        sealCount: 5,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 3 * DAY_MS) }],
      }),
    ];
    prisma.startup.findMany.mockResolvedValue(rows);

    const result = await service.getPicksOfWeek();
    const data = (result as any).data as any[];

    expect(data.map((d) => d.slug)).toEqual(['oldest', 'middle', 'newest']);
  });
});

describe('MarketplaceService — cap de 15 em todas as secoes (S0-T04)', () => {
  let service: MarketplaceService;
  let prisma: any;
  let s3: any;

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    prisma = {
      startup: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      financeConfig: {
        findUnique: jest.fn().mockResolvedValue({ value: '50' }),
      },
      investment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    s3 = {
      getPresignedImageUrl: jest.fn().mockResolvedValue('http://x/img.png'),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
        { provide: Logger, useValue: silentLogger },
      ],
    }).compile();
    service = module.get(MarketplaceService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function manyRecentRows(count: number, prefix: string): any[] {
    return Array.from({ length: count }, (_, i) =>
      buildRecentRow({
        id: i + 1,
        slug: `${prefix}-${i}`,
        nome: `${prefix} ${i}`,
        score: 80,
        sealCount: 6,
        campaigns: [{ status: 'OPEN', createdAt: new Date(NOW - 3 * DAY_MS) }],
      }),
    );
  }

  function manyFeaturedRows(count: number, prefix: string): any[] {
    return Array.from({ length: count }, (_, i) =>
      buildStartupRow({
        id: i + 1,
        slug: `${prefix}-${i}`,
        nome: `${prefix} ${i}`,
        score: 80,
        sealCount: 6,
        hasOpenCampaign: true,
      }),
    );
  }

  it('getFeatured: FinanceConfig=50 produz saida limitada a 15', async () => {
    prisma.startup.findMany.mockResolvedValue(manyFeaturedRows(50, 'feat'));

    const result = await service.getFeatured();
    const data = (result as any).data as any[];

    expect(data.length).toBe(15);
  });

  it('getRecentlyAdded: FinanceConfig=50 produz saida limitada a 15', async () => {
    prisma.startup.findMany.mockResolvedValue(manyRecentRows(50, 'rec'));

    const result = await service.getRecentlyAdded();
    const data = (result as any).data as any[];

    expect(data.length).toBe(15);
  });

  it('getPicksOfWeek: FinanceConfig=50 produz saida limitada a 15', async () => {
    prisma.startup.findMany.mockResolvedValue(manyRecentRows(50, 'picks'));

    const result = await service.getPicksOfWeek();
    const data = (result as any).data as any[];

    expect(data.length).toBe(15);
  });

  it('getOpportunities: FinanceConfig=50 produz saida limitada a 15', async () => {
    prisma.startup.findMany.mockResolvedValue(manyFeaturedRows(50, 'opp'));

    const result = await service.getOpportunities();
    const data = (result as any).data as any[];

    expect(data.length).toBe(15);
  });
});
