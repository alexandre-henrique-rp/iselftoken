/**
 * E2E test: Fluxo Categoria + Área de Atuação (ADR-007 §3.2 + §3.4).
 *
 * Testa:
 * 1. POST /startup — happy path com categoryId + areaAtuacaoId válidos
 * 2. POST /startup — erro 400 com área incompatível (cross-validation)
 * 3. POST /startup — erro 400 sem categoryId
 * 4. POST /startup — erro 400/404 com areaAtuacaoId inexistente
 * 5. PATCH /startup/:id — atualização válida de categoryId + areaAtuacaoId
 * 6. PATCH /startup/:id — atualização parcial (só areaAtuacaoId)
 * 7. GET /startup/:id — startup com category + areaAtuacao populados
 * 8. Backfill script — executa sem erro em DB vazio de startups
 *
 * Setup: signup + ADMIN (bypass plan check) + login 2FA.
 */

import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import {
  INestApplication,
  ValidationPipe,
  Logger,
  Module,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SessionService } from '../../../src/auth/session/session.service';
import { EmailService } from '../../../src/email/email.service';
import { OBJECT_STORAGE_PROVIDER } from '../../../src/common/storage/storage-provider.module';
import { ValidateFundador } from '../../../src/api/startup/service/validate.fundador';
import { StartupModule } from '../../../src/api/startup/startup.module';
import { StartupService } from '../../../src/api/startup/service/startup.service';
import { AuthModule } from '../../../src/auth/auth.module';
import { DashboardSummaryService } from '../../../src/api/startup/service/dashboard-summary.service';
import { EnrichmentService } from '../../../src/api/startup/service/enrichment.service';
import { NextActionService } from '../../../src/api/startup/service/next-action.service';
import { StartupExtrasService } from '../../../src/api/startup/service/startup-extras.service';
import { TermoAdesaoModule } from '../../../src/api/founder/termo-adesao/termo-adesao.module';
import {
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
  generateValidCnpj,
  buildAuthCookie,
} from './setup/test-helpers';

describe('Startup Categoria + Area (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  // Test data — generated at runtime
  const TEST_EMAIL = generateUniqueEmail('e2eT027');
  const TEST_EMAIL_LOWER = TEST_EMAIL.toLowerCase();
  const TEST_PASSWORD = generateValidPassword();

  // Auth state
  let userId: number;
  let sessionId: string;
  let twoFactorCode: string | undefined;

  // Seeded entities (resolved in beforeAll)
  let fintechCategoryId: number;
  let edtechCategoryId: number;
  let contaDigitalPjAreaId: number; // belongs to fintech
  let educacaoBasicaAreaId: number; // belongs to edtech

  // Created startup ID (for update/list tests)
  let createdStartupId: number;

  beforeAll(async () => {
    // Mock Logger string-token provider (used by StorageProviderModule factory)
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Logger)
      .useValue(mockLogger)
      .overrideProvider(OBJECT_STORAGE_PROVIDER)
      .useValue({
        upload: jest
          .fn()
          .mockResolvedValue({ url: 'http://mock.url/file.png' }),
        delete: jest.fn().mockResolvedValue(undefined),
        getUrl: jest.fn().mockResolvedValue('http://mock.url/file.png'),
      })
      .overrideProvider(ValidateFundador)
      .useValue({ validateFundadorPlan: jest.fn().mockResolvedValue(true) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    sessionService = app.get(SessionService);
    emailService = app.get(EmailService);

    // Mock EmailService — capture 2FA code
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

    // STEP 1: Register user
    await request(app.getHttpServer())
      .post('/auth/register/user')
      .send({
        email: TEST_EMAIL,
        nome: 'Teste Categoria Area',
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

    // STEP 2: Promote to ADMIN (bypass founder plan check)
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });

    // STEP 3: Login (generates 2FA code)
    const loginRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: TEST_EMAIL_LOWER, senha: TEST_PASSWORD })
      .expect(200);

    sessionId = loginRes.body.data.sessionId;

    // STEP 4: Verify 2FA code
    await request(app.getHttpServer())
      .post('/auth/verify-code')
      .set('Cookie', buildAuthCookie(sessionId))
      .send({ codigo: twoFactorCode })
      .expect(200);

    // STEP 5: Resolve seeded category and area IDs
    const fintechCat = await prisma.category.findUnique({
      where: { slug: 'fintech' },
    });
    const edtechCat = await prisma.category.findUnique({
      where: { slug: 'edtech' },
    });
    const contaDigitalPj = await prisma.areaAtuacao.findUnique({
      where: { slug: 'conta_digital_pj' },
    });
    const educacaoBasica = await prisma.areaAtuacao.findUnique({
      where: { slug: 'educacao_basica' },
    });

    if (!fintechCat || !edtechCat || !contaDigitalPj || !educacaoBasica) {
      throw new Error(
        `Seed não encontrado — fintech=${!!fintechCat}, edtech=${!!edtechCat}, ` +
          `conta_digital_pj=${!!contaDigitalPj}, educacao_basica=${!!educacaoBasica}`,
      );
    }

    fintechCategoryId = fintechCat.id;
    edtechCategoryId = edtechCat.id;
    contaDigitalPjAreaId = contaDigitalPj.id;
    educacaoBasicaAreaId = educacaoBasica.id;
  });

  afterAll(async () => {
    // Cleanup in correct order (FK constraints)
    if (createdStartupId) {
      await prisma.campaign.deleteMany({
        where: { startupId: createdStartupId },
      });
      await prisma.startup.delete({ where: { id: createdStartupId } });
    }
    await prisma.accessLog.deleteMany({ where: { userId } });
    await prisma.emailValidation.deleteMany({ where: { userId } });
    await prisma.backupUser.deleteMany({ where: { userId } });
    await prisma.walletTransaction.deleteMany({
      where: { wallet: { userId } },
    });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.payment.deleteMany({ where: { userId } });
    await prisma.subscription.deleteMany({ where: { userId } });
    await prisma.token.deleteMany({ where: { userId } });
    await prisma.investment.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  // ============================================================
  // POST /startup (onboarding)
  // ============================================================
  describe('POST /startup (onboarding)', () => {
    it('1.1 — happy path: cria startup com Categoria Fintech + Area conta_digital_pj', async () => {
      const cnpj = generateValidCnpj();

      const res = await request(app.getHttpServer())
        .post('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          razaoSocial: 'Fintech Teste LTDA',
          nomeFantasia: 'Fintech Teste',
          cnpj,
          dataAbertura: '2020',
          paisIso3: 'BRA',
          categoryId: fintechCategoryId,
          areaAtuacaoId: contaDigitalPjAreaId,
          estagio: 'MVP',
          descricao: 'Plataforma de conta digital PJ para PMEs brasileiras.',
          metaCaptacao: 500000,
          equityOferecido: 10,
          titular: 'Teste Fintech',
          banco: 'C6',
          agencia: '0001',
          conta: '123456',
          digito: '7',
        })
        .expect(201);

      expect(res.body.error).toBe(false);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.categoryId).toBe(fintechCategoryId);
      expect(res.body.data.areaAtuacaoId).toBe(contaDigitalPjAreaId);

      createdStartupId = res.body.data.id;

      // Verify persisted in DB
      const startup = await prisma.startup.findUnique({
        where: { id: createdStartupId },
        include: { categoryRel: true, areaAtuacaoRel: true },
      });
      expect(startup).not.toBeNull();
      expect(startup!.categoryId).toBe(fintechCategoryId);
      expect(startup!.areaAtuacaoId).toBe(contaDigitalPjAreaId);
      expect(startup!.categoryRel!.slug).toBe('fintech');
      expect(startup!.areaAtuacaoRel!.slug).toBe('conta_digital_pj');
    });

    it('1.2 — erro: tenta criar startup com areaId de outra categoria (cross-validation)', async () => {
      const cnpj = generateValidCnpj();

      // educacaoBasica pertence a EDTECH, não a FINTECH
      const res = await request(app.getHttpServer())
        .post('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          razaoSocial: 'Area Incompativel LTDA',
          nomeFantasia: 'Area Incompativel',
          cnpj,
          dataAbertura: '2021',
          paisIso3: 'BRA',
          categoryId: fintechCategoryId,
          areaAtuacaoId: educacaoBasicaAreaId, // belongs to edtech, not fintech
          estagio: 'SEED',
          descricao: 'Descricao teste de area incompativel.',
          metaCaptacao: 100000,
          equityOferecido: 5,
          titular: 'Teste',
          banco: 'C6',
          agencia: '0001',
          conta: '654321',
          digito: '1',
        })
        .expect(400);

      expect(res.body.error).toBe(true);
      // Mensagem exata conforme ADR-007 §3.2
      expect(res.body.message).toMatch(
        /A Área de Atuação .+ não pertence à Categoria .+/,
      );
    });

    it('1.3 — erro: tenta criar startup sem categoryId', async () => {
      const cnpj = generateValidCnpj();

      const res = await request(app.getHttpServer())
        .post('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          razaoSocial: 'Sem Categoria LTDA',
          nomeFantasia: 'Sem Categoria',
          cnpj,
          dataAbertura: '2021',
          paisIso3: 'BRA',
          areaAtuacaoId: contaDigitalPjAreaId,
          estagio: 'SEED',
          descricao: 'Descricao teste sem categoryId.',
          metaCaptacao: 100000,
          equityOferecido: 5,
          titular: 'Teste',
          banco: 'C6',
          agencia: '0001',
          conta: '111111',
          digito: '2',
        })
        .expect(400);

      expect(res.body.error).toBe(true);
    });

    it('1.4 — erro: tenta criar startup com areaAtuacaoId inexistente', async () => {
      const cnpj = generateValidCnpj();

      const res = await request(app.getHttpServer())
        .post('/startup')
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          razaoSocial: 'Area Inexistente LTDA',
          nomeFantasia: 'Area Inexistente',
          cnpj,
          dataAbertura: '2021',
          paisIso3: 'BRA',
          categoryId: fintechCategoryId,
          areaAtuacaoId: 99999, // does not exist
          estagio: 'SEED',
          descricao: 'Descricao teste area inexistente.',
          metaCaptacao: 100000,
          equityOferecido: 5,
          titular: 'Teste',
          banco: 'C6',
          agencia: '0001',
          conta: '222222',
          digito: '3',
        })
        .expect(404);

      expect(res.body.error).toBe(true);
      expect(res.body.message).toMatch(/Área de atuação não encontrada/);
    });
  });

  // ============================================================
  // PATCH /startup/:id (update)
  // ============================================================
  describe('PATCH /startup/:id (update)', () => {
    it('2.1 — atualiza categoryId + areaAtuacaoId corretamente', async () => {
      // Switch from fintech/conta_digital_pj to edtech/educacao_basica
      const res = await request(app.getHttpServer())
        .patch(`/startup/${createdStartupId}`)
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          categoryId: edtechCategoryId,
          areaAtuacaoId: educacaoBasicaAreaId,
        })
        .expect(200);

      expect(res.body.error).toBe(false);

      const updated = await prisma.startup.findUnique({
        where: { id: createdStartupId },
      });
      expect(updated!.categoryId).toBe(edtechCategoryId);
      expect(updated!.areaAtuacaoId).toBe(educacaoBasicaAreaId);
    });

    it('2.2 — atualiza parcial: só areaAtuacaoId (mantem categoryId da edtech)', async () => {
      // Keep categoryId=edtech but switch area to a different edtech area
      // educacao_superior also belongs to edtech
      const educacaoSuperior = await prisma.areaAtuacao.findUnique({
        where: { slug: 'educacao_superior' },
      });
      expect(educacaoSuperior).not.toBeNull();
      expect(educacaoSuperior!.categoryId).toBe(edtechCategoryId);

      const res = await request(app.getHttpServer())
        .patch(`/startup/${createdStartupId}`)
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          areaAtuacaoId: educacaoSuperior!.id,
        })
        .expect(200);

      expect(res.body.error).toBe(false);

      const updated = await prisma.startup.findUnique({
        where: { id: createdStartupId },
      });
      expect(updated!.categoryId).toBe(edtechCategoryId); // unchanged
      expect(updated!.areaAtuacaoId).toBe(educacaoSuperior!.id); // changed
    });

    it('2.3 — rejeita atualizacao com area incompatível (cross-validation no PATCH)', async () => {
      // Try to set categoryId=fintech with areaAtuacaoId=educacao_basica (edtech)
      const res = await request(app.getHttpServer())
        .patch(`/startup/${createdStartupId}`)
        .set('Cookie', buildAuthCookie(sessionId))
        .send({
          categoryId: fintechCategoryId,
          areaAtuacaoId: educacaoBasicaAreaId,
        })
        .expect(400);

      expect(res.body.error).toBe(true);
      expect(res.body.message).toMatch(
        /A Área de Atuação .+ não pertence à Categoria .+/,
      );
    });
  });

  // ============================================================
  // GET /startup/:id (listagem)
  // ============================================================
  describe('GET /startup/:id (listagem)', () => {
    it('3.1 — retorna startup com categoryId + areaAtuacaoId populados via relacao', async () => {
      const res = await request(app.getHttpServer())
        .get(`/startup/${createdStartupId}`)
        .expect(200);

      expect(res.body.error).toBe(false);
      expect(res.body.data).toHaveProperty('id', createdStartupId);
      expect(res.body.data).toHaveProperty('categoryId', edtechCategoryId);
      expect(res.body.data).toHaveProperty('areaAtuacaoId');

      // Verify the related data is accessible in DB
      const startup = await prisma.startup.findUnique({
        where: { id: createdStartupId },
        include: { categoryRel: true, areaAtuacaoRel: true },
      });
      expect(startup!.categoryRel!.slug).toBe('edtech');
      expect(startup!.areaAtuacaoRel!.slug).toBe('educacao_superior');
    });
  });

  // ============================================================
  // Backfill (T023)
  // ============================================================
  describe('Backfill (T023)', () => {
    it('4.1 — backfill roda sem erro em DB com 0 startups legadas sem mapping', async () => {
      // Run the backfill script with --dry-run to avoid actual DB changes in test
      // The script should complete without error
      const { exec } = await import('child_process');
      const path = await import('path');

      const scriptPath = path.resolve(
        __dirname,
        '../../../../scripts/backfill-categoria-area.ts',
      );

      const result = await new Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
      }>((resolve) => {
        exec(
          `npx tsx ${scriptPath} --dry-run`,
          {
            cwd: path.resolve(__dirname, '../../../../'),
            env: { ...process.env },
          },
          (err, stdout, stderr) => {
            resolve({
              stdout: stdout ?? '',
              stderr: stderr ?? '',
              exitCode: err?.code ?? 0,
            });
          },
        );
      });

      // Script should exit 0 even in dry-run
      expect(result.exitCode).toBe(0);
      // Should contain JSON result
      expect(result.stdout).toContain('total_processed');
    });
  });
});
