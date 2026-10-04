/**
 * S2-T01 — ScoreCalculatorService
 *
 * Algoritmo de score 0..100 conforme PRD_MARKETPLACE_IMPL.md §5.
 * Calcula score + breakdown de 9 chaves para uma startup:
 *   kyc (10), documents (15), seals (15), traction (10), raised (10),
 *   deadline (5), category (5), partnerships (10), activity (20) = 100 max
 *
 * Tambem persiste score + breakdown + scoreLastCalculatedAt e emite
 * evento startup.scoreUpdated.
 */

import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ScoreCalculatorService } from './score-calculator.service';
import { PrismaService } from 'src/prisma/prisma.service';

type CampaignLite = {
  status: string;
  targetAmount: number;
  tokensSold: number;
  tokenPrice: number;
  deadline: Date;
};

type Deps = {
  kycStatus?: string | null;
  documentsCount?: number;
  investmentsCount?: number;
  seals?: { seal: { active: boolean; category: string } }[];
  campaigns?: CampaignLite[];
  category?: string;
  updatedAt?: Date;
};

const silentLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
  setLogLevels: jest.fn(),
} as unknown as Logger;

describe('ScoreCalculatorService — algoritmo PRD §5 (S2-T01)', () => {
  let service: ScoreCalculatorService;
  let prisma: any;
  let events: EventEmitter2;

  beforeEach(async () => {
    prisma = {
      startup: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          founderId: 100,
          updatedAt: new Date(),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      startupDocument: { count: jest.fn().mockResolvedValue(0) },
      investment: { count: jest.fn().mockResolvedValue(0) },
      kYCProfile: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    events = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreCalculatorService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        { provide: Logger, useValue: silentLogger },
      ],
    }).compile();

    service = module.get(ScoreCalculatorService);
  });

  function setupDeps(d: Deps) {
    prisma.startupDocument.count.mockResolvedValue(d.documentsCount ?? 0);
    prisma.investment.count.mockResolvedValue(d.investmentsCount ?? 0);
    if (d.kycStatus === undefined) {
      prisma.kYCProfile.findFirst.mockResolvedValue(null);
    } else if (d.kycStatus === null) {
      prisma.kYCProfile.findFirst.mockResolvedValue(null);
    } else {
      prisma.kYCProfile.findFirst.mockResolvedValue({ status: d.kycStatus });
    }
    const activeSeals = (d.seals ?? []).filter((r) => r.seal.active);
    prisma.startup.findUnique.mockResolvedValue({
      id: 1,
      founderId: 100,
      updatedAt: d.updatedAt ?? new Date(),
      category: d.category ?? 'AI',
      campaigns: d.campaigns ?? [],
      seals: activeSeals,
    });
  }

  it('calcula score=100 para startup canonica (todos os criterios no max)', async () => {
    setupDeps({
      kycStatus: 'APPROVED',
      documentsCount: 5,
      investmentsCount: 6,
      seals: [
        { seal: { active: true, category: 'STAGE' } },
        { seal: { active: true, category: 'VERIFICATION' } },
        { seal: { active: true, category: 'PARTNERSHIP' } },
        { seal: { active: true, category: 'ACHIEVEMENT' } },
        { seal: { active: true, category: 'CUSTOM' } },
        { seal: { active: true, category: 'PARTNERSHIP' } },
      ],
      campaigns: [
        {
          status: 'OPEN',
          targetAmount: 1000,
          tokensSold: 100,
          tokenPrice: 10,
          deadline: new Date(Date.now() + 90 * 86400000),
        },
      ],
      category: 'AI',
      updatedAt: new Date(),
    });

    const { score, breakdown } = await service.calculateForStartup(1);

    expect(score).toBe(100);
    expect(breakdown.kyc.earned).toBe(10);
    expect(breakdown.documents.earned).toBe(15);
    expect(breakdown.seals.earned).toBe(15);
    expect(breakdown.traction.earned).toBe(10);
    expect(breakdown.raised.earned).toBe(10);
    expect(breakdown.deadline.earned).toBe(5);
    expect(breakdown.category.earned).toBe(5);
    expect(breakdown.partnerships.earned).toBe(10);
    expect(breakdown.activity.earned).toBe(20);
  });

  it('calcula score minimo para startup sem nada (kyc PENDING, sem docs/seals/investments)', async () => {
    setupDeps({
      kycStatus: 'PENDING',
      documentsCount: 0,
      investmentsCount: 0,
      seals: [],
      campaigns: [],
      category: 'OTHER',
      updatedAt: new Date(Date.now() - 365 * 86400000),
    });

    const { score, breakdown } = await service.calculateForStartup(1);

    expect(score).toBe(3);
    expect(breakdown.kyc.earned).toBe(0);
    expect(breakdown.activity.earned).toBe(0);
    expect(breakdown.documents.earned).toBe(0);
    expect(breakdown.seals.earned).toBe(0);
    expect(breakdown.traction.earned).toBe(0);
    expect(breakdown.partnerships.earned).toBe(0);
  });

  it('kyc APPROVED = 10 pts, PENDING = 0 pts, REJECTED = 0 pts', async () => {
    const base: Deps = {
      campaigns: [],
      updatedAt: new Date(),
      seals: [],
    };
    setupDeps({ ...base, kycStatus: 'APPROVED' });
    expect((await service.calculateForStartup(1)).breakdown.kyc.earned).toBe(
      10,
    );

    setupDeps({ ...base, kycStatus: 'PENDING' });
    expect((await service.calculateForStartup(1)).breakdown.kyc.earned).toBe(0);

    setupDeps({ ...base, kycStatus: 'REJECTED' });
    expect((await service.calculateForStartup(1)).breakdown.kyc.earned).toBe(0);
  });

  it('documents: cada doc vale 3 pts, max 15 (5 docs)', async () => {
    const base: Deps = {
      campaigns: [],
      updatedAt: new Date(),
      seals: [],
      kycStatus: 'APPROVED',
    };

    setupDeps({ ...base, documentsCount: 3 });
    expect(
      (await service.calculateForStartup(1)).breakdown.documents.earned,
    ).toBe(9);

    setupDeps({ ...base, documentsCount: 10 });
    expect(
      (await service.calculateForStartup(1)).breakdown.documents.earned,
    ).toBe(15);
  });

  it('seals: cada selo ativo vale 3 pts, max 15 (5 selos)', async () => {
    const base: Deps = {
      campaigns: [],
      updatedAt: new Date(),
      kycStatus: 'APPROVED',
    };

    setupDeps({
      ...base,
      seals: [
        { seal: { active: true, category: 'STAGE' } },
        { seal: { active: true, category: 'VERIFICATION' } },
        { seal: { active: true, category: 'PARTNERSHIP' } },
        { seal: { active: false, category: 'CUSTOM' } },
      ],
    });
    expect((await service.calculateForStartup(1)).breakdown.seals.earned).toBe(
      9,
    );
  });

  it('traction: > 5 investments = 10 pts, > 2 = 5 pts, senao 0', async () => {
    const base: Deps = {
      campaigns: [],
      updatedAt: new Date(),
      seals: [],
      kycStatus: 'APPROVED',
    };

    setupDeps({ ...base, investmentsCount: 6 });
    expect(
      (await service.calculateForStartup(1)).breakdown.traction.earned,
    ).toBe(10);

    setupDeps({ ...base, investmentsCount: 3 });
    expect(
      (await service.calculateForStartup(1)).breakdown.traction.earned,
    ).toBe(5);

    setupDeps({ ...base, investmentsCount: 2 });
    expect(
      (await service.calculateForStartup(1)).breakdown.traction.earned,
    ).toBe(0);
  });

  it('raised: captacao >= 80% da meta = 10 pts; >= 50% = 5 pts; proporcional abaixo', async () => {
    const base: Deps = {
      updatedAt: new Date(),
      seals: [],
      kycStatus: 'APPROVED',
    };

    setupDeps({
      ...base,
      campaigns: [
        {
          status: 'OPEN',
          targetAmount: 1000,
          tokensSold: 100,
          tokenPrice: 10,
          deadline: new Date(Date.now() + 60 * 86400000),
        },
      ],
    });
    expect((await service.calculateForStartup(1)).breakdown.raised.earned).toBe(
      10,
    );

    setupDeps({
      ...base,
      campaigns: [
        {
          status: 'OPEN',
          targetAmount: 1000,
          tokensSold: 50,
          tokenPrice: 10,
          deadline: new Date(Date.now() + 60 * 86400000),
        },
      ],
    });
    expect((await service.calculateForStartup(1)).breakdown.raised.earned).toBe(
      5,
    );

    setupDeps({
      ...base,
      campaigns: [
        {
          status: 'OPEN',
          targetAmount: 1000,
          tokensSold: 20,
          tokenPrice: 10,
          deadline: new Date(Date.now() + 60 * 86400000),
        },
      ],
    });
    expect((await service.calculateForStartup(1)).breakdown.raised.earned).toBe(
      2,
    );
  });

  it('deadline: > 60 dias = 5; > 30 = 3; > 7 = 1; senao 0', async () => {
    const base: Deps = {
      seals: [],
      kycStatus: 'APPROVED',
    };

    setupDeps({
      ...base,
      campaigns: [
        {
          status: 'OPEN',
          targetAmount: 0,
          tokensSold: 0,
          tokenPrice: 0,
          deadline: new Date(Date.now() + 90 * 86400000),
        },
      ],
    });
    expect(
      (await service.calculateForStartup(1)).breakdown.deadline.earned,
    ).toBe(5);

    setupDeps({
      ...base,
      campaigns: [
        {
          status: 'OPEN',
          targetAmount: 0,
          tokensSold: 0,
          tokenPrice: 0,
          deadline: new Date(Date.now() + 45 * 86400000),
        },
      ],
    });
    expect(
      (await service.calculateForStartup(1)).breakdown.deadline.earned,
    ).toBe(3);

    setupDeps({
      ...base,
      campaigns: [
        {
          status: 'OPEN',
          targetAmount: 0,
          tokensSold: 0,
          tokenPrice: 0,
          deadline: new Date(Date.now() + 15 * 86400000),
        },
      ],
    });
    expect(
      (await service.calculateForStartup(1)).breakdown.deadline.earned,
    ).toBe(1);

    setupDeps({
      ...base,
      campaigns: [
        {
          status: 'OPEN',
          targetAmount: 0,
          tokensSold: 0,
          tokenPrice: 0,
          deadline: new Date(Date.now() + 3 * 86400000),
        },
      ],
    });
    expect(
      (await service.calculateForStartup(1)).breakdown.deadline.earned,
    ).toBe(0);
  });

  it('category: AI/SAAS/FINTECH = 5 pts, outras = 3 pts', async () => {
    const base: Deps = {
      campaigns: [],
      updatedAt: new Date(),
      seals: [],
      kycStatus: 'APPROVED',
    };

    for (const cat of ['AI', 'SAAS', 'FINTECH']) {
      setupDeps({ ...base, category: cat });
      expect(
        (await service.calculateForStartup(1)).breakdown.category.earned,
      ).toBe(5);
    }

    for (const cat of ['HEALTHTECH', 'EDTECH', 'OTHER']) {
      setupDeps({ ...base, category: cat });
      expect(
        (await service.calculateForStartup(1)).breakdown.category.earned,
      ).toBe(3);
    }
  });

  it('partnerships: cada selo PARTNERSHIP ativo vale 5 pts, max 10 (2 selos)', async () => {
    const base: Deps = {
      campaigns: [],
      updatedAt: new Date(),
      kycStatus: 'APPROVED',
    };

    setupDeps({
      ...base,
      seals: [
        { seal: { active: true, category: 'PARTNERSHIP' } },
        { seal: { active: true, category: 'PARTNERSHIP' } },
        { seal: { active: true, category: 'PARTNERSHIP' } },
        { seal: { active: true, category: 'STAGE' } },
      ],
    });
    expect(
      (await service.calculateForStartup(1)).breakdown.partnerships.earned,
    ).toBe(10);
  });

  it('activity: updatedAt <= 7 dias = 20; <= 14 = 10; <= 30 = 5; senao 0', async () => {
    const base: Deps = {
      campaigns: [],
      seals: [],
      kycStatus: 'APPROVED',
    };

    setupDeps({ ...base, updatedAt: new Date() });
    expect(
      (await service.calculateForStartup(1)).breakdown.activity.earned,
    ).toBe(20);

    setupDeps({ ...base, updatedAt: new Date(Date.now() - 10 * 86400000) });
    expect(
      (await service.calculateForStartup(1)).breakdown.activity.earned,
    ).toBe(10);

    setupDeps({ ...base, updatedAt: new Date(Date.now() - 20 * 86400000) });
    expect(
      (await service.calculateForStartup(1)).breakdown.activity.earned,
    ).toBe(5);

    setupDeps({ ...base, updatedAt: new Date(Date.now() - 100 * 86400000) });
    expect(
      (await service.calculateForStartup(1)).breakdown.activity.earned,
    ).toBe(0);
  });

  it('persiste score + scoreBreakdown + scoreLastCalculatedAt via prisma.startup.update', async () => {
    setupDeps({
      kycStatus: 'APPROVED',
      documentsCount: 5,
      investmentsCount: 6,
      seals: [],
      campaigns: [],
      category: 'AI',
      updatedAt: new Date(),
    });
    prisma.startup.update.mockClear();

    await service.calculateForStartup(42);

    expect(prisma.startup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: expect.objectContaining({
          score: expect.any(Number),
          scoreBreakdown: expect.objectContaining({
            kyc: expect.any(Object),
          }),
          scoreLastCalculatedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('emite evento startup.scoreUpdated com startupId e score', async () => {
    setupDeps({
      kycStatus: 'APPROVED',
      documentsCount: 5,
      investmentsCount: 6,
      seals: [],
      campaigns: [],
      category: 'AI',
      updatedAt: new Date(),
    });
    const emitSpy = jest.spyOn(events, 'emit');

    await service.calculateForStartup(7);

    expect(emitSpy).toHaveBeenCalledWith(
      'startup.scoreUpdated',
      expect.objectContaining({ startupId: 7 }),
    );
  });
});
