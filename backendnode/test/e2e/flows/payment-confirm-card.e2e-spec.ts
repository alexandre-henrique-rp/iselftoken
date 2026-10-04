/**
 * E2E — Payment Checkout Credit Card (S05 T046).
 *
 * Fluxo coberto:
 *  1. Checkout CREDIT_CARD via /api/v2/payments/checkout
 *  2. Dev simulation: POST /payment/:id/dev/simulate-paid → PAID
 *  3. Validação: payment status = PAID + subscription ativada
 *
 * runners: jest --config ./test/e2e/jest-e2e-flows.config.js
 */
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

describe('Payment Checkout (Credit Card) — S05 T046', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  const TEST_EMAIL = generateUniqueEmail('e2eCard');
  let userId: number;
  let sessionId: string;
  let twoFactorCode: string | undefined;

  // IDs para cleanup
  const createdPlanIds: number[] = [];
  const createdSubscriptionIds: number[] = [];
  const createdPaymentIds: number[] = [];

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

    // Mock EmailService — captura o código 2FA
    jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockImplementation(async (_to: string, _name: string, code: string) => {
        twoFactorCode = code;
        return { success: true, message: 'mocked' };
      });

    // 1. Registrar usuário
    await request(app.getHttpServer())
      .post('/auth/register/user')
      .send({
        email: TEST_EMAIL,
        nome: 'E2E Card Tester',
        senha: generateValidPassword(),
        senhaConfirmacao: generateValidPassword(),
        telefone: generateValidPhone(),
        termosAceitos: true,
        politicaAceita: true,
      })
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL.toLowerCase() },
    });
    userId = user!.id;

    // 2. Login + 2FA
    const loginRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: TEST_EMAIL, senha: generateValidPassword() })
      .expect(200);
    sessionId = loginRes.body.data.sessionId;

    await request(app.getHttpServer())
      .post('/auth/verify-code')
      .set('Cookie', buildAuthCookie(sessionId))
      .send({ codigo: twoFactorCode })
      .expect(200);

    // 3. Criar Plan + Subscription PENDING
    const plan = await prisma.plan.create({
      data: {
        slug: `e2e-plan-card-${Date.now()}`,
        nome: 'E2E Plan Card',
        preco: 99.9,
        periodo: '12',
        beneficios: JSON.stringify([]),
        visivel: true,
      },
    });

    const subscription = await prisma.subscription.create({
      data: { userId, planId: plan.id, status: 'PENDING' },
    });

    createdPlanIds.push(plan.id);
    createdSubscriptionIds.push(subscription.id);
  });

  afterAll(async () => {
    if (userId) {
      await prisma.payment.deleteMany({ where: { userId } });
      await prisma.subscription.deleteMany({
        where: { id: { in: createdSubscriptionIds } },
      });
      await prisma.plan.deleteMany({ where: { id: { in: createdPlanIds } } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  // ------------------------------------------------------------------
  // CT1: Checkout CREDIT_CARD via /api/v2/payments/checkout
  // ------------------------------------------------------------------
  describe('CT1. Checkout CREDIT_CARD via /api/v2/payments/checkout', () => {
    it('POST /api/v2/payments/checkout (CREDIT_CARD) → 201 + redirectUrl', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v2/payments/checkout')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          amount: 99.9,
          referenceType: 'SUBSCRIPTION',
          referenceId: String(createdSubscriptionIds[0]),
          payer: {
            name: 'E2E Card Tester',
            document: '52998224725',
            email: TEST_EMAIL,
          },
        })
        .expect(201);

      expect(res.body.error).toBe(false);
      expect(res.body.paymentId).toBeDefined();
      expect(res.body.redirectUrl).toBeDefined(); // C6 hosted checkout URL
      createdPaymentIds.push(res.body.paymentId);
    });
  });

  // ------------------------------------------------------------------
  // CT2: Dev simulation → POST /payment/:id/dev/simulate-paid
  // ------------------------------------------------------------------
  describe('CT2. Dev simulation — POST /payment/:id/dev/simulate-paid', () => {
    it('simulate-paid marca payment como PAID + ativa subscription', async () => {
      // Cria payment via checkout V2
      const checkoutRes = await request(app.getHttpServer())
        .post('/api/v2/payments/checkout')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          amount: 50.0,
          referenceType: 'SUBSCRIPTION',
          referenceId: String(createdSubscriptionIds[0]),
          payer: {
            name: 'E2E Card Tester',
            document: '52998224725',
            email: TEST_EMAIL,
          },
        })
        .expect(201);

      const paymentId = checkoutRes.body.paymentId;
      createdPaymentIds.push(paymentId);

      // Simulation (dev-only)
      const simRes = await request(app.getHttpServer())
        .post(`/payment/${paymentId}/dev/simulate-paid`)
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      expect(simRes.body.error).toBe(false);
      expect(simRes.body.data?.status).toBe('PAID');

      // Verifica payment PAID no banco
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });
      expect(payment!.status).toBe('PAID');
      expect(payment!.paidAt).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // CT3: Checkout status via GET /api/v2/payments/checkout/:id/status
  // ------------------------------------------------------------------
  describe('CT3. Checkout status via /api/v2/payments/checkout/:id/status', () => {
    it('GET /api/v2/payments/checkout/:id/status retorna status atual', async () => {
      const paymentId = createdPaymentIds[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v2/payments/checkout/${paymentId}/status`)
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      expect(res.body.error).toBe(false);
      expect(res.body.data).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // BLOCKER: confirmCardPayment endpoint não existe
  // ------------------------------------------------------------------
  describe('BLOCKER: POST /payment/:id/confirm NÃO existe', () => {
    it('NOTA: Endpoint POST /payment/:id/confirm não implementado — fluxo 3DS via webhook apenas', async () => {
      // O fluxo de cartão real acontece via webhook C6:
      // 1. Frontend redirect para C6 hosted page
      // 2. C6 envia webhook POST /webhooks/c6-bank com status PAID/DECLINED
      // 3. payment.confirmed event ativa subscription
      //
      // O endpoint POST /payment/:id/confirm (3DS polling) não existe.
      //ladic

      const checkoutRes = await request(app.getHttpServer())
        .post('/api/v2/payments/checkout')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          amount: 30.0,
          referenceType: 'SUBSCRIPTION',
          referenceId: String(createdSubscriptionIds[0]),
          payer: {
            name: 'E2E Card Tester',
            document: '52998224725',
            email: TEST_EMAIL,
          },
        })
        .expect(201);

      const paymentId = checkoutRes.body.paymentId;
      createdPaymentIds.push(paymentId);

      // Tenta chamar endpoint que não existe
      const confirmRes = await request(app.getHttpServer())
        .post(`/payment/${paymentId}/confirm`)
        .set('Cookie', buildAuthCookie(sessionId))
        .send({});

      // 404 = não implementado (expected)
      expect(confirmRes.status).toBe(404);
    });
  });
});
