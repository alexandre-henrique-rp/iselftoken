import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SessionService } from '../../../src/auth/session/session.service';
import { EmailService } from '../../../src/email/email.service';
import {
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
  buildAuthCookie,
} from './setup/test-helpers';

/**
 * E2E test: GET /startup com payload expandido (M5-S12 T052).
 * Cobre 10 cenarios: retrocompat + summary + tabsCount + proximaAcao + LGPD.
 *
 * Setup: signup + 2FA (verify-code) + role ADMIN (bypass plan check) + 3 startups.
 */
describe('E2E Real Flow - Startup Dashboard Overview (M5-S12 T052)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  const TEST_EMAIL = generateUniqueEmail('e2eT052');
  const TEST_EMAIL_LOWER = TEST_EMAIL.toLowerCase();
  const TEST_PASSWORD = generateValidPassword();

  let userId: number;
  let sessionId: string;
  let twoFactorCode: string | undefined;
  let startupRascunhoId: number;
  let startupAbertaId: number;
  let startupFinanciadaId: number;
  let campaignAbertaId: number;
  let campaignFundedId: number;
  let investorId: number;

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
    emailService = app.get(EmailService);

    jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockImplementation(async (_to, _n, codigo, acao) => {
        if (acao && acao.includes('Autenticar')) {
          twoFactorCode = codigo;
        }
        return { success: true, message: 'mocked' };
      });
    jest
      .spyOn(emailService, 'sendWelcomeEmail')
      .mockReturnValue(Promise.resolve({ success: true, message: 'mocked' }));
    jest
      .spyOn(emailService, 'sendValidationEmail')
      .mockReturnValue(Promise.resolve({ success: true, message: 'mocked' }));

    // STEP 1: signup
    await request(app.getHttpServer())
      .post('/auth/register/user')
      .send({
        email: TEST_EMAIL,
        nome: 'Founder M5-S12',
        senha: TEST_PASSWORD,
        senhaConfirmacao: TEST_PASSWORD,
        telefone: generateValidPhone(),
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

    // Promote para ADMIN (bypass plan check)
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });

    // STEP 2: login (gera codigo 2FA)
    const loginRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: TEST_EMAIL, senha: TEST_PASSWORD })
      .expect(200);

    sessionId = loginRes.body.data.sessionId;

    // STEP 3: verify-code (af2Verified = true)
    await request(app.getHttpServer())
      .post('/auth/verify-code')
      .set('Cookie', buildAuthCookie(sessionId))
      .send({ codigo: twoFactorCode })
      .expect(200);

    // 4. Investor fake (LGPD check)
    const investor = await prisma.user.create({
      data: {
        email: TEST_EMAIL_LOWER.replace('@', `+inv${Date.now()}@`),
        nome: 'Investor LGPD Check',
        senha: '$2b$10$fixedHashForE2ETestOnly.',
        telefone: '11912345678',
        role: 'USER',
      },
    });
    investorId = investor.id;

    // 5. 3 startups
    const ts = Date.now();
    const rascunho = await prisma.startup.create({
      data: {
        nome: 'Rascunho Inc',
        slug: `rascunho-inc-${ts}`,
        founderId: userId,
        cnpj: `11.111.111/0001-${String(ts).slice(-2).padStart(2, '0')}`,
        razao_social: 'Rascunho Inc LTDA',
        pais: 'BRA',
        status: 'PENDING',
      },
    });
    startupRascunhoId = rascunho.id;

    const aberta = await prisma.startup.create({
      data: {
        nome: 'Aberta SA',
        slug: `aberta-sa-${ts}`,
        founderId: userId,
        cnpj: `22.222.222/0001-${String(ts + 1)
          .slice(-2)
          .padStart(2, '0')}`,
        razao_social: 'Aberta SA',
        pais: 'BRA',
        status: 'APPROVED',
      },
    });
    startupAbertaId = aberta.id;

    const Financiada = await prisma.startup.create({
      data: {
        nome: 'Financiada Beta',
        slug: `financiada-beta-${ts}`,
        founderId: userId,
        cnpj: `33.333.333/0001-${String(ts + 2)
          .slice(-2)
          .padStart(2, '0')}`,
        razao_social: 'Financiada Beta LTDA',
        pais: 'BRA',
        status: 'APPROVED',
      },
    });
    startupFinanciadaId = Financiada.id;

    const campaignAberta = await prisma.campaign.create({
      data: {
        startupId: startupAbertaId,
        title: 'Rodada Aberta',
        status: 'OPEN',
        tokenPrice: 200,
        totalTokens: 100000,
        tokensSold: 45000,
        targetAmount: 20000000,
        minInvestment: 100,
        valuation: 1000000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    campaignAbertaId = campaignAberta.id;

    const campaignFunded = await prisma.campaign.create({
      data: {
        startupId: startupFinanciadaId,
        title: 'Rodada Funded',
        status: 'FUNDED',
        tokenPrice: 200,
        totalTokens: 100000,
        tokensSold: 100000,
        targetAmount: 20000000,
        minInvestment: 100,
        valuation: 1000000,
        deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });
    campaignFundedId = campaignFunded.id;

    await prisma.investment.create({
      data: {
        userId: investorId,
        campaignId: campaignAbertaId,
        amount: 5000,
        tokensQty: 25,
        status: 'CONFIRMED',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    if (campaignAbertaId) {
      await prisma.investment.deleteMany({
        where: { campaignId: campaignAbertaId },
      });
      await prisma.campaign.deleteMany({ where: { id: campaignAbertaId } });
    }
    if (campaignFundedId) {
      await prisma.campaign.deleteMany({ where: { id: campaignFundedId } });
    }
    if (startupRascunhoId)
      await prisma.startup.deleteMany({ where: { id: startupRascunhoId } });
    if (startupAbertaId)
      await prisma.startup.deleteMany({ where: { id: startupAbertaId } });
    if (startupFinanciadaId)
      await prisma.startup.deleteMany({ where: { id: startupFinanciadaId } });
    if (investorId) {
      await prisma.walletTransaction.deleteMany({
        where: { wallet: { userId: investorId } },
      });
      await prisma.wallet.deleteMany({ where: { userId: investorId } });
      await prisma.user.delete({ where: { id: investorId } });
    }
    if (userId) {
      await prisma.subscription.deleteMany({ where: { userId } });
      await prisma.accessLog.deleteMany({ where: { userId } });
      await prisma.emailValidation.deleteMany({ where: { userId } });
      await prisma.walletTransaction.deleteMany({
        where: { wallet: { userId } },
      });
      await prisma.wallet.deleteMany({ where: { userId } });
      await prisma.auditLog.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  describe('Cenario 1: lista 3 startups do founder', () => {
    it('GET /startup retorna 3 startups com payload {data, summary, tabsCount}', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      expect(res.body.error).toBe(false);
      expect(res.body.codigo).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('tabsCount');
    });
  });

  describe('Cenario 2: retrocompat', () => {
    it('cada startup em data[] contem TODOS os campos antigos', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      const camposAntigos = [
        'id',
        'logo',
        'nome',
        'segmento',
        'status',
        'estagio',
        'totalTokens',
        'tokensVendidos',
        'percentualVendido',
        'statusCampanha',
        'bandeira',
        'createdAt',
      ];
      for (const startup of res.body.data) {
        for (const campo of camposAntigos) {
          expect(startup).toHaveProperty(campo);
        }
      }
    });
  });

  describe('Cenario 3: summary.captado30d.valor', () => {
    it('captado30d.valor == SUM(investments.amount) em 30d, sparkline com 30 pontos', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      expect(res.body.summary.captado30d.valor).toBe(5000);
      expect(res.body.summary.captado30d.sparkline).toHaveLength(30);
      expect(typeof res.body.summary.captado30d.variacaoPercent).toBe('number');
    });
  });

  describe('Cenario 4: LGPD - investidoresUnicos e COUNT', () => {
    it('investidoresUnicos e number, zero dado pessoal no payload', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      expect(typeof res.body.summary.investidoresUnicos).toBe('number');
      expect(res.body.summary.investidoresUnicos).toBe(1);
      const json = JSON.stringify(res.body);
      expect(json).not.toContain('Investor LGPD Check');
      expect(json).not.toContain('11912345678');
    });
  });

  describe('Cenario 5: tabsCount', () => {
    it('todas=3, emAnalise=1, Financiadas=1', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      expect(res.body.tabsCount.todas).toBe(3);
      expect(res.body.tabsCount.emAnalise).toBe(1);
      expect(res.body.tabsCount.Financiadas).toBe(1);
    });
  });

  describe('Cenario 6: proximaAcao PENDING', () => {
    it('PENDING sem campanha -> {tipo:CONFIGURAR, rota:/startup/:id/edit}', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      const rascunho = res.body.data.find(
        (s: any) => s.nome === 'Rascunho Inc',
      );
      expect(rascunho).toBeDefined();
      expect(rascunho.proximaAcao).toMatchObject({ tipo: 'CONFIGURAR' });
      expect(rascunho.proximaAcao.rota).toMatch(/^\/startup\/\d+\/edit$/);
      expect(rascunho.metaCaptacao).toBeNull();
    });
  });

  describe('Cenario 7: proximaAcao APPROVED+OPEN', () => {
    it('OPEN -> {tipo:CAMPANHA_EM_ANDAMENTO}', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      const ativa = res.body.data.find(
        (s: any) => s.statusCampanha === 'aberto',
      );
      expect(ativa).toBeDefined();
      expect(ativa.proximaAcao).toMatchObject({
        tipo: 'CAMPANHA_EM_ANDAMENTO',
      });
      expect(ativa.proximaAcao.rota).toMatch(/^\/startup\/\d+\/dashboard$/);
      expect(ativa.valorCaptado).toBe(5000);
      expect(ativa.metaCaptacao).toBe(20000000);
    });
  });

  describe('Cenario 8: proximaAcao APPROVED+FUNDED', () => {
    it('FUNDED -> {tipo:NOVA_RODADA}', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      const funded = res.body.data.find(
        (s: any) => s.statusCampanha === 'financiado',
      );
      expect(funded).toBeDefined();
      expect(funded.proximaAcao).toMatchObject({ tipo: 'NOVA_RODADA' });
      expect(funded.proximaAcao.rota).toMatch(
        /^\/startup\/\d+\/campaigns\/new$/,
      );
      expect(funded.percentualVendido).toBe(100);
    });
  });

  describe('Cenario 9: badges', () => {
    it('cada startup tem no maximo 3 badges', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      for (const startup of res.body.data) {
        expect(Array.isArray(startup.badges)).toBe(true);
        expect(startup.badges.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Cenario 10: campos monetarios', () => {
    it('valorCaptado e number; metaCaptacao null em PENDING sem campanha', async () => {
      const res = await request(app.getHttpServer())
        .get('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);
      for (const startup of res.body.data) {
        expect(typeof startup.valorCaptado).toBe('number');
        expect(startup.valorCaptado).toBeGreaterThanOrEqual(0);
        if (startup.nome === 'Rascunho Inc') {
          expect(startup.metaCaptacao).toBeNull();
          expect(startup.valorCaptado).toBe(0);
        } else {
          expect(
            startup.metaCaptacao === null ||
              typeof startup.metaCaptacao === 'number' ||
              typeof startup.metaCaptacao.toNumber === 'function',
          ).toBe(true);
        }
      }
    });
  });
});
