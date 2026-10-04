/**
 * E2E: Validar que o cadastro DISPARA o email de boas-vindas.
 *
 * User feedback: "so inclua o disparo do email de boas vindas"
 *
 * O backend (auth.service.ts:401) ja chama `sendWelcomeEmail` no cadastro.
 * Este teste valida explicitamente que:
 *   1. O metodo sendWelcomeEmail eh chamado durante o cadastro
 *   2. Com os parametros corretos (email, { nome, email })
 *   3. Antes do usuario ser redirecionado (sincronia)
 *
 * Estrategia: mockar o EmailService via Spy antes do app.init(), fazer
 * cadastro, verificar que o spy foi chamado.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { SessionService } from '../../../src/auth/session/session.service';
import { EmailService } from '../../../src/email/email.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { cleanupTestUser, countUserArtifacts } from './setup/db-cleanup';
import {
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
} from './setup/test-helpers';

describe('E2E - Email de Boas-Vindas no Cadastro (T022)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;
  let sessionService: SessionService;

  let sendWelcomeEmailSpy: jest.SpyInstance;
  let sendVerificationCodeEmailSpy: jest.SpyInstance;
  let sendValidationEmailSpy: jest.SpyInstance;

  const TEST_EMAIL = generateUniqueEmail();
  let userId: number;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    emailService = app.get(EmailService);
    sessionService = app.get(SessionService);

    // Spy no EmailService ANTES do cadastro.
    // Como AppModule ja foi instanciado, o emailService injetado no AuthService
    // eh o mesmo objeto que estamos espiando.
    sendWelcomeEmailSpy = jest
      .spyOn(emailService, 'sendWelcomeEmail')
      .mockResolvedValue({ success: true, message: 'mocked' });
    sendVerificationCodeEmailSpy = jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockResolvedValue({ success: true, message: 'mocked' });
    sendValidationEmailSpy = jest
      .spyOn(emailService, 'sendValidationEmail')
      .mockResolvedValue({ success: true, message: 'mocked' });
  });

  afterAll(async () => {
    if (userId) {
      const before = await countUserArtifacts(prisma, userId);
      await cleanupTestUser(prisma, TEST_EMAIL);
      const after = await countUserArtifacts(prisma, userId);
      console.log(`[CLEANUP T022] User ${userId} (${TEST_EMAIL}):`);
      console.log(`  before: ${JSON.stringify(before)}`);
      console.log(`  after:  ${JSON.stringify(after)}`);
      expect(after.user).toBe(0);
    }
    sendWelcomeEmailSpy.mockRestore();
    sendVerificationCodeEmailSpy.mockRestore();
    sendValidationEmailSpy.mockRestore();
    await app.close();
  });

  // ============ STEP UNICO: VALIDAR DISPARO DO WELCOME EMAIL ============
  describe('STEP 1: disparar welcome email no cadastro', () => {
    it('deve chamar sendWelcomeEmail com email + dados do usuario', async () => {
      // Reset spy counts para garantir isolamento
      sendWelcomeEmailSpy.mockClear();
      sendVerificationCodeEmailSpy.mockClear();
      sendValidationEmailSpy.mockClear();

      const registerDto = {
        email: TEST_EMAIL,
        nome: 'Maria Silva',
        senha: generateValidPassword(),
        senhaConfirmacao: generateValidPassword(),
        telefone: generateValidPhone(),
        termosAceitos: true,
        politicaAceita: true,
        urlRedirect: 'http://localhost:5173/home',
      };

      // ACT: fazer cadastro
      const res = await request(app.getHttpServer())
        .post('/auth/register/user')
        .send(registerDto)
        .expect(201);

      // Capture user info
      const user = await prisma.user.findUnique({
        where: { email: TEST_EMAIL },
      });
      expect(user).not.toBeNull();
      userId = user!.id;
      sessionId = res.body.data?.sessionId;

      // ASSERT 1: sendWelcomeEmail foi chamado EXATAMENTE 1 vez
      expect(sendWelcomeEmailSpy).toHaveBeenCalledTimes(1);

      // ASSERT 2: foi chamado com o email correto do usuario
      expect(sendWelcomeEmailSpy).toHaveBeenCalledWith(
        TEST_EMAIL.toLowerCase(),
        expect.objectContaining({
          email: TEST_EMAIL.toLowerCase(),
          nome: 'Maria Silva',
        }),
      );

      // ASSERT 3: sendVerificationCodeEmail tambem foi chamado (codigo 2FA)
      expect(sendVerificationCodeEmailSpy).toHaveBeenCalledTimes(1);
      const verificationCode = sendVerificationCodeEmailSpy.mock.calls[0][2];
      expect(sendVerificationCodeEmailSpy).toHaveBeenCalledWith(
        TEST_EMAIL.toLowerCase(),
        'Maria Silva',
        verificationCode,
        expect.any(String), // acao
        expect.any(String), // urlRedirect
      );
      expect(verificationCode).toMatch(/^\d{6}$/);
      expect(await sessionService.getVerificationCode(sessionId)).toBe(
        verificationCode,
      );

      // ASSERT 4: sendValidationEmail NAO foi chamado (NAO ha validacao automatica)
      // (Este teste serve para DOCUMENTAR essa ausencia)
      expect(sendValidationEmailSpy).not.toHaveBeenCalled();

      // ASSERT 5: relatorio final
      console.log(`
      ============================================
      [T022 - WELCOME EMAIL] RELATORIO FINAL
      ============================================
      User ID criado: ${userId}
      Email: ${TEST_EMAIL}
      Session ID: ${sessionId}
      ============================================
      Emails disparados no cadastro:
      ✅ sendWelcomeEmail           (chamado 1x com email + dados)
      ✅ sendVerificationCodeEmail   (chamado 1x com codigo 2FA)
      ❌ sendValidationEmail         (NAO chamado - sem validacao automatica)
      ============================================
      `);

      expect(userId).toBeDefined();
      expect(sendWelcomeEmailSpy).toHaveBeenCalledTimes(1);
    });
  });
});
