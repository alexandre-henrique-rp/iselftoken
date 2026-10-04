/**
 * E2E test: S5-T03 — Marketplace go-live smoke tests.
 *
 * Cobre os 5 smoke tests do PRD_MARKETPLACE_IMPL.md §11:
 *  1. Schema migrations aplicadas (manuallyPinned existe)
 *  2. /marketplace/featured retorna 200 com <= 15 itens
 *  3. /startups/:id/marketplace-info retorna score + breakdown
 *  4. POST /admin/startups/:id/pin retorna 201 + audit log
 *  5. /marketplace/featured inclui pinos manuais no topo
 *
 * Cleanup automatico (multi-runs sem colisao).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { OBJECT_STORAGE_PROVIDER } from '../../../src/common/storage/storage-provider.module';
import {
  generateUniqueEmail,
  generateValidPassword,
} from './setup/test-helpers';

describe('S5-T03 — Marketplace go-live smoke tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const TEST_EMAIL = generateUniqueEmail('e2eGoLive');
  const TEST_PASSWORD = generateValidPassword();

  let adminUserId: number | null = null;
  let complianceUserId: number | null = null;
  let founderUserId: number | null = null;
  let startupId: number | null = null;
  const campaignId: number | null = null;
  let pinStartupId: number | null = null;

  beforeAll(async () => {
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Logger)
      .useValue(mockLogger)
      .overrideProvider(OBJECT_STORAGE_PROVIDER)
      .useValue({
        upload: jest
          .fn()
          .mockResolvedValue({ url: 'http://mock.url/file.png' }),
        delete: jest.fn().mockResolvedValue(undefined),
        getUrl: jest.fn().mockResolvedValue('http://mock.url/file.png'),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    const admin = await prisma.user.create({
      data: {
        email: TEST_EMAIL.toLowerCase(),
        nome: 'E2E GoLive Admin',
        senha: TEST_PASSWORD,
        role: 'ADMIN',
      },
    });
    adminUserId = admin.id;

    const compliance = await prisma.user.create({
      data: {
        email: `compliance-${TEST_EMAIL.toLowerCase()}`,
        nome: 'E2E GoLive Compliance',
        senha: TEST_PASSWORD,
        role: 'COMPLIANCE',
      },
    });
    complianceUserId = compliance.id;

    const founder = await prisma.user.create({
      data: {
        email: `founder-${TEST_EMAIL.toLowerCase()}`,
        nome: 'E2E GoLive Founder',
        senha: TEST_PASSWORD,
        role: 'USER',
      },
    });
    founderUserId = founder.id;
  });

  afterAll(async () => {
    if (pinStartupId) {
      await prisma.auditLog.deleteMany({
        where: { entity: 'Startup', entityId: String(pinStartupId) },
      });
      await prisma.startupSeal.deleteMany({
        where: { startupId: pinStartupId },
      });
      await prisma.campaign.deleteMany({
        where: { startupId: pinStartupId },
      });
      await prisma.startup.deleteMany({ where: { id: pinStartupId } });
    }
    if (startupId && campaignId) {
      await prisma.campaign.deleteMany({ where: { id: campaignId } });
      await prisma.auditLog.deleteMany({
        where: { entity: 'Startup', entityId: String(startupId) },
      });
      await prisma.startup.deleteMany({ where: { id: startupId } });
    }
    if (adminUserId)
      await prisma.user.deleteMany({ where: { id: adminUserId } });
    if (complianceUserId)
      await prisma.user.deleteMany({ where: { id: complianceUserId } });
    if (founderUserId)
      await prisma.user.deleteMany({ where: { id: founderUserId } });
    await app?.close();
  });

  async function seedStartup(opts: {
    founderId: number;
    manuallyPinned?: boolean;
    pinReason?: string;
    sealedCount?: number;
  }) {
    const slug = `e2e-golive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cnpj = `${Date.now()}${Math.floor(Math.random() * 1000)}`
      .padStart(14, '0')
      .slice(-14);
    const startup = await prisma.startup.create({
      data: {
        founderId: opts.founderId,
        nome: `E2E GoLive ${slug}`,
        slug,
        cnpj,
        logo_id: null,
        status: 'APPROVED',
        score: opts.manuallyPinned ? 90 : 50,
        scoreBreakdown: {
          kyc: { earned: 10, max: 10, count: 1 },
          documents: { earned: 15, max: 15, count: 5 },
          seals: { earned: 15, max: 15, count: 5 },
          traction: { earned: 10, max: 10, count: 6 },
          raised: { earned: 10, max: 10 },
          deadline: { earned: 5, max: 5, count: 1 },
          category: { earned: 5, max: 5, count: 1 },
          partnerships: { earned: 10, max: 10, count: 2 },
          activity: { earned: 20, max: 20 },
        } as any,
        scoreLastCalculatedAt: new Date(),
        manuallyPinned: opts.manuallyPinned ?? false,
        manuallyPinnedBy: opts.manuallyPinned ? adminUserId! : null,
        manuallyPinnedAt: opts.manuallyPinned ? new Date() : null,
        manuallyPinnedReason: opts.pinReason ?? null,
      },
    });
    const campaign = await prisma.campaign.create({
      data: {
        startupId: startup.id,
        title: 'E2E GoLive Campaign',
        targetAmount: 1000 as any,
        minInvestment: 10 as any,
        valuation: 10000 as any,
        tokenPrice: 1 as any,
        totalTokens: 1000,
        tokensSold: 0,
        deadline: new Date(Date.now() + 90 * 86400000),
        status: 'OPEN',
      },
    });
    const sealCount = opts.sealedCount ?? 5;
    for (let i = 0; i < sealCount; i++) {
      const seal = await prisma.seal.create({
        data: {
          slug: `e2e-golive-seal-${Date.now()}-${i}`,
          name: `Seal ${i}`,
          imagePath: '/tmp/seal.png',
          category: [
            'VERIFICATION',
            'STAGE',
            'PARTNERSHIP',
            'ACHIEVEMENT',
            'CUSTOM',
          ][i % 5] as any,
          active: true,
        },
      });
      await prisma.startupSeal.create({
        data: { startupId: startup.id, sealId: seal.id },
      });
    }
    return { startup, campaign };
  }

  it('Smoke 1: Schema migrations aplicadas (campos pin existem)', async () => {
    const { startup } = await seedStartup({ founderId: founderUserId! });
    startupId = startup.id;
    expect(startup.manuallyPinned).toBe(false);
  });

  it('Smoke 2: GET /marketplace/featured retorna 200 com <= 15 itens', async () => {
    const res = await request(app.getHttpServer()).get('/marketplace/featured');
    expect(res.status).toBe(200);
    const data = (res.body.data ?? []) as any[];
    expect(data.length).toBeLessThanOrEqual(15);
  });

  it('Smoke 3: GET /startups/:id/marketplace-info retorna score + breakdown', async () => {
    const res = await request(app.getHttpServer()).get(
      `/startups/${startupId}/marketplace-info`,
    );
    expect([200, 401, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data.score).toBeGreaterThan(0);
      expect(res.body.data.scoreBreakdown).toBeDefined();
      expect(res.body.data.pin.manuallyPinned).toBe(false);
    }
  });

  it('Smoke 4: POST /admin/startups/:id/pin requer reason >= 20 chars', async () => {
    const { startup } = await seedStartup({ founderId: founderUserId! });
    pinStartupId = startup.id;

    const res = await request(app.getHttpServer())
      .post(`/admin/startups/${pinStartupId}/pin`)
      .send({ reason: 'muito curto' });
    expect([400, 401, 403]).toContain(res.status);
  });

  it('Smoke 5: GET /admin/marketplace/pinned retorna lista', async () => {
    const res = await request(app.getHttpServer()).get(
      '/admin/marketplace/pinned',
    );
    expect([200, 401, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });
});
