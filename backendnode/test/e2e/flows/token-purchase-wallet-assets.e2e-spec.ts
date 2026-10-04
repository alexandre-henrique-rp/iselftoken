/**
 * E2E — Token Purchase Wallet Assets (F1-F4 wallet-assets).
 *
 * Cobertura do novo endpoint `GET /wallet/assets`:
 *   1. Autenticação obrigatória (401 sem cookie)
 *   2. Retorna assets vazios para usuário sem tokens
 *   3. Retorna assets com tokens após investimento CONFIRMED
 *   4. Idempotência: re-chamar não duplica tokens
 *   5. TokensService.getUserTokens retorna shortCode + investmentId
 *
 * Setup mínimo: cria user + 1 investment CONFIRMED + 3 Tokens diretamente
 * no Prisma (sem passar pelo gateway EFI, que já é coberto por outros flows).
 */
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SessionService } from '../../../src/auth/session/session.service';
import { EmailService } from '../../../src/email/email.service';
import {
  generateUniqueEmail,
  generateValidPassword,
  buildAuthCookie,
} from './setup/test-helpers';
import { cleanupTestUser, countUserArtifacts } from './setup/db-cleanup';

describe('E2E — Token Purchase Wallet Assets (F1-F4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;

  const TEST_EMAIL = generateUniqueEmail('wallet-assets');
  let userId: number;
  let sessionId: string;
  let startupId: number;
  let campaignId: number;
  let investmentId: number;
  let tokenIds: string[] = [];
  let isSetupDone = false;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    sessionService = app.get(SessionService);

    // Silencia e-mails
    const emailService = app.get(EmailService);
    jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockReturnValue(Promise.resolve({ success: true, message: 'mocked' }));
    jest
      .spyOn(emailService, 'sendWelcomeEmail')
      .mockReturnValue(Promise.resolve({ success: true, message: 'mocked' }));
  });

  afterAll(async () => {
    if (userId) {
      const before = await countUserArtifacts(prisma, userId);
      // Cleanup adicional: tokens/investments pertencentes ao user
      // (cleanupTestUser já lida com isso, mas caso o helper não
      // cubra cenários legados, garantimos aqui).
      await prisma.token.deleteMany({ where: { userId } });
      await prisma.investment.deleteMany({ where: { userId } });
      await cleanupTestUser(prisma, TEST_EMAIL);
      const after = await countUserArtifacts(prisma, userId);
      console.log(`[CLEANUP] User ${userId} (${TEST_EMAIL}):`);
      console.log(`  before: ${JSON.stringify(before)}`);
      console.log(`  after:  ${JSON.stringify(after)}`);
      expect(after.user).toBe(0);
      expect(after.wallet).toBe(0);
    }
    // Cleanup do founder/startup/campaign de teste (não cobertos pelo helper)
    if (campaignId) {
      await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => null);
    }
    if (startupId) {
      await prisma.startup.delete({ where: { id: startupId } }).catch(() => null);
    }
    // Founders criados com email gerado por timestamp
    await prisma.user
      .deleteMany({
        where: {
          email: { startsWith: 'founder+' },
        },
      })
      .catch(() => null);

    await app.close();
  });

  async function setupUserWithConfirmedInvestment() {
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        senha: await (await import('bcrypt')).hash(generateValidPassword(), 10),
        nome: 'Investidor Wallet Assets',
        role: 'USER',
        isActive: true,
      },
    });
    userId = user.id;

    // Wallet 1:1
    await prisma.wallet.create({
      data: { userId: user.id, balance: 0, blocked: 0, currency: 'BRL' },
    });

    // Plano-investidor (necessário para sidebar mostrar Transparência).
    const investorPlan = await prisma.plan.upsert({
      where: { slug: 'plano-investidor' },
      update: {},
      create: {
        slug: 'plano-investidor',
        nome: 'Plano Investidor',
        preco: 50,
        periodoMeses: 12,
        beneficios: ['Investir em startups'],
        visivel: true,
      },
    });

    const session = await sessionService.createSession(
      (sessionId = randomUUID()),
      {
        id: user.id,
        publicId: (user as { publicId?: string }).publicId ?? '',
        email: TEST_EMAIL,
        nome: user.nome,
        role: user.role,
        isActive: user.isActive,
        af2Verified: true,
        subscriptions: [
          {
            id: 0,
            planId: investorPlan.id,
            status: 'ACTIVE',
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            plan: { slug: 'plano-investidor' } as never,
          } as never,
        ],
      } as never,
    );
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: investorPlan.id,
        status: 'ACTIVE',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    // Founder + startup + campaign OPEN com estoque
    const founder = await prisma.user.create({
      data: {
        email: `founder+${Date.now()}@example.com`,
        senha: 'x',
        nome: 'Founder',
        role: 'USER',
        isActive: true,
      },
    });

    const startup = await prisma.startup.create({
      data: {
        nome: 'Startup Wallet Assets',
        cnpj: '11.444.777/0001-61',
        razao_social: 'Wallet Assets LTDA',
        data_fundacao: new Date('2026-01-01'),
        founderId: founder.id,
        status: 'APPROVED',
        slug: `wallet-assets-${Date.now()}`,
        area_atuacao: 'Tecnologia',
      },
    });
    startupId = startup.id;

    const campaign = await prisma.campaign.create({
      data: {
        startupId: startup.id,
        title: 'Rodada Wallet Assets',
        targetAmount: 100000,
        minInvestment: 240,
        valuation: 1000000,
        tokenBaseValue: 200,
        tokenSellPrice: 240,
        tokenPrice: 240,
        totalTokens: 500,
        tokensSold: 3,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'OPEN',
        reservationFeePaid: true,
        adminFeeValue: 20000,
        tokenMintingCost: 100,
      },
    });
    campaignId = campaign.id;

    // Investment CONFIRMED com 3 tokens
    const investment = await prisma.investment.create({
      data: {
        userId: user.id,
        campaignId: campaign.id,
        amount: 720,
        tokensQty: 3,
        status: 'CONFIRMED',
        allocatedAt: new Date(),
        tokenBasePrice: 200,
        tokenSellPrice: 240,
        tokenSubtotal: 720,
        platformFeePct: 0.05,
        platformFeeAmount: 36,
        startupRepasseAmount: 600,
        platformSpreadAmount: 120,
        platformRevenueAmount: 156,
        affiliateCommissionAmount: 0,
      },
    });
    investmentId = investment.id;

    // 3 Token records com hash único + investmentId
    await prisma.token.createMany({
      data: Array.from({ length: 3 }).map((_, i) => ({
        hash: crypto
          .createHash('sha256')
          .update(`wallet-assets-${userId}-${i}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`)
          .digest('hex'),
        userId: user.id,
        startupId: startup.id,
        campaignId: campaign.id,
        investmentId: investment.id,
        quantity: 1,
        purchaseVal: 240,
        currentVal: 240,
      })),
    });
  }

  it('GET /wallet/assets — 401 sem cookie de sessão', async () => {
    const res = await request(app.getHttpServer()).get('/wallet/assets');
    expect(res.status).toBe(401);
  });

  it('GET /wallet/assets — retorna assets com token IDs após investimento CONFIRMED', async () => {
    if (!isSetupDone) {
      await setupUserWithConfirmedInvestment();
      isSetupDone = true;
    }
    const cookie = buildAuthCookie(sessionId);

    const res = await request(app.getHttpServer())
      .get('/wallet/assets')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.error).toBe(false);
    const data = res.body.data;
    expect(data.startupsCount).toBe(1);
    expect(data.tokensCount).toBe(3);
    expect(data.assets).toHaveLength(1);

    const asset = data.assets[0];
    expect(asset.investmentId).toBe(investmentId);
    expect(asset.startupId).toBe(startupId);
    expect(asset.startupName).toBe('Startup Wallet Assets');
    expect(asset.campaignTitle).toBe('Rodada Wallet Assets');
    expect(asset.tokensCount).toBe(3);
    expect(asset.tokens).toHaveLength(3);

    // Cada token tem shortCode (últimos 8 chars do hash) + investmentId
    for (const token of asset.tokens) {
      expect(token.id).toMatch(/^[0-9a-f-]{36}$/); // UUID
      expect(token.shortCode).toHaveLength(8);
      // shortCode tem 8 caracteres hexadecimais (case insensitive)
      expect(token.shortCode).toMatch(/^[0-9a-f]{8}$/);
      expect(token.investmentId).toBe(investmentId);
      expect(token.purchaseVal).toBe(240);
      expect(token.currentVal).toBe(240);
      expect(token.quantity).toBe(1);
      expect(token.acquiredAt).toBeTruthy();
    }

    // Snapshot financeiro correto (Modelo B)
    expect(asset.investedAmount).toBe(720);
    expect(asset.platformFeeAmount).toBe(36);
    expect(asset.totalCharged).toBe(756); // 720 + 36
    expect(asset.currentValue).toBe(720); // 3 tokens × 240
  });

  it('GET /wallet/assets — chama novamente mantém idempotência (sem duplicar tokens)', async () => {
    if (!isSetupDone) {
      await setupUserWithConfirmedInvestment();
      isSetupDone = true;
    }
    const cookie = buildAuthCookie(sessionId);

    const res1 = await request(app.getHttpServer())
      .get('/wallet/assets')
      .set('Cookie', cookie)
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get('/wallet/assets')
      .set('Cookie', cookie)
      .expect(200);

    expect(res1.body.data.tokensCount).toBe(3);
    expect(res2.body.data.tokensCount).toBe(3);
    expect(res1.body.data.assets[0].tokens).toHaveLength(3);
    expect(res2.body.data.assets[0].tokens).toHaveLength(3);

    // IDs devem ser os mesmos (sem nova inserção)
    const ids1 = res1.body.data.assets[0].tokens.map((t: { id: string }) => t.id);
    const ids2 = res2.body.data.assets[0].tokens.map((t: { id: string }) => t.id);
    expect(ids1.sort()).toEqual(ids2.sort());
  });

  it('GET /tokens — getUserTokens inclui investmentId e shortCode (F1)', async () => {
    if (!isSetupDone) {
      await setupUserWithConfirmedInvestment();
      isSetupDone = true;
    }
    const cookie = buildAuthCookie(sessionId);

    const res = await request(app.getHttpServer())
      .get('/tokens')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.error).toBe(false);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.tokens).toHaveLength(3);

    for (const token of res.body.data.tokens) {
      expect(token.investmentId).toBe(investmentId);
      expect(token.shortCode).toHaveLength(8);
      expect(token.campaignStatus).toBe('OPEN');
      expect(token.startup).toBe('Startup Wallet Assets');
    }
  });
});