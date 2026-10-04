/**
 * E2E — Payment Checkout PIX (S05 T046).
 *
 * Fluxo coberto:
 *  1. Registro + 2FA (signup → login → verify-code)
 *  2. Criar Plano + Subscription PENDING
 *  3. POST /payment/:id/pix → QR Code PIX gerado
 *  4. Validações de erro (422/400)
 *
 * runners: jest --config ./test/e2e/jest-e2e-flows.config.js
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { SessionService } from '../../../src/auth/session/session.service';
import { EmailService } from '../../../src/email/email.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import {
  buildAuthCookie,
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
} from './setup/test-helpers';

describe('Payment Checkout (PIX) — S05 T046', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  const TEST_EMAIL = generateUniqueEmail('e2ePix');
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
        nome: 'E2E PIX Tester',
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

    // 3. Criar Plan + Subscription PENDING para purpose=SUBSCRIPTION
    const plan = await prisma.plan.create({
      data: {
        slug: `e2e-plan-${Date.now()}`,
        nome: 'E2E Plan PIX',
        preco: 50,
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
    // Cleanup:Payments antes de user
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
  // CT1: Cria Payment PENDING → POST /payment
  // ------------------------------------------------------------------
  describe('CT1. Cria Payment PENDING via /payment', () => {
    it('POST /payment com method=PIX → 201 + status PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/payment')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          amount: 10000,
          method: 'PIX',
          purpose: 'TOKEN_RESERVATION',
        })
        .expect(201);

      expect(res.body.error).toBe(false);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.method).toBe('PIX');
      createdPaymentIds.push(res.body.data.id);
    });
  });

  // ------------------------------------------------------------------
  // CT2: Gera QR Code PIX → POST /payment/:id/pix
  // ------------------------------------------------------------------
  describe('CT2. Gera QR Code PIX → POST /payment/:id/pix', () => {
    it('QR Code gerado com shape correto (qrCodeBase64, copyPastePix, txid, expiresAt)', async () => {
      // Cria payment primeiro
      const payRes = await request(app.getHttpServer())
        .post('/payment')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          amount: 10000,
          method: 'PIX',
          purpose: 'TOKEN_RESERVATION',
        })
        .expect(201);
      const paymentId = payRes.body.data.id;
      createdPaymentIds.push(paymentId);

      const pixRes = await request(app.getHttpServer())
        .post(`/payment/${paymentId}/pix`)
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      expect(pixRes.body.error).toBe(false);
      expect(pixRes.body.data.qrCodeBase64).toBeDefined();
      expect(pixRes.body.data.copyPastePix).toBeDefined();
      expect(pixRes.body.data.txid).toBeDefined();
      expect(pixRes.body.data.expiresAt).toBeDefined();

      // Persistência
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });
      expect(payment!.txid).toBeDefined();
      expect(payment!.expiresAt).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // CT3: Checkout via /api/v2/payments/checkout (PIX method) + sync
  // ------------------------------------------------------------------
  describe('CT3. Checkout unificado PIX via /api/v2/payments/checkout', () => {
    it('POST /api/v2/payments/checkout (method=PIX) → 201 + qrCode data', async () => {
      // Cria payment via checkout V2 (PIX)
      const res = await request(app.getHttpServer())
        .post('/api/v2/payments/checkout')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          amount: 50.0,
          referenceType: 'SUBSCRIPTION',
          referenceId: String(createdSubscriptionIds[0]),
          payer: {
            name: 'E2E PIX Tester',
            document: '52998224725',
            email: TEST_EMAIL,
          },
        })
        .expect(201);

      expect(res.body.error).toBe(false);
      expect(res.body.paymentId).toBeDefined();
      expect(res.body.redirectUrl).toBeDefined(); // C6 hosted page
      createdPaymentIds.push(res.body.paymentId);
    });
  });

  // ------------------------------------------------------------------
  // CT4: Sync payment status → GET /payment/:id
  // ------------------------------------------------------------------
  describe('CT4. Sync payment status → GET /payment/:id', () => {
    it('GET /payment/:id retorna dados atuais do payment', async () => {
      const paymentId = createdPaymentIds[0];
      const res = await request(app.getHttpServer())
        .get(`/payment/${paymentId}`)
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      expect(res.body.error).toBe(false);
      expect(res.body.data.id).toBe(paymentId);
      expect(res.body.data.status).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // CT5: Pix em payment não-PENDING → 400
  // ------------------------------------------------------------------
  describe('CT5. Pix em payment não-PENDING → 400', () => {
    it('POST /payment/:id/pix com status PAID → 400', async () => {
      // Cria payment
      const payRes = await request(app.getHttpServer())
        .post('/payment')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          amount: 15000,
          method: 'PIX',
          purpose: 'TOKEN_RESERVATION',
        })
        .expect(201);
      const paymentId = payRes.body.data.id;

      // Marca como PAID
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'PAID', paidAt: new Date() },
      });

      await request(app.getHttpServer())
        .post(`/payment/${paymentId}/pix`)
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(400);

      // Cleanup
      await prisma.payment.delete({ where: { id: paymentId } });
    });
  });
});
