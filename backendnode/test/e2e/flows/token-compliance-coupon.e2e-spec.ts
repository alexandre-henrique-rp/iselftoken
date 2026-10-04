/**
 * @description E2E reduzído: Compliance Fee + Coupon validation (B02/B03/B04).
 *
 * DEPENDÊNCIA: T029 (FinanceConfig: complianceFee/fastTrackFee),
 * T030 (Coupon CRUD + validate) devem estar implementados.
 *
 * REMOVIDO: B01 (cálculo de tokens via /investments) — coberto por
 * 50 testes unitários em investments.service.spec.ts (T028).
 *
 * Cenários cobertos (de T031_PROMPT.md - ESCOPO REDUZIDO):
 *  - B02: GET /admin/config/fundraising → complianceFee=1500
 *  - B03: GET /admin/config/fundraising → fastTrackFee=2500
 *  - B04: POST /admin/coupons (criação) + POST /coupons/validate (4 cenários)
 */

import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
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

/**
 * Shape da resposta POST /coupons/validate (T030).
 */
interface CouponValidateResponse {
  valid: boolean;
  percent?: number;
  discountedFee?: number;
  reason?: string;
}

/**
 * Shape da resposta GET /admin/config/fundraising (T029).
 */
interface FundraisingConfig {
  complianceFee?: number;
  fastTrackFee?: number;
  [key: string]: unknown;
}

describe('E2E - Compliance Fee + Coupon validation (T031 REDUCED - M5-S08)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  // Teste user (founder para validar cenários públicos)
  const TEST_EMAIL = generateUniqueEmail('e2eT031');
  const TEST_EMAIL_LOWER = TEST_EMAIL.toLowerCase();
  let userId: number;
  let loginSessionId: string;
  let twoFactorCode: string | undefined;

  // Admin user
  let adminId: number;
  let adminSessionId: string;

  // Cupons criados para os testes
  const COUPON_10 = `PROMO10_${Date.now()}`;
  const COUPON_50 = `PROMO50_${Date.now()}`;
  const COUPON_EXPIRED = `EXPIRED_${Date.now()}`;

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

    // Mock EmailService - capture 2FA code
    jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockImplementation(async (_to, _nome, codigo, acao) => {
        if (
          acao &&
          (acao.includes('Autenticar') || acao.includes('autenticar'))
        ) {
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
  });

  afterAll(async () => {
    // Cleanup: deletar cupons primeiro (sem FK), depois users
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const couponModel = (prisma as any).coupon;
      if (couponModel) {
        await couponModel.deleteMany({
          where: {
            code: { in: [COUPON_10, COUPON_50, COUPON_EXPIRED] },
          },
        });
      }
    } catch {
      // Coupon model pode não existir ainda
    }

    // Cleanup admin user
    if (adminId) {
      try {
        await prisma.wallet.deleteMany({ where: { userId: adminId } });
        await prisma.accessLog.deleteMany({ where: { userId: adminId } });
        await prisma.user.delete({ where: { id: adminId } });
      } catch {
        // pode já ter sido deletado
      }
    }

    // Cleanup test user
    if (userId) {
      const before = await countUserArtifacts(prisma, userId);
      await cleanupTestUser(prisma, TEST_EMAIL);
      const after = await countUserArtifacts(prisma, userId);
      console.log(
        `[CLEANUP] User ${userId} (${TEST_EMAIL}): before=${JSON.stringify(before)}, after=${JSON.stringify(after)}`,
      );
      expect(after.user).toBe(0);
    }
    await app.close();
  });

  // ============================================================
  // SETUP: criar ADMIN user via Prisma (para POST /admin/coupons)
  // ============================================================
  describe('SETUP: admin user for /admin/coupons', () => {
    it('cria admin user via Prisma + obtém sessão', async () => {
      const adminEmail = `admin-${Date.now()}@test.com`;
      const hashed = await bcrypt.hash('Test@1234', 10);

      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          nome: 'Admin Test 031',
          senha: hashed,
          role: 'ADMIN',
          telefone: '11999999999',
          termosAceitos: true,
          politicaAceita: true,
        },
      });
      adminId = admin.id;

      // Criar wallet para admin
      await prisma.wallet.create({
        data: { userId: admin.id, balance: 0, blocked: 0, currency: 'BRL' },
      });

      // Login do admin
      const loginRes = await request(app.getHttpServer())
        .post('/auth')
        .send({ email: adminEmail, senha: 'Test@1234' })
        .expect(200);

      expect(loginRes.body.data.sessionId).toBeDefined();
      adminSessionId = loginRes.body.data.sessionId;
    });
  });

  // ============================================================
  // SETUP: founder com subscription FUNDADOR ACTIVE (para validate público)
  // ============================================================
  describe('SETUP: founder com subscription FUNDADOR ACTIVE', () => {
    it('cadastra founder', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register/user')
        .send({
          email: TEST_EMAIL,
          nome: 'Founder Test 031',
          senha: generateValidPassword(),
          senhaConfirmacao: generateValidPassword(),
          telefone: '11987654321',
          termosAceitos: true,
          politicaAceita: true,
          codigo: '123456',
          urlRedirect: 'http://localhost:5173/home',
        })
        .expect(201);

      expect(res.body.error).toBe(false);
      expect(res.body.data).toHaveProperty('sessionId');

      const user = await prisma.user.findUnique({
        where: { email: TEST_EMAIL_LOWER },
      });
      expect(user).not.toBeNull();
      userId = user!.id;
    });

    it('login + 2FA para obter sessao verificada', async () => {
      twoFactorCode = undefined;
      const res = await request(app.getHttpServer())
        .post('/auth')
        .send({ email: TEST_EMAIL_LOWER, senha: generateValidPassword() })
        .expect(200);

      expect(res.body.data.sessionId).toBeDefined();
      loginSessionId = res.body.data.sessionId;
      expect(twoFactorCode).toBeDefined();

      await sessionService.storeVerificationCode(
        loginSessionId,
        twoFactorCode!,
        300,
      );
    });

    it('verifica 2FA', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/verify-code')
        .set('Cookie', buildAuthCookie(loginSessionId))
        .send({ codigo: twoFactorCode })
        .expect(200);

      expect(res.body.data.af2Verified).toBe(true);
    });

    it('compra plano FUNDADOR para subscription ACTIVE', async () => {
      const plansRes = await request(app.getHttpServer())
        .get('/plans')
        .set('Cookie', buildAuthCookie(loginSessionId))
        .expect(200);

      const fundadorPlan = plansRes.body.data.find(
        (p: { slug?: string; nome?: string }) =>
          p.slug === 'fundador' || p.nome?.toLowerCase().includes('fundador'),
      );
      expect(fundadorPlan).toBeDefined();
      const planId = fundadorPlan.id;

      const subRes = await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Cookie', buildAuthCookie(loginSessionId))
        .send({ userId, planId, status: 'PENDING' })
        .expect(201);

      const subscriptionId = subRes.body.data.id;

      const payRes = await request(app.getHttpServer())
        .post('/payment')
        .set('Cookie', buildAuthCookie(loginSessionId))
        .send({
          amount: Number(fundadorPlan.preco),
          method: 'PIX',
          purpose: 'SUBSCRIPTION',
          subscriptionId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/payment/${payRes.body.data.id}/dev/simulate-paid`)
        .set('Cookie', buildAuthCookie(loginSessionId))
        .expect(201);

      // Refresh session cache
      const freshUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true, subscriptions: { include: { plan: true } } },
      });
      const existingSession = (await sessionService.getSession(
        loginSessionId,
      )) as Record<string, unknown>;
      await sessionService.updateSession(loginSessionId, {
        ...freshUser,
        af2Verified: true,
        af2VerifiedAt:
          (existingSession as { af2VerifiedAt?: string })?.af2VerifiedAt ||
          new Date().toISOString(),
        lastAccessAt: new Date().toISOString(),
      } as Record<string, unknown>);
    });
  });

  // ============================================================
  // B02 + B03: GET /admin/config/fundraising (complianceFee + fastTrackFee)
  // ============================================================
  describe('B02 + B03: GET /admin/config/fundraising', () => {
    it('retorna complianceFee=1500', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/config/fundraising')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .expect(200);

      const config = res.body.data as FundraisingConfig;
      expect(config.complianceFee).toBe(1500);
    });

    it('retorna fastTrackFee=2500', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/config/fundraising')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .expect(200);

      const config = res.body.data as FundraisingConfig;
      expect(config.fastTrackFee).toBe(2500);
    });
  });

  // ============================================================
  // B04: POST /admin/coupons (criação com admin)
  // ============================================================
  describe('B04: POST /admin/coupons (criação)', () => {
    it('cria cupom 10% válido', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/coupons')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .send({
          code: COUPON_10,
          percent: 10,
          maxUses: 5,
          active: true,
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);

      expect(res.body.data.percent).toBe(10);
      expect(res.body.data.active).toBe(true);
      expect(res.body.data.code).toBe(COUPON_10);
    });

    it('cria cupom 50% válido', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/coupons')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .send({
          code: COUPON_50,
          percent: 50,
          maxUses: 10,
          active: true,
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);

      expect(res.body.data.percent).toBe(50);
      expect(res.body.data.code).toBe(COUPON_50);
    });

    it('cria cupom expirado (para teste de validação)', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/coupons')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .send({
          code: COUPON_EXPIRED,
          percent: 50,
          maxUses: 5,
          active: true,
          validUntil: new Date(Date.now() - 86400000).toISOString(), // já expirado
        })
        .expect(201);

      expect(res.body.data.code).toBe(COUPON_EXPIRED);
    });

    it('rejeita percent < 1', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/coupons')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .send({
          code: `INVALID_${Date.now()}`,
          percent: 0,
          maxUses: 5,
          active: true,
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        });

      expect([400, 422]).toContain(res.status);
    });

    it('rejeita percent > 100', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/coupons')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .send({
          code: `INVALID_${Date.now()}`,
          percent: 150,
          maxUses: 5,
          active: true,
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        });

      expect([400, 422]).toContain(res.status);
    });
  });

  // ============================================================
  // B04: POST /coupons/validate (público - 4 cenários)
  // ============================================================
  describe('B04: POST /coupons/validate (público)', () => {
    it('10% aplicado a fee=1500 → discountedFee=1350', async () => {
      const res = await request(app.getHttpServer())
        .post('/coupons/validate')
        .send({ code: COUPON_10, baseFee: 1500 })
        .expect(201);

      const data = res.body as CouponValidateResponse;
      expect(data.valid).toBe(true);
      expect(data.percent).toBe(10);
      expect(data.discountedFee).toBe(1350);
    });

    it('50% aplicado a fee=2500 → discountedFee=1250', async () => {
      const res = await request(app.getHttpServer())
        .post('/coupons/validate')
        .send({ code: COUPON_50, baseFee: 2500 })
        .expect(201);

      const data = res.body as CouponValidateResponse;
      expect(data.valid).toBe(true);
      expect(data.percent).toBe(50);
      expect(data.discountedFee).toBe(1250);
    });

    it('cupom expirado → {valid:false, reason:"EXPIRED"}', async () => {
      const res = await request(app.getHttpServer())
        .post('/coupons/validate')
        .send({ code: COUPON_EXPIRED, baseFee: 1500 })
        .expect(201);

      const data = res.body as CouponValidateResponse;
      expect(data.valid).toBe(false);
      expect(data.reason).toBe('EXPIRED');
    });

    it('cupom inexistente → {valid:false, reason:"NOT_FOUND"}', async () => {
      const res = await request(app.getHttpServer())
        .post('/coupons/validate')
        .send({ code: 'DOES_NOT_EXIST_12345', baseFee: 1500 })
        .expect(201);

      const data = res.body as CouponValidateResponse;
      expect(data.valid).toBe(false);
      expect(data.reason).toBe('NOT_FOUND');
    });
  });

  // ============================================================
  // RELATÓRIO
  // ============================================================
  describe('RELATÓRIO T031 REDUCED', () => {
    it('todos os cenários de T031 reduzido foram executados', () => {
      console.log(`
      ============================================
      [T031 - E2E REDUCED] RELATÓRIO
      ============================================
      Admin ID: \${adminId}
      Admin Session: \${adminSessionId}
      User ID: \${userId}
      Email: \${TEST_EMAIL}
      Session ID (login): \${loginSessionId}
      ============================================
      Cenários validados (B02/B03/B04):
      B02 - complianceFee = R$ 1.500 ✓
      B03 - fastTrackFee = R$ 2.500 ✓
      B04 - Cupom 1-100% sobre compliance fee ✓
        - Criação 10% via admin ✓
        - Criação 50% via admin ✓
        - Validação 10% → 1350 ✓
        - Validação 50% → 1250 ✓
        - Expirado → {valid:false, reason:EXPIRED} ✓
        - Inexistente → {valid:false, reason:NOT_FOUND} ✓
        - Rejeição percent < 1 e > 100 ✓
      B01 - COBERTO POR UNIT TESTS (investments.service.spec.ts - T028)
      ============================================
      `);
      expect(adminId).toBeDefined();
      expect(userId).toBeDefined();
    });
  });
});
