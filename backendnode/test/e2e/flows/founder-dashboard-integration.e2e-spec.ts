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
  generateValidCnpj,
  buildAuthCookie,
} from './setup/test-helpers';

/**
 * E2E test: founder-dashboard integration
 *
 * Valida o fluxo completo:
 * 1. Criar user com subscription FOUNDER ACTIVE (via plan purchase + simulate-paid)
 * 2. POST /startup → startup criada com status PENDING_RESERVATION_PAYMENT
 * 3. POST /payment com purpose TOKEN_RESERVATION → payment PENDING
 * 4. Validar no DB: startup.status = PENDING_RESERVATION_PAYMENT, payment.purpose = TOKEN_RESERVATION
 * 5. Cleanup: deletar startup + payment + subscription + user
 */
describe('E2E Real Flow - Founder Dashboard Integration (T023)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  const TEST_EMAIL = generateUniqueEmail('e2eT023');
  const TEST_EMAIL_LOWER = TEST_EMAIL.toLowerCase();
  let userId: number;
  let sessionId: string;
  let twoFactorCode: string | undefined;

  // IDs criados durante o teste
  let startupId: number;
  let subscriptionId: number;
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
    sessionService = app.get(SessionService);
    emailService = app.get(EmailService);

    // Mock EmailService
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
    // Cleanup na ordem correta (respeitando FKs)
    if (startupId) {
      await prisma.startup.deleteMany({ where: { id: startupId } });
    }
    if (paymentId) {
      await prisma.payment.deleteMany({ where: { id: paymentId } });
    }
    if (subscriptionId) {
      await prisma.subscription.deleteMany({ where: { id: subscriptionId } });
    }
    if (userId) {
      // Deletar artefatos do user
      await prisma.accessLog.deleteMany({ where: { userId } });
      await prisma.emailValidation.deleteMany({ where: { userId } });
      await prisma.backupUser.deleteMany({ where: { userId } });
      await prisma.walletTransaction.deleteMany({
        where: { wallet: { userId } },
      });
      await prisma.wallet.deleteMany({ where: { userId } });
      await prisma.token.deleteMany({ where: { userId } });
      await prisma.investment.deleteMany({ where: { userId } });
      await prisma.auditLog.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  // ============ STEP 1: CADASTRO ============
  describe('STEP 1: Cadastro de usuario founder', () => {
    it('deve cadastrar usuario e criar sessao', async () => {
      const registerDto = {
        email: TEST_EMAIL,
        nome: 'Joao Fundador',
        senha: generateValidPassword(),
        senhaConfirmacao: generateValidPassword(),
        telefone: generateValidPhone(),
        termosAceitos: true,
        politicaAceita: true,
        codigo: '123456',
        urlRedirect: 'http://localhost:5173/home',
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register/user')
        .send(registerDto)
        .expect(201);

      expect(res.body.error).toBe(false);
      expect(res.body.data).toHaveProperty('sessionId');

      sessionId = res.body.data.sessionId;
      const user = await prisma.user.findUnique({
        where: { email: TEST_EMAIL_LOWER },
      });
      expect(user).not.toBeNull();
      userId = user!.id;
    });
  });

  // ============ STEP 2: COMPRAR PLANO FUNDADOR ============
  describe('STEP 2: Comprar plano FUNDADOR', () => {
    it('deve listar planos e encontrar FUNDADOR', async () => {
      const res = await request(app.getHttpServer())
        .get('/plans')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      const fundadorPlan = res.body.data.find((p: any) =>
        p.slug?.toLowerCase().includes('fundador'),
      );
      expect(fundadorPlan).toBeDefined();
      expect(Number(fundadorPlan.preco)).toBeGreaterThan(0);
    });

    it('deve criar Subscription PENDING e Payment SUBSCRIPTION, depois simular pago', async () => {
      // Buscar plano FUNDADOR
      const plansRes = await request(app.getHttpServer())
        .get('/plans')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      const fundadorPlan = plansRes.body.data.find((p: any) =>
        p.slug?.toLowerCase().includes('fundador'),
      );
      const planId = fundadorPlan.id;
      const planPrice = Number(fundadorPlan.preco);

      // Criar subscription PENDING
      const subRes = await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({ userId, planId, status: 'PENDING' })
        .expect(201);

      subscriptionId = subRes.body.data.id;
      expect(subRes.body.data.status).toBe('PENDING');

      // Criar payment SUBSCRIPTION
      const payRes = await request(app.getHttpServer())
        .post('/payment')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          amount: planPrice,
          method: 'PIX',
          purpose: 'SUBSCRIPTION',
          subscriptionId,
        })
        .expect(201);

      paymentId = payRes.body.data.id;
      expect(payRes.body.data.status).toBe('PENDING');
      expect(payRes.body.data.purpose).toBe('SUBSCRIPTION');

      // Simular pagamento para ativar subscription
      await request(app.getHttpServer())
        .post(`/payment/${paymentId}/dev/simulate-paid`)
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(201);

      // Verificar subscription ativa
      const sub = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });
      expect(sub!.status).toBe('ACTIVE');

      // Atualizar cache de sessao para refletir subscription ativa
      const freshUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscriptions: { include: { plan: true } } },
      });
      const existingSession = await sessionService.getSession(sessionId);
      const updatedSession = {
        ...freshUser,
        af2Verified: true,
        lastAccessAt: new Date().toISOString(),
      };
      await sessionService.updateSession(sessionId, updatedSession as any);
    });
  });

  // ============ STEP 3: CRIAR STARTUP ============
  describe('STEP 3: Criar startup via POST /startup', () => {
    it('deve criar startup com status PENDING_RESERVATION_PAYMENT', async () => {
      const startupPayload = {
        nomeFantasia: 'TechNova MVP',
        razaoSocial: 'TechNova Tecnologia LTDA',
        cnpj: generateValidCnpj(),
        dataAbertura: '2020-01-15',
        paisIso3: 'BRA',
        areaAtuacao: 'tecnologia_saas',
        estagio: 'mvp',
        descricao:
          'Plataforma SaaS para automacao financeira de PMEs brasileiras.',
        titular: 'Joao Fundador',
        banco: '000',
        agencia: '0001',
        conta: '123456',
        digito: '7',
        metaCaptacao: 500000,
        equityOferecido: 10,
      };

      const res = await request(app.getHttpServer())
        .post('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .send(startupPayload)
        .expect(201);
      expect(res.body.data).toHaveProperty('id');
      startupId = res.body.data.id;
      expect(res.body.data.status).toBe('PENDING_RESERVATION_PAYMENT');
    });

    it('deve falhar com CNPJ invalido', async () => {
      const invalidPayload = {
        nomeFantasia: 'Teste',
        razaoSocial: 'Teste LTDA',
        cnpj: '11.444.777/0001-80', // CNPJ com DV errado (DV correto seria 61)
        dataAbertura: '2020-01-15',
        paisIso3: 'BRA',
        areaAtuacao: 'tecnologia_saas',
        estagio: 'mvp',
        descricao: 'Descricao valida com mais de 10 caracteres para teste.',
        titular: 'Teste',
        banco: '000',
        agencia: '0001',
        conta: '123456',
        digito: '7',
        metaCaptacao: 500000,
        equityOferecido: 10,
      };

      const res = await request(app.getHttpServer())
        .post('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .send(invalidPayload);

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============ STEP 4: CRIAR PAYMENT TOKEN_RESERVATION ============
  describe('STEP 4: Criar payment TOKEN_RESERVATION via POST /payment', () => {
    it('deve criar payment PENDING com purpose TOKEN_RESERVATION', async () => {
      const paymentPayload = {
        amount: 500,
        method: 'PIX',
        purpose: 'TOKEN_RESERVATION',
        campaignId: null,
      };

      const res = await request(app.getHttpServer())
        .post('/payment')
        .set('Cookie', buildAuthCookie(sessionId))
        .send(paymentPayload)
        .expect(201);

      expect(res.body.data).toHaveProperty('id');
      const newPaymentId = res.body.data.id;
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.purpose).toBe('TOKEN_RESERVATION');
      expect(Number(res.body.data.amount)).toBe(500);

      // Guardar para cleanup
      paymentId = newPaymentId;
    });
  });

  // ============ STEP 5: VERIFICAR NO DB ============
  describe('STEP 5: Verificar estado no banco de dados', () => {
    it('startup deve ter status PENDING_RESERVATION_PAYMENT', async () => {
      const startup = await prisma.startup.findUnique({
        where: { id: startupId },
      });
      expect(startup).not.toBeNull();
      expect(startup!.status).toBe('PENDING_RESERVATION_PAYMENT');
    });

    it('payment deve ter purpose TOKEN_RESERVATION e status PENDING', async () => {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });
      expect(payment).not.toBeNull();
      expect(payment!.purpose).toBe('TOKEN_RESERVATION');
      expect(payment!.status).toBe('PENDING');
      expect(Number(payment!.amount)).toBe(500);
    });

    it('subscription do founder deve estar ACTIVE', async () => {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });
      expect(subscription).not.toBeNull();
      expect(subscription!.status).toBe('ACTIVE');
    });
  });
});
