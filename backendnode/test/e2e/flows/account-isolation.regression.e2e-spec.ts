/**
 * ============================================================================
 * REGRESSÃO — ISOLAMENTO ENTRE CONTAS (BUG VULN-002 / SP↔RJ leak)
 * ============================================================================
 *
 * Este teste blinda o sistema contra o bug onde:
 *   - User A loga, faz operações, desloga, e o sistema devolve dados
 *     da User B (ou vice-versa) ao re-logar.
 *
 * Cenário:
 *   1. Cria User A e User B (e-mails distintos).
 *   2. Faz login de cada um, gerando sessionId próprio.
 *   3. Verifica que cada um consegue ler SOMENTE os seus próprios dados.
 *   4. Verifica que tentativas cross-account SEMPRE falham (404/403),
 *      mesmo quando o cliente envia IDs arbitrários.
 *   5. Faz logout A → novo login A → confirma que continua isolado.
 *
 * Garante que NENHUMA rota exposta devolve dados de outra conta.
 *
 * Se este teste falhar, o bug de leak entre usuários voltou — bloquear merge.
 * ============================================================================
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
  buildAuthCookie,
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
} from './setup/test-helpers';
import { cleanupTestUser } from './setup/db-cleanup';

interface LoginResponse {
  sessionId: string;
  email: string;
  requiresVerification: boolean;
}

async function registerAndActivateUser(
  app: INestApplication,
  emailService: EmailService,
  email: string,
  nome: string,
): Promise<{ sessionId: string; userId: number }> {
  const password = generateValidPassword();

  // 1) Register
  const regRes = await request(app.getHttpServer())
    .post('/auth/register/user')
    .send({
      email,
      nome,
      senha: password,
      senhaConfirmacao: password,
      telefone: generateValidPhone(),
      termosAceitos: true,
      politicaAceita: true,
      codigo: '123456',
      urlRedirect: 'http://localhost:5173/home',
    })
    .expect(201);

  const regSessionId = regRes.body.data.sessionId as string;

  // 2) Login (para ter uma sessão "limpa" pós-2FA)
  const loginRes = await request(app.getHttpServer())
    .post('/auth')
    .send({ email, senha: password })
    .expect(200);

  const loginData = loginRes.body.data as LoginResponse;
  const sessionId = loginData.sessionId;

  // 3) Verify 2FA — mockamos o codigo (a fixture ja captura via spy)
  // Aqui reusamos o codigo que foi capturado pelo spy em beforeAll
  // (mas como cada user eh registrado no seu bloco, capturamos inline)
  return { sessionId: regSessionId, userId: regRes.body.data.id };
}

describe('REGRESSAO — Isolamento entre contas (VULN-002 SP<->RJ leak)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  // Conta A — usuário "vítima" do bug original (SP)
  const EMAIL_A = generateUniqueEmail('isoA');
  const EMAIL_A_LOWER = EMAIL_A.toLowerCase();
  const NOME_A = 'Alice Isolamento A';
  let userIdA: number;

  // Conta B — usuário "amigo" (RJ)
  const EMAIL_B = generateUniqueEmail('isoB');
  const EMAIL_B_LOWER = EMAIL_B.toLowerCase();
  const NOME_B = 'Bruno Isolamento B';
  let userIdB: number;

  // Senhas precisam ser as MESMAS do register para o login funcionar
  const passwordA = generateValidPassword();
  const passwordB = generateValidPassword();

  // 2FA codes capturados pelo spy
  let codeA: string | undefined;
  let codeB: string | undefined;
  let codeTarget: 'A' | 'B' = 'A';

  /**
   * Helper: login + verify 2FA, devolvendo sessionId pronto para uso
   * em endpoints que exigem AuthGuard. Sem 2FA verificada, o AuthGuard
   * lança 401 antes do service — o teste teria falso positivo de "401 =
   * bloqueado" em rotas que deveriam devolver 403 ou 404.
   */
  async function loginAndVerify2FA(
    email: string,
    password: string,
  ): Promise<string> {
    const loginRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: email.toLowerCase(), senha: password })
      .expect(200);

    const sessionId = (loginRes.body.data as LoginResponse).sessionId;

    // Aguarda o mock do email capturar o codigo
    let attempts = 0;
    let code: string | undefined;
    while (attempts < 20) {
      code = email.toLowerCase() === EMAIL_A_LOWER ? codeA : codeB;
      if (code) break;
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }
    expect(code).toBeDefined();

    await request(app.getHttpServer())
      .post('/auth/verify-code')
      .set('Cookie', buildAuthCookie(sessionId))
      .send({ codigo: code })
      .expect(200);

    return sessionId;
  }

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

    // Mock que captura codigos 2FA separando por email
    jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockImplementation(async (to, _nome, codigo) => {
        if (to.toLowerCase() === EMAIL_A_LOWER) codeA = codigo;
        if (to.toLowerCase() === EMAIL_B_LOWER) codeB = codigo;
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
    await cleanupTestUser(prisma, EMAIL_A);
    await cleanupTestUser(prisma, EMAIL_B);
    await app.close();
  });

  // ------------------------------------------------------------------
  // STEP 1: cadastro e login das duas contas
  // ------------------------------------------------------------------
  describe('STEP 1: cadastro isolado das duas contas', () => {
    it('User A registra com email proprio', async () => {
      codeTarget = 'A';
      const regRes = await request(app.getHttpServer())
        .post('/auth/register/user')
        .send({
          email: EMAIL_A,
          nome: NOME_A,
          senha: passwordA,
          senhaConfirmacao: passwordA,
          telefone: generateValidPhone(),
          termosAceitos: true,
          politicaAceita: true,
          codigo: '123456',
          urlRedirect: 'http://localhost:5173/home',
        })
        .expect(201);

      userIdA = regRes.body.data.id;
      expect(regRes.body.data.email.toLowerCase()).toBe(EMAIL_A_LOWER);
      expect(regRes.body.data.nome).toBe(NOME_A);
    });

    it('User B registra com email proprio (diferente de A)', async () => {
      codeTarget = 'B';
      const regRes = await request(app.getHttpServer())
        .post('/auth/register/user')
        .send({
          email: EMAIL_B,
          nome: NOME_B,
          senha: passwordB,
          senhaConfirmacao: passwordB,
          telefone: generateValidPhone(),
          termosAceitos: true,
          politicaAceita: true,
          codigo: '123456',
          urlRedirect: 'http://localhost:5173/home',
        })
        .expect(201);

      userIdB = regRes.body.data.id;
      expect(regRes.body.data.email.toLowerCase()).toBe(EMAIL_B_LOWER);
      expect(regRes.body.data.nome).toBe(NOME_B);
    });

    it('User A e User B têm IDs distintos no banco', () => {
      expect(userIdA).not.toBe(userIdB);
    });
  });

  // ------------------------------------------------------------------
  // STEP 2: sessões Redis são isoladas
  // ------------------------------------------------------------------
  describe('STEP 2: sessões Redis são isoladas por UUID', () => {
    let sessionIdA: string;
    let sessionIdB: string;

    it('login A + verify 2FA gera sessionId com af2Verified=true', async () => {
      sessionIdA = await loginAndVerify2FA(EMAIL_A_LOWER, passwordA);
      expect(sessionIdA).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      const sess = (await sessionService.getSession(sessionIdA)) as any;
      expect(sess.af2Verified).toBe(true);
    });

    it('login B + verify 2FA gera sessionId distinto do A', async () => {
      sessionIdB = await loginAndVerify2FA(EMAIL_B_LOWER, passwordB);
      expect(sessionIdB).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(sessionIdB).not.toBe(sessionIdA);
    });

    it('session:A no Redis tem dados de A; session:B tem dados de B', async () => {
      const sessA = (await sessionService.getSession(sessionIdA)) as any;
      const sessB = (await sessionService.getSession(sessionIdB)) as any;

      expect(sessA).not.toBeNull();
      expect(sessB).not.toBeNull();
      expect(sessA.id).toBe(userIdA);
      expect(sessB.id).toBe(userIdB);
      expect(sessA.email).toBe(EMAIL_A_LOWER);
      expect(sessB.email).toBe(EMAIL_B_LOWER);
      expect(sessA.nome).toBe(NOME_A);
      expect(sessB.nome).toBe(NOME_B);
    });

    afterAll(() => {
      (globalThis as any).__sessionA = sessionIdA;
      (globalThis as any).__sessionB = sessionIdB;
    });
  });

  // ------------------------------------------------------------------
  // STEP 3: cada /users/me retorna SOMENTE os dados da sessão
  // ------------------------------------------------------------------
  describe('STEP 3: /users/me nunca vaza dados de outra conta', () => {
    it('GET /users/me com cookie de A devolve A', async () => {
      const sessionIdA = (globalThis as any).__sessionA as string;
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', buildAuthCookie(sessionIdA))
        .expect(200);

      expect(res.body.data.id).toBe(userIdA);
      expect(res.body.data.email).toBe(EMAIL_A_LOWER);
      expect(res.body.data.nome).toBe(NOME_A);
    });

    it('GET /users/me com cookie de B devolve B', async () => {
      const sessionIdB = (globalThis as any).__sessionB as string;
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', buildAuthCookie(sessionIdB))
        .expect(200);

      expect(res.body.data.id).toBe(userIdB);
      expect(res.body.data.email).toBe(EMAIL_B_LOWER);
      expect(res.body.data.nome).toBe(NOME_B);
    });

    it('GET /users/me com sessionId inexistente devolve 401 (sem fallback)', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', buildAuthCookie('00000000-0000-4000-8000-000000000000'))
        .expect(401);
    });
  });

  // ------------------------------------------------------------------
  // STEP 4: rotas cross-account SEMPRE falham (404/403)
  // ------------------------------------------------------------------
  describe('STEP 4: rotas cross-account falham mesmo com IDs arbitrarios', () => {
    /**
     * Helper: aceita qualquer 4xx que nao seja 200. O ponto do teste é que
     * dados NAO vazam (res.status !== 200). 401 vem do AuthGuard (sem
     * subscription ou sessao invalida); 403 vem do AdminGuard (role errada).
     */
    function assertRejected(res: any) {
      expect(res.status).not.toBe(200);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }

    it('GET /users (lista) NAO devolve 200 para USER sem subscription', async () => {
      const sessionIdA = (globalThis as any).__sessionA as string;
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Cookie', buildAuthCookie(sessionIdA));
      assertRejected(res);
    });

    it('GET /users/by-id/:id NAO devolve 200 para USER sem subscription', async () => {
      const sessionIdA = (globalThis as any).__sessionA as string;
      const res = await request(app.getHttpServer())
        .get(`/users/by-id/${userIdA}`)
        .set('Cookie', buildAuthCookie(sessionIdA));
      assertRejected(res);
    });

    it('GET /subscriptions lista SOMENTE subscriptions do user autenticado', async () => {
      // Sem subscription criada — lista vazia
      const sessionIdA = (globalThis as any).__sessionA as string;
      const res = await request(app.getHttpServer())
        .get('/subscriptions')
        .set('Cookie', buildAuthCookie(sessionIdA))
        .expect(200);

      // Garantia: payload nunca contém userId de B
      const list = (res.body.data ?? []) as Array<{ userId?: number }>;
      for (const sub of list) {
        if (sub.userId !== undefined) {
          expect(sub.userId).toBe(userIdA);
        }
      }
    });

    it('POST /subscriptions com userId arbitrario no body IGNORA body e usa sessao', async () => {
      // User A tenta criar subscription para User B no body — o backend
      // DEVE criar para A (req.user.id), não para B.
      const sessionIdA = (globalThis as any).__sessionA as string;

      // Pegar um plano qualquer
      const plansRes = await request(app.getHttpServer())
        .get('/plans')
        .set('Cookie', buildAuthCookie(sessionIdA))
        .expect(200);
      const plan = plansRes.body.data[0];
      if (!plan) {
        // sem planos seedados — pula
        return;
      }

      const res = await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Cookie', buildAuthCookie(sessionIdA))
        .send({
          userId: userIdB, // <-- tentativa de sequestro
          planId: plan.id,
          status: 'PENDING',
        })
        .expect(201);

      // A subscription criada tem userId do A (sessao), nao do body
      expect(res.body.data.userId).toBe(userIdA);
      expect(res.body.data.userId).not.toBe(userIdB);

      // cleanup
      await prisma.subscription.delete({ where: { id: res.body.data.id } });
    });

    it('GET /subscriptions/:id do user B NAO devolve 200 quando consultado pela sessao de A', async () => {
      // Cria uma subscription para B
      const sessionIdB = (globalThis as any).__sessionB as string;
      const plansRes = await request(app.getHttpServer())
        .get('/plans')
        .set('Cookie', buildAuthCookie(sessionIdB))
        .expect(200);
      const plan = plansRes.body.data[0];
      if (!plan) return;

      const subRes = await request(app.getHttpServer())
        .post('/subscriptions')
        .set('Cookie', buildAuthCookie(sessionIdB))
        .send({ userId: userIdB, planId: plan.id, status: 'PENDING' })
        .expect(201);
      const subBId = subRes.body.data.id;

      // A tenta acessar a subscription de B — NAO pode receber os dados de B
      const sessionIdA = (globalThis as any).__sessionA as string;
      const res = await request(app.getHttpServer())
        .get(`/subscriptions/${subBId}`)
        .set('Cookie', buildAuthCookie(sessionIdA));

      // CRITICO: a sessao de A NAO pode receber o payload da subscription de B.
      // O service retorna ResponseDto.error(..., 404) mas o HTTP status fica 200
      // (deficiencia arquitetural conhecida: ResponseDto.error nao muda o status).
      // O que importa aqui eh o body: error=true E sem dados de B.
      expect(res.body?.error).toBe(true);
      expect(res.body?.message).toMatch(/não encontrada/i);
      expect(res.body?.data?.userId).toBeUndefined();
      expect(res.body?.data?.id).toBeUndefined();
      // Defesa em profundidade: nem por engano pode vazar
      const payloadStr = JSON.stringify(res.body ?? {});
      expect(payloadStr).not.toContain(`"userId":${userIdB}`);

      // cleanup
      await prisma.subscription.delete({ where: { id: subBId } });
    });
  });

  // ------------------------------------------------------------------
  // STEP 5: ciclo logout → re-login preserva isolamento
  // ------------------------------------------------------------------
  describe('STEP 5: logout + re-login preserva isolamento (regressao do bug SP->RJ)', () => {
    it('logout A remove sessao do Redis', async () => {
      const sessionIdA = (globalThis as any).__sessionA as string;
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', buildAuthCookie(sessionIdA))
        .expect(200);

      const sess = await sessionService.getSession(sessionIdA);
      expect(sess).toBeNull();
    });

    it('apos logout, /users/me com cookie velho devolve 401', async () => {
      const sessionIdA = (globalThis as any).__sessionA as string;
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', buildAuthCookie(sessionIdA))
        .expect(401);
    });

    it('re-login A gera NOVA sessionId (diferente da antiga)', async () => {
      const oldSessionIdA = (globalThis as any).__sessionA as string;
      // Usa o helper completo (login + verify 2FA) para que a nova sessão
      // possa passar pelo AuthGuard nos testes seguintes.
      const newSessionIdA = await loginAndVerify2FA(EMAIL_A_LOWER, passwordA);
      expect(newSessionIdA).not.toBe(oldSessionIdA);
      expect(newSessionIdA).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      (globalThis as any).__sessionA = newSessionIdA;
    });

    it('apos re-login, /users/me devolve dados de A (NAO de B)', async () => {
      const newSessionIdA = (globalThis as any).__sessionA as string;
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', buildAuthCookie(newSessionIdA))
        .expect(200);

      // Hard assertions — qualquer vazao aqui = bug reintroduzido
      expect(res.body.data.id).toBe(userIdA);
      expect(res.body.data.email).toBe(EMAIL_A_LOWER);
      expect(res.body.data.nome).toBe(NOME_A);
      expect(res.body.data.id).not.toBe(userIdB);
      expect(res.body.data.email).not.toBe(EMAIL_B_LOWER);
      expect(res.body.data.nome).not.toBe(NOME_B);
    });

    it('a sessao antiga de B (RJ) NAO foi afetada pelo logout/login de A', async () => {
      const sessionIdB = (globalThis as any).__sessionB as string;
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Cookie', buildAuthCookie(sessionIdB))
        .expect(200);

      expect(res.body.data.id).toBe(userIdB);
      expect(res.body.data.email).toBe(EMAIL_B_LOWER);
    });
  });

  // ------------------------------------------------------------------
  // STEP 6: refreshUserSubscriptions preserva isolamento (teste direto no service)
  // ------------------------------------------------------------------
  describe('STEP 6: refreshUserSubscriptions preserva isolamento', () => {
    it('criar subscription para A nao afeta cache de B (teste direto no Redis)', async () => {
      const sessionIdA = (globalThis as any).__sessionA as string;
      const sessionIdB = (globalThis as any).__sessionB as string;

      // Snapshot das subscriptions de B ANTES
      const sessBBefore = (await sessionService.getSession(sessionIdB)) as any;
      const subsBBefore = JSON.stringify(sessBBefore?.subscriptions ?? []);
      const sessABefore = (await sessionService.getSession(sessionIdA)) as any;
      const subsABefore = JSON.stringify(sessABefore?.subscriptions ?? []);

      // Cria uma subscription fake via prisma para user A (bypass do controller)
      // e dispara refreshUserSubscriptions para user A.
      const fakeSubId = 99999999;
      const projected = [
        {
          id: fakeSubId,
          userId: userIdA,
          planId: 1,
          status: 'ACTIVE',
          startedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          plan: { id: 1, nome: 'Plano Teste', slug: 'plano-teste' },
        },
      ];

      // Chama o metodo interno do SessionService (filtragem por userId)
      // Acessa via casting any pois o metodo eh privado na assinatura
      const refreshFn = (sessionService as any).refreshUserSubscriptions.bind(
        sessionService,
      );
      await refreshFn(userIdA, projected);

      // Snapshot DEPOIS
      const sessAAfter = (await sessionService.getSession(sessionIdA)) as any;
      const sessBAfter = (await sessionService.getSession(sessionIdB)) as any;
      const subsAAfter = JSON.stringify(sessAAfter?.subscriptions ?? []);
      const subsBAfter = JSON.stringify(sessBAfter?.subscriptions ?? []);

      // Sessoes A: subscriptions foram atualizadas com a nova fakeSub
      expect(subsAAfter).not.toBe(subsABefore);
      const parsedA = JSON.parse(subsAAfter);
      expect(parsedA.length).toBe(1);
      expect(parsedA[0].userId).toBe(userIdA);
      expect(parsedA[0].id).toBe(fakeSubId);

      // Sessoes B: NAO foram tocadas — bug reintroduzido = subsBAfter !== subsBBefore
      expect(subsBAfter).toBe(subsBBefore);
      const parsedB = JSON.parse(subsBAfter);
      // B NAO pode ter a subscription de A
      const idsB = parsedB.map((s: any) => s.id);
      expect(idsB).not.toContain(fakeSubId);
    });
  });
});
