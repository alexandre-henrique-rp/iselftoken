/**
 * @description E2E — Installments (S06 T053).
 *
 * Cobre o fluxo completo de configuracao de parcelamento + checkout com parcelas.
 *
 * Cenarios:
 *  - GET /admin/installments/vigente retorna 200 + null quando sem config
 *  - POST /admin/installments cria config vigente
 *  - POST /admin/installments throws 422 quando maxInstallments > 18
 *  - GET /admin/installments lista historico
 *  - POST /admin/installments throws 403 quando USER tenta (sem ser ADMIN/FINANCEIRO)
 *  - POST /payment/checkout with installments=6 persiste snapshot
 *
 * runners: jest --config ./test/e2e/jest-e2e-flows.config.js
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
  generateValidPhone,
  buildAuthCookie,
} from './setup/test-helpers';

const TEST_PREFIX = `e2eInst_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

describe('Installments (S06) — E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  const TEST_EMAIL = generateUniqueEmail('e2eInst');
  const ADMIN_EMAIL = generateUniqueEmail('e2eInstAdmin');
  let userId: number;
  let adminUserId: number;
  let userSessionId: string;
  let adminSessionId: string;
  let twoFactorCode: string | undefined;

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

    // Mock EmailService — captura o codigo 2FA
    jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockImplementation(async (_to: string, _name: string, code: string) => {
        twoFactorCode = code;
        return { success: true, message: 'mocked' };
      });

    // 1. Registrar usuario USER
    await request(app.getHttpServer())
      .post('/auth/register/user')
      .send({
        email: TEST_EMAIL,
        nome: 'E2E Installment User',
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

    // Login USER + 2FA
    const loginRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: TEST_EMAIL, senha: generateValidPassword() })
      .expect(200);
    userSessionId = loginRes.body.data.sessionId;

    await request(app.getHttpServer())
      .post('/auth/verify-code')
      .set('Cookie', buildAuthCookie(userSessionId))
      .send({ codigo: twoFactorCode })
      .expect(200);

    // 2. Registrar ADMIN
    const hashedAdmin = await bcrypt.hash(generateValidPassword(), 10);
    const adminUser = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL.toLowerCase(),
        nome: 'E2E Installment Admin',
        senha: hashedAdmin,
        role: 'ADMIN',
        telefone: generateValidPhone(),
        termosAceitos: true,
        politicaAceita: true,
      },
    });
    adminUserId = adminUser.id;

    await prisma.wallet.create({
      data: { userId: adminUserId, balance: 0, blocked: 0, currency: 'BRL' },
    });

    // Login ADMIN + 2FA
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: ADMIN_EMAIL, senha: generateValidPassword() })
      .expect(200);
    adminSessionId = adminLoginRes.body.data.sessionId;

    // Store verification code for admin
    await sessionService.storeVerificationCode(adminSessionId, '123456', 300);

    await request(app.getHttpServer())
      .post('/auth/verify-code')
      .set('Cookie', buildAuthCookie(adminSessionId))
      .send({ codigo: '123456' })
      .expect(200);
  });

  afterAll(async () => {
    // Cleanup
    if (userId) {
      await prisma.payment.deleteMany({ where: { userId } });
      await prisma.subscription.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    if (adminUserId) {
      await prisma.installmentConfig.deleteMany({
        where: { createdById: adminUserId },
      });
      await prisma.user.delete({ where: { id: adminUserId } });
    }
    await app.close();
  });

  // ------------------------------------------------------------------
  // CT1: GET /admin/installments/vigente retorna 200 + null quando sem config
  // ------------------------------------------------------------------
  describe('CT1. GET /admin/installments/vigente sem config', () => {
    it('retorna 200 + null quando sem config vigente', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/installments/vigente')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .expect(200);

      expect(res.body.data).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // CT2: POST /admin/installments cria config vigente
  // ------------------------------------------------------------------
  describe('CT2. POST /admin/installments cria config', () => {
    it('cria config vigente e retorna 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/installments')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .send({
          interestRate: 0.0299,
          maxInstallments: 12,
          minInstallmentAmount: 50,
        })
        .expect(201);

      expect(res.body.error).toBe(false);
      expect(res.body.data.maxInstallments).toBe(12);
      expect(res.body.data.interestRate).toBe(0.0299);
      expect(res.body.data.isActive).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // CT3: POST /admin/installments throws 422 quando maxInstallments > 18
  // ------------------------------------------------------------------
  describe('CT3. POST /admin/installments validation', () => {
    it('throws 422 quando maxInstallments > 18', async () => {
      await request(app.getHttpServer())
        .post('/admin/installments')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .send({
          interestRate: 0.0299,
          maxInstallments: 24,
          minInstallmentAmount: 50,
        })
        .expect(422);
    });
  });

  // ------------------------------------------------------------------
  // CT4: GET /admin/installments lista historico
  // ------------------------------------------------------------------
  describe('CT4. GET /admin/installments lista historico', () => {
    it('retorna 200 com array de configs', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/installments')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .expect(200);

      expect(res.body.error).toBe(false);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  // ------------------------------------------------------------------
  // CT5: POST /admin/installments throws 403 quando USER tenta
  // ------------------------------------------------------------------
  describe('CT5. POST /admin/installments permission', () => {
    it('throws 403 quando USER tenta criar config', async () => {
      await request(app.getHttpServer())
        .post('/admin/installments')
        .set('Cookie', buildAuthCookie(userSessionId))
        .send({
          interestRate: 0.0299,
          maxInstallments: 12,
          minInstallmentAmount: 50,
        })
        .expect(403);
    });
  });

  // ------------------------------------------------------------------
  // CT6: DELETE /admin/installments/:id soft delete
  // ------------------------------------------------------------------
  describe('CT6. DELETE /admin/installments/:id', () => {
    it('soft delete desativa config e retorna 204', async () => {
      // Criar uma config para deletar
      const createRes = await request(app.getHttpServer())
        .post('/admin/installments')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .send({
          interestRate: 0.0199,
          maxInstallments: 6,
          minInstallmentAmount: 100,
        })
        .expect(201);

      const configId = createRes.body.data.id;

      await request(app.getHttpServer())
        .delete(`/admin/installments/${configId}`)
        .set('Cookie', buildAuthCookie(adminSessionId))
        .expect(204);

      // Verificar que foi desativada
      const vigenciaRes = await request(app.getHttpServer())
        .get('/admin/installments/vigente')
        .set('Cookie', buildAuthCookie(adminSessionId))
        .expect(200);

      // A vigente deve ser a nova (id diferente)
      expect(vigenciaRes.body.data.id).not.toBe(configId);
    });
  });

  // ------------------------------------------------------------------
  // CT7: GET /payment/:id/installments — simulação (fonte de verdade backend)
  // ------------------------------------------------------------------
  describe('CT7. GET /payment/:id/installments simulação', () => {
    let paymentId: number;

    beforeAll(async () => {
      // Garante config vigente conhecida: taxa 2.99%, max 12, min R$100.
      await prisma.installmentConfig.updateMany({
        where: { effectiveUntil: null },
        data: { effectiveUntil: new Date() },
      });
      await prisma.installmentConfig.create({
        data: {
          interestRate: 0.0299,
          monthlyInterestRate: 0.0299,
          maxInstallments: 12,
          minInstallmentAmount: 100,
          effectiveFrom: new Date(),
          effectiveUntil: null,
          isActive: true,
          createdById: adminUserId,
        },
      });

      // Cria um Payment PENDING de R$ 1000 para o USER.
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount: 1000,
          method: 'CREDIT_CARD',
          purpose: 'SUBSCRIPTION',
          status: 'PENDING',
        },
      });
      paymentId = payment.id;
    });

    it('retorna 1x = principal (sem juros) e 12x com juros compostos', async () => {
      const res = await request(app.getHttpServer())
        .get(`/payment/${paymentId}/installments`)
        .set('Cookie', buildAuthCookie(userSessionId))
        .expect(200);

      expect(res.body.error).toBe(false);
      const { options, minInstallmentAmount } = res.body.data;
      expect(minInstallmentAmount).toBe(100);
      expect(options).toHaveLength(12);

      // 1x: sem juros, parcela = principal.
      expect(options[0].installments).toBe(1);
      expect(options[0].installmentAmount).toBe(1000);
      expect(options[0].totalInterest).toBe(0);
      expect(options[0].belowMinimum).toBe(false);

      // 12x: juros compostos → total > principal; parcela acima do mínimo.
      const twelve = options[11];
      expect(twelve.installments).toBe(12);
      expect(twelve.totalWithInterest).toBeGreaterThan(1000);
      expect(twelve.belowMinimum).toBe(false);
    });

    it('retorna 403 quando outro usuário tenta simular', async () => {
      await request(app.getHttpServer())
        .get(`/payment/${paymentId}/installments`)
        .set('Cookie', buildAuthCookie(adminSessionId))
        .expect(403);
    });
  });
});
