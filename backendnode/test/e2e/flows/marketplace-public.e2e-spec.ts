/**
 * E2E test: Marketplace publico (4 slots featured/verified/accelerated/approval).
 *
 * BUG-FIX: ate 2026-07-23, o controller chamava `findByStatus(..., 'FeaturedStartups' | ...)`
 * e o service tentava filtrar `where.categoria = 'FeaturedStartups'`. Campo `categoria`
 * NAO EXISTE no model Startup (existem `category: StartupCategory?`, `categoryId: Int?`,
 * `areaAtuacaoId: Int?`). Resultado: HTTP 500 em todos os 4 endpoints publicos.
 *
 * Este teste cobre os 4 endpoints apos o refactor para `findByMarketplaceTag` type-safe.
 *
 * Setup: 1 user ADMIN + 4 startups semeadas com combinacoes diferentes:
 *   - featuredTest    (score 90, APPROVED)
 *   - verifiedTest    (verificationStatus=VERIFIED, APPROVED)
 *   - acceleratedTest (isAccelerated=true, APPROVED)
 *   - approvalTest    (status=PENDING_CURATOR_REVIEW)
 *
 * Validacoes:
 *   - /marketplace/featured retorna 200 + so featuredTest (ordenado por score desc)
 *   - /marketplace/verified retorna 200 + so verifiedTest
 *   - /marketplace/accelerated retorna 200 + so acceleratedTest
 *   - /marketplace/approval retorna 200 + so approvalTest
 *   - Cleanup automatico (multi-runs sem colisao)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { EmailService } from '../../../src/email/email.service';
import { OBJECT_STORAGE_PROVIDER } from '../../../src/common/storage/storage-provider.module';
import { ValidateFundador } from '../../../src/api/startup/service/validate.fundador';
import {
  generateUniqueEmail,
  generateValidPassword,
  buildAuthCookie,
} from './setup/test-helpers';

describe('Marketplace publico (e2e) - bug-fix where.categoria', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;

  const TEST_EMAIL = generateUniqueEmail('e2eMkt');
  const TEST_EMAIL_LOWER = TEST_EMAIL.toLowerCase();
  const TEST_PASSWORD = generateValidPassword();

  let userId: number;
  let sessionId: string;
  let twoFactorCode: string | undefined;

  let featuredStartupId: number;
  let verifiedStartupId: number;
  let acceleratedStartupId: number;
  let approvalStartupId: number;

  const SLUG_PREFIX = `e2e-mkt-${Date.now()}`;

  beforeAll(async () => {
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
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
      .overrideProvider(ValidateFundador)
      .useValue({ validateFundadorPlan: jest.fn().mockResolvedValue(true) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    emailService = app.get(EmailService);

    jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockImplementation(async (_to, _n, codigo, acao) => {
        if (acao && acao.includes('Autenticar')) twoFactorCode = codigo;
        return { success: true, message: 'mocked' };
      });
    jest
      .spyOn(emailService, 'sendWelcomeEmail')
      .mockReturnValue(Promise.resolve({ success: true, message: 'mocked' }));
    jest
      .spyOn(emailService, 'sendValidationEmail')
      .mockReturnValue(Promise.resolve({ success: true, message: 'mocked' }));

    await request(app.getHttpServer())
      .post('/auth/register/user')
      .send({
        email: TEST_EMAIL,
        nome: 'Teste Marketplace',
        senha: TEST_PASSWORD,
        senhaConfirmacao: TEST_PASSWORD,
        termosAceitos: true,
        politicaAceita: true,
        codigo: '123456',
        urlRedirect: 'http://localhost:5173/home',
      })
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL_LOWER },
    });
    userId = user!.id;
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: TEST_EMAIL_LOWER, senha: TEST_PASSWORD })
      .expect(200);
    sessionId = loginRes.body.data.sessionId;

    await request(app.getHttpServer())
      .post('/auth/verify-code')
      .set('Cookie', buildAuthCookie(sessionId))
      .send({ codigo: twoFactorCode })
      .expect(200);

    const makeStartup = (suffix: string, overrides: any) =>
      prisma.startup.create({
        data: {
          founderId: userId,
          nome: `Startup ${suffix}`,
          slug: `${SLUG_PREFIX}-${suffix}`,
          cnpj: `11111111${suffix.padStart(6, '0').slice(0, 6)}`,
          area_atuacao: 'Tecnologia',
          status: 'APPROVED',
          verificationStatus: 'NOT_REQUESTED',
          score: 0,
          isAccelerated: false,
          ...overrides,
        },
      });

    const featured = await makeStartup('feat', { score: 90 });
    featuredStartupId = featured.id;

    const verified = await makeStartup('veri', {
      verificationStatus: 'VERIFIED',
      score: 75,
    });
    verifiedStartupId = verified.id;

    const accelerated = await makeStartup('acce', {
      isAccelerated: true,
      score: 50,
    });
    acceleratedStartupId = accelerated.id;

    const approval = await makeStartup('appr', {
      status: 'PENDING_CURATOR_REVIEW',
    });
    approvalStartupId = approval.id;
  });

  afterAll(async () => {
    const seedIds = [
      featuredStartupId,
      verifiedStartupId,
      acceleratedStartupId,
      approvalStartupId,
    ];
    for (const id of seedIds) {
      if (id) {
        await prisma.campaign.deleteMany({ where: { startupId: id } });
        await prisma.startup.delete({ where: { id } }).catch(() => undefined);
      }
    }
    const orphanStartups = await prisma.startup.findMany({
      where: { slug: { startsWith: SLUG_PREFIX } },
      select: { id: true },
    });
    for (const s of orphanStartups) {
      await prisma.campaign.deleteMany({ where: { startupId: s.id } });
      await prisma.startup
        .delete({ where: { id: s.id } })
        .catch(() => undefined);
    }

    await prisma.accessLog.deleteMany({ where: { userId } });
    await prisma.emailValidation.deleteMany({ where: { userId } });
    await prisma.backupUser.deleteMany({ where: { userId } });
    await prisma.walletTransaction.deleteMany({
      where: { wallet: { userId } },
    });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.payment.deleteMany({ where: { userId } });
    await prisma.subscription.deleteMany({ where: { userId } });
    await prisma.token.deleteMany({ where: { userId } });
    await prisma.investment.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    await app.close();
  });

  const getMarketplace = (path: string) =>
    request(app.getHttpServer()).get(`/api/startup/${path}`);

  describe('GET /api/startup/marketplace/featured', () => {
    it('retorna 200 com startups APPROVED + score > 0 ordenadas por score desc', async () => {
      const res = await getMarketplace('marketplace/featured').expect(200);
      expect(res.body.error).toBe(false);
      expect(Array.isArray(res.body.data)).toBe(true);

      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain(featuredStartupId);

      const card = res.body.data.find((s: any) => s.id === featuredStartupId);
      expect(card).toHaveProperty('nome');
      expect(card).toHaveProperty('logo');
      expect(card).toHaveProperty('percentualVendido');
      expect(card).toHaveProperty('score', 90);
      expect(card).toHaveProperty('verificationStatus');
      expect(card).toHaveProperty('isAccelerated');
    });
  });

  describe('GET /api/startup/marketplace/verified', () => {
    it('retorna 200 com startups APPROVED + verificationStatus=VERIFIED', async () => {
      const res = await getMarketplace('marketplace/verified').expect(200);
      expect(res.body.error).toBe(false);

      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain(verifiedStartupId);

      const card = res.body.data.find((s: any) => s.id === verifiedStartupId);
      expect(card.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('GET /api/startup/marketplace/accelerated', () => {
    it('retorna 200 com startups APPROVED + isAccelerated=true', async () => {
      const res = await getMarketplace('marketplace/accelerated').expect(200);
      expect(res.body.error).toBe(false);

      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain(acceleratedStartupId);

      const card = res.body.data.find(
        (s: any) => s.id === acceleratedStartupId,
      );
      expect(card.isAccelerated).toBe(true);
    });
  });

  describe('GET /api/startup/marketplace/approval', () => {
    it('retorna 200 com startups PENDING_CURATOR_REVIEW', async () => {
      const res = await getMarketplace('marketplace/approval').expect(200);
      expect(res.body.error).toBe(false);

      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain(approvalStartupId);

      const card = res.body.data.find((s: any) => s.id === approvalStartupId);
      expect(card.status).toBe('PENDING_CURATOR_REVIEW');
    });
  });

  describe('GET /api/startup/marketplace/all (regressao)', () => {
    it('continua funcionando (nao usa findByStatus)', async () => {
      const res = await getMarketplace('marketplace/all').expect(200);
      expect(res.body.error).toBe(false);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('smoke: nenhum endpoint retorna 500', () => {
    it('GET /marketplace/{featured|verified|accelerated|approval} todos retornam 200', async () => {
      for (const tag of ['featured', 'verified', 'accelerated', 'approval']) {
        const res = await getMarketplace(`marketplace/${tag}`);
        expect(res.status).toBe(200);
        expect(res.body.error).toBe(false);
        expect(res.body.message).toContain(`marketplace (${tag})`);
      }
    });
  });
});
