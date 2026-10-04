/**
 * E2E test: S1 — Migration add_marketplace_pinning_score
 *
 * Valida que apos a migration, o schema Startup expoe:
 *  - manuallyPinned (Boolean)
 *  - manuallyPinnedBy (Int?)
 *  - manuallyPinnedAt (DateTime?)
 *  - manuallyPinnedReason (String?)
 *  - scoreLastCalculatedAt (DateTime?)
 *  - scoreBreakdown (Json?)
 *
 * E que e possivel persistir e ler esses campos (round-trip).
 *
 * Cleanup automatico (multi-runs sem colisao).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { EmailService } from '../../../src/email/email.service';
import { OBJECT_STORAGE_PROVIDER } from '../../../src/common/storage/storage-provider.module';
import {
  generateUniqueEmail,
  generateValidPassword,
} from './setup/test-helpers';

describe('S1 — Migration add_marketplace_pinning_score', () => {
  let app: any;
  let prisma: PrismaService;

  const TEST_EMAIL = generateUniqueEmail('e2eS1');
  const TEST_PASSWORD = generateValidPassword();

  let adminUserId: number;
  let startupId: number;

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
      .overrideProvider(EmailService)
      .useValue({
        sendMail: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const admin = await prisma.user.create({
      data: {
        email: TEST_EMAIL.toLowerCase(),
        nome: 'E2E S1 Admin',
        senha: 'hashed-password',
        role: 'ADMIN',
      },
    });
    adminUserId = admin.id;
  });

  afterAll(async () => {
    if (startupId) {
      await prisma.startup.deleteMany({
        where: { id: startupId },
      });
    }
    if (adminUserId) {
      await prisma.user.deleteMany({ where: { id: adminUserId } });
    }
    await app?.close();
  });

  it('aceita manualmentePinned + manualmentePinnedBy + manualmentePinnedReason (pinning manual)', async () => {
    const uniqueSlug = `e2e-s1-pin-${Date.now()}`;
    const uniqueCnpj = `${Date.now()}`.padStart(14, '0').slice(-14);

    const created = await prisma.startup.create({
      data: {
        nome: 'S1 Pin Test',
        slug: uniqueSlug,
        cnpj: uniqueCnpj,
        founderId: adminUserId,
        manuallyPinned: true,
        manuallyPinnedBy: adminUserId,
        manuallyPinnedAt: new Date(),
        manuallyPinnedReason: 'S1 e2e test: pinning manual ativo',
      },
    });
    startupId = created.id;

    const reloaded = await prisma.startup.findUnique({
      where: { id: created.id },
    });

    expect(reloaded?.manuallyPinned).toBe(true);
    expect(reloaded?.manuallyPinnedBy).toBe(adminUserId);
    expect(reloaded?.manuallyPinnedAt).toBeInstanceOf(Date);
    expect(reloaded?.manuallyPinnedReason).toBe(
      'S1 e2e test: pinning manual ativo',
    );
  });

  it('aceita scoreBreakdown (JSON) + scoreLastCalculatedAt (cache de score)', async () => {
    const uniqueSlug = `e2e-s1-score-${Date.now()}`;
    const uniqueCnpj = `${Date.now() + 1}`.padStart(14, '0').slice(-14);

    const breakdown = {
      kyc: { earned: 10, max: 10, count: 1 },
      documents: { earned: 8, max: 15, count: 3 },
      seals: { earned: 12, max: 15, count: 5 },
      traction: { earned: 5, max: 10, count: 1 },
      raised: { earned: 3, max: 10, count: 0 },
      deadline: { earned: 5, max: 5, count: 1 },
      category: { earned: 5, max: 5, count: 1 },
      partnerships: { earned: 2, max: 10, count: 1 },
      activity: { earned: 5, max: 20, count: 12 },
    };

    const created = await prisma.startup.create({
      data: {
        nome: 'S1 Score Test',
        slug: uniqueSlug,
        cnpj: uniqueCnpj,
        founderId: adminUserId,
        score: 55,
        scoreBreakdown: breakdown as any,
        scoreLastCalculatedAt: new Date(),
      },
    });

    try {
      const reloaded = await prisma.startup.findUnique({
        where: { id: created.id },
      });

      expect(reloaded?.score).toBe(55);
      expect(reloaded?.scoreLastCalculatedAt).toBeInstanceOf(Date);
      const reloadedBreakdown = reloaded?.scoreBreakdown as any;
      expect(reloadedBreakdown?.kyc?.earned).toBe(10);
      expect(reloadedBreakdown?.seals?.count).toBe(5);
      expect(reloadedBreakdown?.activity?.earned).toBe(5);
    } finally {
      await prisma.startup.deleteMany({ where: { id: created.id } });
    }
  });

  it('default: manualmentePinned=false quando nao setado (backward compat)', async () => {
    const uniqueSlug = `e2e-s1-default-${Date.now()}`;
    const uniqueCnpj = `${Date.now() + 2}`.padStart(14, '0').slice(-14);

    const created = await prisma.startup.create({
      data: {
        nome: 'S1 Default Test',
        slug: uniqueSlug,
        cnpj: uniqueCnpj,
        founderId: adminUserId,
      },
    });

    try {
      const reloaded = await prisma.startup.findUnique({
        where: { id: created.id },
      });

      expect(reloaded?.manuallyPinned).toBe(false);
      expect(reloaded?.manuallyPinnedBy).toBeNull();
      expect(reloaded?.manuallyPinnedAt).toBeNull();
      expect(reloaded?.manuallyPinnedReason).toBeNull();
      expect(reloaded?.scoreBreakdown).toBeNull();
      expect(reloaded?.scoreLastCalculatedAt).toBeNull();
    } finally {
      await prisma.startup.deleteMany({ where: { id: created.id } });
    }
  });
});
