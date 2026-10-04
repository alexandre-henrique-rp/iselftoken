/**
 * E2E — Coupon Apply (6 cenários de erro 422/400 + 1 sucesso).
 * Escopo: S04 (coupon service).
 * runners: jest --config ./test/e2e/jest-e2e-flows.config.js
 */
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import {
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
  buildAuthCookie,
} from './setup/test-helpers';

describe('Coupon Apply — E2E (S04)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const TEST_EMAIL = generateUniqueEmail('coupon');
  let userId: number;
  let sessionId: string;
  let paymentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);

    // Cadastrar usuario
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register/user')
      .send({
        email: TEST_EMAIL,
        nome: 'Coupon Tester',
        senha: generateValidPassword(),
        senhaConfirmacao: generateValidPassword(),
        telefone: generateValidPhone(),
        termosAceitos: true,
        politicaAceita: true,
        codigo: '123456',
        urlRedirect: 'http://localhost:5173/home',
      })
      .expect(201);
    sessionId = registerRes.body.data.sessionId;

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL.toLowerCase() },
    });
    userId = user!.id;

    // Criar payment PENDING
    const payRes = await request(app.getHttpServer())
      .post('/payment')
      .set('Cookie', buildAuthCookie(sessionId))
      .send({ amount: 500000, method: 'PIX', purpose: 'TOKEN_RESERVATION' })
      .expect(201);
    paymentId = payRes.body.data.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.couponUsage.deleteMany({ where: { userId } });
      await prisma.payment.deleteMany({ where: { userId } });
      await prisma.subscription.deleteMany({ where: { userId } });
      await prisma.coupon.deleteMany({ where: { createdById: userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  // ------------------------------------------------------------------
  // Cenário 0 (sucesso): Cupom valido → aplica com desconto
  // ------------------------------------------------------------------
  describe('0. Aplica cupom valido (sucesso)', () => {
    it('POST /coupons/:code/apply → 200 + discount aplicado', async () => {
      // Criar cupom 20% valido
      const coupon = await prisma.coupon.create({
        data: {
          code: `VALIDO${Date.now()}`.slice(-12),
          percent: 20,
          active: true,
          maxUses: 100,
          usedCount: 0,
          validFrom: new Date(Date.now() - 3600000),
          validUntil: new Date(Date.now() + 3600000 * 24),
          createdById: userId,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/payment/checkout/apply-coupon')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ couponCode: coupon.code, paymentId })
        .expect(200);

      expect(res.body.error).toBe(false);
      expect(res.body.data.discountApplied).toBeDefined();

      // Verificar CouponUsage criado
      const usage = await prisma.couponUsage.findFirst({
        where: { couponId: coupon.id, paymentId },
      });
      expect(usage).not.toBeNull();

      // Verificar payment com desconto
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });
      expect(Number(updatedPayment!.amount)).toBeLessThan(500000);
    });
  });

  // ------------------------------------------------------------------
  // Cenário 1: Cupom inexistente → 404
  // ------------------------------------------------------------------
  describe('1. Cupom inexistente → 404', () => {
    it('POST /payment/checkout/apply-coupon (inexistente) → 404', async () => {
      await request(app.getHttpServer())
        .post('/payment/checkout/apply-coupon')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ couponCode: 'INEXISTENTE123', paymentId })
        .expect(404);
    });
  });

  // ------------------------------------------------------------------
  // Cenário 2: Cupom inativo (active=false) → 400
  // ------------------------------------------------------------------
  describe('2. Cupom inativo → 400', () => {
    it('cupom active=false → 400 com code cupom_inativo', async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: `INATIVO${Date.now()}`.slice(-12),
          percent: 30,
          active: false,
          maxUses: 100,
          usedCount: 0,
          validFrom: new Date(Date.now() - 3600000),
          validUntil: new Date(Date.now() + 3600000 * 24),
          createdById: userId,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/payment/checkout/apply-coupon')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ couponCode: coupon.code, paymentId })
        .expect(400);

      expect(res.body.code).toBe('cupom_inativo');
    });
  });

  // ------------------------------------------------------------------
  // Cenário 3: Cupom expirado (validUntil < now) → 400
  // ------------------------------------------------------------------
  describe('3. Cupom expirado → 400', () => {
    it('cupom validUntil no passado → 400 com code cupom_expirado', async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: `EXPIRADO${Date.now()}`.slice(-12),
          percent: 25,
          active: true,
          maxUses: 100,
          usedCount: 0,
          validFrom: new Date(Date.now() - 3600000 * 48),
          validUntil: new Date(Date.now() - 3600000), // 1h atrás
          createdById: userId,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/payment/checkout/apply-coupon')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ couponCode: coupon.code, paymentId })
        .expect(400);

      expect(res.body.code).toBe('cupom_expirado');
    });
  });

  // ------------------------------------------------------------------
  // Cenário 4: Cupom ainda não válido (validFrom > now) → 400
  // ------------------------------------------------------------------
  describe('4. Cupom ainda não válido → 400', () => {
    it('cupom validFrom no futuro → 400 com code cupom_ainda_nao_valido', async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: `FUTURO${Date.now()}`.slice(-12),
          percent: 15,
          active: true,
          maxUses: 100,
          usedCount: 0,
          validFrom: new Date(Date.now() + 3600000 * 24), // 24h no futuro
          validUntil: new Date(Date.now() + 3600000 * 48),
          createdById: userId,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/payment/checkout/apply-coupon')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ couponCode: coupon.code, paymentId })
        .expect(400);

      expect(res.body.code).toBe('cupom_ainda_nao_valido');
    });
  });

  // ------------------------------------------------------------------
  // Cenário 5: Cupom esgotado (usedCount >= maxUses) → 400
  // ------------------------------------------------------------------
  describe('5. Cupom esgotado → 400', () => {
    it('cupom usedCount == maxUses → 400 com code cupom_esgotado', async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: `ESGOTADO${Date.now()}`.slice(-12),
          percent: 10,
          active: true,
          maxUses: 1,
          usedCount: 1, // já esgotado
          validFrom: new Date(Date.now() - 3600000),
          validUntil: new Date(Date.now() + 3600000 * 24),
          createdById: userId,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/payment/checkout/apply-coupon')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ couponCode: coupon.code, paymentId })
        .expect(400);

      expect(res.body.code).toBe('cupom_esgotado');
    });
  });

  // ------------------------------------------------------------------
  // Cenário 6: Cupom já aplicado (UNIQUE violation) → 400
  // ------------------------------------------------------------------
  describe('6. Cupom já aplicado neste payment → 400', () => {
    it('mesmo cupom aplicado 2x → 400 com code cupom_ja_aplicado', async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: `REUSO${Date.now()}`.slice(-12),
          percent: 20,
          active: true,
          maxUses: 10,
          usedCount: 0,
          validFrom: new Date(Date.now() - 3600000),
          validUntil: new Date(Date.now() + 3600000 * 24),
          createdById: userId,
        },
      });

      // Primeira aplicação — sucesso
      await request(app.getHttpServer())
        .post('/payment/checkout/apply-coupon')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ couponCode: coupon.code, paymentId })
        .expect(200);

      // Criar novo payment
      const payRes = await request(app.getHttpServer())
        .post('/payment')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ amount: 300000, method: 'PIX', purpose: 'TOKEN_RESERVATION' })
        .expect(201);
      const newPaymentId = payRes.body.data.id;

      // Segunda aplicação do mesmo cupom (neste payment ou em payment diferente do mesmo user — UNIQUE couponId+paymentId)
      const res = await request(app.getHttpServer())
        .post('/payment/checkout/apply-coupon')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ couponCode: coupon.code, paymentId })
        .expect(400);

      expect(res.body.code).toBe('cupom_ja_aplicado');
    });
  });

  // ------------------------------------------------------------------
  // Cenário 7: Pagamento não-PENDING → 400
  // ------------------------------------------------------------------
  describe('7. Pagamento não-PENDING → 400', () => {
    it('aplicar cupom em payment PAID → 400 com code pagamento_nao_pendente', async () => {
      const coupon = await prisma.coupon.create({
        data: {
          code: `PAIDPAY${Date.now()}`.slice(-12),
          percent: 20,
          active: true,
          maxUses: 10,
          usedCount: 0,
          validFrom: new Date(Date.now() - 3600000),
          validUntil: new Date(Date.now() + 3600000 * 24),
          createdById: userId,
        },
      });

      // Marcar payment como PAID
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'PAID', paidAt: new Date() },
      });

      const res = await request(app.getHttpServer())
        .post('/payment/checkout/apply-coupon')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ couponCode: coupon.code, paymentId })
        .expect(400);

      expect(res.body.code).toBe('pagamento_nao_pendente');
    });
  });
});
