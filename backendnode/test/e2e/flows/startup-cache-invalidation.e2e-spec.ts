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
import { cleanupTestUser, countUserArtifacts } from './setup/db-cleanup';

interface SessionData {
  email: string;
  startups?: Record<string, unknown>[];
  [key: string]: unknown;
}

describe('E2E Real Flow - Startup Cache Invalidation (T026)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  const TEST_EMAIL = generateUniqueEmail();
  const TEST_EMAIL_LOWER = TEST_EMAIL.toLowerCase();
  let userId: number;
  let sessionId: string;
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
    if (userId) {
      await cleanupTestUser(prisma, TEST_EMAIL);
    }
    await app.close();
  });

  describe('Fluxo: criar startup e verificar que cache e invalidado', () => {
    it('STEP 1: cadastrar usuario founder', async () => {
      const registerDto = {
        email: TEST_EMAIL,
        nome: 'Founder Teste',
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

    it('STEP 2: validar email e fazer login completo (2FA)', async () => {
      // Validate email code
      await request(app.getHttpServer())
        .post('/auth/validate-email-code')
        .send({ sessionId, code: '123456' })
        .expect(200);

      // Login to get 2FA cookie
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: TEST_EMAIL,
          senha: generateValidPassword(),
          codigo: twoFactorCode,
        })
        .expect(200);

      expect(loginRes.body.error).toBe(false);
      expect(loginRes.headers['set-cookie']).toBeDefined();

      // Verify session exists in Redis
      const session = await sessionService.getSession(
        loginRes.body.data.sessionId,
      );
      expect(session).not.toBeNull();
      expect((session as SessionData).email.toLowerCase()).toBe(
        TEST_EMAIL_LOWER,
      );
    });

    it('STEP 3: comprar plano FUNDADOR para ter acesso a criacao de startup', async () => {
      // Get C6 plan
      const planRes = await request(app.getHttpServer())
        .get('/plans/founder')
        .expect(200);

      expect(planRes.body.data).toHaveProperty('id');

      // Subscribe to plan (mock C6 payment)
      const subRes = await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          planId: planRes.body.data.id,
          paymentMethod: 'C6_CREDIT',
        })
        .expect(201);

      expect(subRes.body.error).toBe(false);
    });

    it('STEP 4: GET /users/me deve retornar startups vazio inicialmente', async () => {
      const meRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      expect(meRes.body.error).toBe(false);
      expect(meRes.body.data.startups).toBeDefined();
      expect(Array.isArray(meRes.body.data.startups)).toBe(true);
      expect(meRes.body.data.startups.length).toBe(0);
    });

    it('STEP 5: POST /startup criar nova startup', async () => {
      const startupRes = await request(app.getHttpServer())
        .post('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          nomeFantasia: 'Startup Teste Cache',
          razaoSocial: 'Startup Teste Cache LTDA',
          cnpj: '12345678000199',
          areaAtuacao: 'Tecnologia',
          estagio: 'SEED',
          descricao: 'Startup para testar invalidacao de cache',
          dataAbertura: '2020',
          banco: 'C6 Bank',
          agencia: '0001',
          conta: '123456',
          digito: '7',
          titular: 'Founder Teste',
        })
        .expect(201);

      expect(startupRes.body.error).toBe(false);
      expect(startupRes.body.data).toHaveProperty('id');
      expect(startupRes.body.data.nome).toBe('Startup Teste Cache');
    });

    it('STEP 6: GET /users/me deve retornar a nova startup (cache invalidado)', async () => {
      const meRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      expect(meRes.body.error).toBe(false);
      expect(meRes.body.data.startups).toBeDefined();
      expect(Array.isArray(meRes.body.data.startups)).toBe(true);
      expect(meRes.body.data.startups.length).toBeGreaterThan(0);
      expect(
        meRes.body.data.startups.some(
          (s: any) => s.nome === 'Startup Teste Cache',
        ),
      ).toBe(true);
    });

    it('STEP 7: DELETE /startup/:id remover startup e verificar cache invalidado', async () => {
      // First get the startup id
      const startupsRes = await request(app.getHttpServer())
        .get('/startup/my')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      expect(startupsRes.body.data).toBeDefined();
      expect(startupsRes.body.data.length).toBeGreaterThan(0);

      const startupToDelete = startupsRes.body.data.find((s: any) =>
        s.nome.includes('Startup Teste Cache'),
      );
      expect(startupToDelete).toBeDefined();

      // Delete the startup
      await request(app.getHttpServer())
        .delete(`/startup/${startupToDelete.id}`)
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      // Verify cache was invalidated - startups should be empty again
      const meRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', buildAuthCookie(sessionId))
        .expect(200);

      expect(meRes.body.error).toBe(false);
      // After deletion, the list should not contain the deleted startup
      const deletedStartup = meRes.body.data.startups.find(
        (s: any) => s.nome === 'Startup Teste Cache',
      );
      expect(deletedStartup).toBeUndefined();
    });
  });
});
