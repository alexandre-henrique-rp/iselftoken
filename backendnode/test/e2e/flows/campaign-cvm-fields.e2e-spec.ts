/**
 * E2E test: Campaign CVM Fields (M7-S22 / T044).
 *
 * Testa os 9 campos CVM/Compliance implementados em T037-T042:
 * 1. T044-01: HAPPY PATH — criar campaign com 9 campos via new-round
 * 2. T044-02: UPDATE — alterar 3 campos via PATCH
 * 3. T044-03: BENEFICIOS CONDICIONAL — erro se beneficiosAdicionais=true sem descricao
 * 4. T044-04: WARNING — faturamentoMinimoLucros sem participacaoLucros
 * 5. T044-05: AUDIT LOG — aceiteTermoRepasse=true cria log
 * 6. T044-06: CHECKOUT DATA — subset público (sem aceiteTermoRepasse/declaracaoVeracidade)
 * 7. T044-07: CAMPOS NULL — tolerância a campos ausentes
 *
 * BLOCKER: AppModule não compila por StartupModule (M6). Todos os testes estão
 * marcados como .skip until o blocker for resolvido.
 *
 * Setup: register user + promote ADMIN + login 2FA + create startup.
 * Cleanup: truncate campaign_offer_audit_logs + campaign + startup + user.
 */

import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { EmailService } from '../../../src/email/email.service';
import { OBJECT_STORAGE_PROVIDER } from '../../../src/common/storage/storage-provider.module';
import { ValidateFundador } from '../../../src/api/startup/service/validate.fundador';
import {
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
  generateValidCnpj,
  buildAuthCookie,
} from './setup/test-helpers';

describe('Campaign CVM Fields (M7-S22)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;

  const TEST_EMAIL = generateUniqueEmail('e2eT044');
  const TEST_EMAIL_LOWER = TEST_EMAIL.toLowerCase();
  const TEST_PASSWORD = generateValidPassword();

  let userId: number;
  let sessionId: string;
  let twoFactorCode: string | undefined;

  let startupId: number;
  let campaignId: number;
  let campaignIdWithAll: number;

  // ============================================================
  // SETUP: register → ADMIN → login 2FA → create startup
  // ============================================================
  beforeAll(async () => {
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('Logger')
      .useValue(mockLogger)
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
      .useValue({ validateOrThrow: jest.fn().mockResolvedValue(true) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    emailService = app.get(EmailService);

    // Mock EmailService — capture 2FA code
    jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockImplementation(async (_to, _n, codigo, acao) => {
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

    // STEP 1: Register user
    await request(app.getHttpServer())
      .post('/auth/register/user')
      .send({
        email: TEST_EMAIL,
        nome: 'Teste CVM Fields',
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

    // STEP 2: Promote to ADMIN
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

    // STEP 5: Create startup
    const cnpj = generateValidCnpj();
    const startupRes = await request(app.getHttpServer())
      .post('/startup')
      .set('Cookie', buildAuthCookie(sessionId))
      .send({
        razaoSocial: 'Startup CVM Teste LTDA',
        nomeFantasia: 'CVM Teste',
        cnpj,
        dataAbertura: '2020',
        paisIso3: 'BRA',
        estagio: 'MVP',
        descricao: 'Startup para teste de campos CVM.',
        titular: 'Teste CVM',
        banco: '000',
        agencia: '0001',
        conta: '123456',
        digito: '7',
        metaCaptacao: 500000,
        equityOferecido: 10,
      })
      .expect(201);

    startupId = startupRes.body.data.id;
  });

  afterAll(async () => {
    // Cleanup em ordem reversa de FK
    if (campaignId) {
      await prisma
        .$executeRawUnsafe(
          'DELETE FROM campaign_offer_audit_logs WHERE campaignId = ?',
          campaignId,
        )
        .catch(() => {});
      await prisma.campaignResourceAllocation
        .deleteMany({ where: { campaignId } })
        .catch(() => {});
      await prisma.campaign
        .delete({ where: { id: campaignId } })
        .catch(() => {});
    }
    if (campaignIdWithAll) {
      await prisma
        .$executeRawUnsafe(
          'DELETE FROM campaign_offer_audit_logs WHERE campaignId = ?',
          campaignIdWithAll,
        )
        .catch(() => {});
      await prisma.campaignResourceAllocation
        .deleteMany({ where: { campaignId: campaignIdWithAll } })
        .catch(() => {});
      await prisma.campaign
        .delete({ where: { id: campaignIdWithAll } })
        .catch(() => {});
    }
    if (startupId) {
      await prisma.startup.delete({ where: { id: startupId } }).catch(() => {});
    }
    if (userId) {
      await prisma.accessLog.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.emailValidation
        .deleteMany({ where: { userId } })
        .catch(() => {});
      await prisma.backupUser.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.walletTransaction
        .deleteMany({ where: { wallet: { userId } } })
        .catch(() => {});
      await prisma.wallet.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.subscription
        .deleteMany({ where: { userId } })
        .catch(() => {});
      await prisma.token.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.investment.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    if (app) await app.close().catch(() => {});
  });

  // ============================================================
  // T044-01: HAPPY PATH — criar campaign com 9 campos
  // ============================================================
  it.skip('T044-01: HAPPY PATH — criar campaign com 9 campos CVM via new-round', async () => {
    const res = await request(app.getHttpServer())
      .post(`/campaigns/${startupId}/new-round`)
      .set('Cookie', buildAuthCookie(sessionId))
      .send({
        title: 'Rodada Seed CVM Full',
        targetAmount: 500000,
        minInvestment: 1000,
        valuation: 5000000,
        tokenPrice: 50,
        totalTokens: 10000,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        // 9 campos CVM
        dataLancamentoRodada: '2026-08-01T10:00:00.000Z',
        objetivoCaptacao: 'Captacao para expansao nacional do produto',
        oQueEsperaAlcancar: 'Alcancar 10000 clientes ativos em 12 meses',
        participacaoLucros: true,
        faturamentoMinimoLucros: 100000,
        beneficiosAdicionais: true,
        beneficiosDescricao:
          'Acesso antecipado a novas funcionalidades e desconto de 20%',
        aceiteTermoRepasse: true,
        declaracaoVeracidade: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    campaignIdWithAll = res.body.data.id;

    // GET confirma todos os 9 campos
    const getRes = await request(app.getHttpServer())
      .get(`/campaigns/${campaignIdWithAll}`)
      .expect(200);

    expect(getRes.body.error).toBe(false);
    const d = getRes.body.data;
    expect(d.dataLancamentoRodada).toBeTruthy();
    expect(d.objetivoCaptacao).toBe(
      'Captacao para expansao nacional do produto',
    );
    expect(d.oQueEsperaAlcancar).toBe(
      'Alcancar 10000 clientes ativos em 12 meses',
    );
    expect(d.participacaoLucros).toBe(true);
    expect(Number(d.faturamentoMinimoLucros)).toBe(100000);
    expect(d.beneficiosAdicionais).toBe(true);
    expect(d.beneficiosDescricao).toContain('acesso antecipado');
    expect(d.aceiteTermoRepasse).toBe(true);
    expect(d.declaracaoVeracidade).toBe(true);
  });

  // ============================================================
  // T044-02: UPDATE — alterar 3 campos via PATCH
  // ============================================================
  it.skip('T044-02: UPDATE — alterar 3 campos via PATCH', async () => {
    // Primeiro criar uma campaign basica para atualizar
    const createRes = await request(app.getHttpServer())
      .post(`/campaigns/${startupId}/new-round`)
      .set('Cookie', buildAuthCookie(sessionId))
      .send({
        title: 'Rodada para Update CVM',
        targetAmount: 300000,
        minInvestment: 500,
        valuation: 3000000,
        tokenPrice: 30,
        totalTokens: 10000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        objetivoCaptacao: 'Objetivo original da captação para teste',
        oQueEsperaAlcancar: 'Metas originais para validação do update',
      });

    expect(createRes.status).toBe(201);
    campaignId = createRes.body.data.id;

    // PATCH: alterar 3 campos CVM
    const patchRes = await request(app.getHttpServer())
      .patch(`/campaigns/${campaignId}`)
      .set('Cookie', buildAuthCookie(sessionId))
      .send({
        objetivoCaptacao: 'Novo texto atualizado do objetivo da captação',
        participacaoLucros: true,
        faturamentoMinimoLucros: 50000,
      });

    expect(patchRes.status).toBe(200);

    // GET confirma persistência
    const getRes = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}`)
      .expect(200);

    expect(getRes.body.error).toBe(false);
    const d = getRes.body.data;
    expect(d.objetivoCaptacao).toBe(
      'Novo texto atualizado do objetivo da captação',
    );
    expect(d.participacaoLucros).toBe(true);
    expect(Number(d.faturamentoMinimoLucros)).toBe(50000);
  });

  // ============================================================
  // T044-03: BENEFICIOS CONDICIONAL — erro se beneficiosAdicionais=true sem descricao
  // ============================================================
  it.skip('T044-03: BENEFICIOS CONDICIONAL — erro se beneficiosAdicionais=true sem descricao', async () => {
    const res = await request(app.getHttpServer())
      .post(`/campaigns/${startupId}/new-round`)
      .set('Cookie', buildAuthCookie(sessionId))
      .send({
        title: 'Rodada Beneficios Teste',
        targetAmount: 200000,
        minInvestment: 500,
        valuation: 2000000,
        tokenPrice: 20,
        totalTokens: 10000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        beneficiosAdicionais: true,
        beneficiosDescricao: '', // vazio — deve falhar
      });

    expect(res.status).toBe(400);
    // class-validator @ValidateIf + @MinLength(10) rejeita string vazia
    const msg = JSON.stringify(res.body).toLowerCase();
    expect(msg).toContain('benefici');
  });

  // ============================================================
  // T044-04: WARNING — faturamentoMinimoLucros sem participacaoLucros
  // ============================================================
  it.skip('T044-04: WARNING — faturamentoMinimoLucros sem participacaoLucros', async () => {
    // Criar campaign com participacaoLucros=false + faturamentoMinimoLucros definido
    const createRes = await request(app.getHttpServer())
      .post(`/campaigns/${startupId}/new-round`)
      .set('Cookie', buildAuthCookie(sessionId))
      .send({
        title: 'Rodada Warning Teste',
        targetAmount: 400000,
        minInvestment: 1000,
        valuation: 4000000,
        tokenPrice: 40,
        totalTokens: 10000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        objetivoCaptacao: 'Teste de warning de faturamento minimo',
        oQueEsperaAlcancar:
          'Validar warning quando faturamento definido sem lucros',
        participacaoLucros: false,
        faturamentoMinimoLucros: 100000,
      });

    expect(createRes.status).toBe(201);
    const warnCampaignId = createRes.body.data.id;

    // Verificar que a campaign foi criada (201 é aceito)
    expect(warnCampaignId).toBeDefined();

    // Checkout deve conter warning
    const checkoutRes = await request(app.getHttpServer())
      .get(`/campaigns/${warnCampaignId}/checkout`)
      .set('Cookie', buildAuthCookie(sessionId))
      .expect(200);

    expect(checkoutRes.body.error).toBe(false);
    const warnings = checkoutRes.body.data.warnings;
    expect(warnings).toBeDefined();
    expect(Array.isArray(warnings)).toBe(true);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('faturamentoMinimoLucros');

    // Cleanup desta campaign isolada
    await prisma
      .$executeRawUnsafe(
        'DELETE FROM campaign_offer_audit_logs WHERE campaignId = ?',
        warnCampaignId,
      )
      .catch(() => {});
    await prisma.campaignResourceAllocation
      .deleteMany({ where: { campaignId: warnCampaignId } })
      .catch(() => {});
    await prisma.campaign
      .delete({ where: { id: warnCampaignId } })
      .catch(() => {});
  });

  // ============================================================
  // T044-05: AUDIT LOG — aceiteTermoRepasse=true cria log
  // ============================================================
  it.skip('T044-05: AUDIT LOG — aceiteTermoRepasse=true cria log', async () => {
    // Criar campaign sem aceite
    const createRes = await request(app.getHttpServer())
      .post(`/campaigns/${startupId}/new-round`)
      .set('Cookie', buildAuthCookie(sessionId))
      .send({
        title: 'Rodada Audit Log Teste',
        targetAmount: 250000,
        minInvestment: 500,
        valuation: 2500000,
        tokenPrice: 25,
        totalTokens: 10000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(createRes.status).toBe(201);
    const auditCampaignId = createRes.body.data.id;

    // PATCH: ativar aceiteTermoRepasse
    const patchRes = await request(app.getHttpServer())
      .patch(`/campaigns/${auditCampaignId}`)
      .set('Cookie', buildAuthCookie(sessionId))
      .send({ aceiteTermoRepasse: true });

    expect(patchRes.status).toBe(200);

    // Verificar audit log no banco via raw SQL
    const logs = (await prisma.$queryRawUnsafe(
      `SELECT * FROM campaign_offer_audit_logs WHERE campaignId = ? AND action = 'ACEITE_TERMO_REPASSE'`,
      auditCampaignId,
    )) as any[];

    expect(logs.length).toBe(1);
    expect(logs[0].occurredAt).toBeDefined();
    // ip e userAgent podem ser null no teste (sem headers reais)

    // Cleanup
    await prisma
      .$executeRawUnsafe(
        'DELETE FROM campaign_offer_audit_logs WHERE campaignId = ?',
        auditCampaignId,
      )
      .catch(() => {});
    await prisma.campaignResourceAllocation
      .deleteMany({ where: { campaignId: auditCampaignId } })
      .catch(() => {});
    await prisma.campaign
      .delete({ where: { id: auditCampaignId } })
      .catch(() => {});
  });

  // ============================================================
  // T044-06: CHECKOUT DATA — subset público
  // ============================================================
  it.skip('T044-06: CHECKOUT DATA — subset público (sem aceiteTermoRepasse/declaracaoVeracidade)', async () => {
    // Criar campaign com todos os campos CVM
    const createRes = await request(app.getHttpServer())
      .post(`/campaigns/${startupId}/new-round`)
      .set('Cookie', buildAuthCookie(sessionId))
      .send({
        title: 'Rodada Checkout Subset',
        targetAmount: 600000,
        minInvestment: 1000,
        valuation: 6000000,
        tokenPrice: 60,
        totalTokens: 10000,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        dataLancamentoRodada: '2026-09-01T10:00:00.000Z',
        objetivoCaptacao: 'Captacao para checkout subset validation',
        oQueEsperaAlcancar: 'Validar que checkout retorna subset correto',
        participacaoLucros: true,
        faturamentoMinimoLucros: 75000,
        beneficiosAdicionais: true,
        beneficiosDescricao:
          'Beneficios exclusivos para investidores do checkout',
        aceiteTermoRepasse: true,
        declaracaoVeracidade: true,
      });

    expect(createRes.status).toBe(201);
    const checkoutCampaignId = createRes.body.data.id;

    // GET /checkout — deve retornar subset público
    const checkoutRes = await request(app.getHttpServer())
      .get(`/campaigns/${checkoutCampaignId}/checkout`)
      .set('Cookie', buildAuthCookie(sessionId))
      .expect(200);

    expect(checkoutRes.body.error).toBe(false);
    const d = checkoutRes.body.data;

    // Campos CVM públicos PRESENTES
    expect(d.dataLancamentoRodada).toBeTruthy();
    expect(d.objetivoCaptacao).toBe('Captacao para checkout subset validation');
    expect(d.oQueEsperaAlcancar).toBe(
      'Validar que checkout retorna subset correto',
    );
    expect(d.participacaoLucros).toBe(true);
    expect(Number(d.faturamentoMinimoLucros)).toBe(75000);
    expect(d.beneficiosAdicionais).toBe(true);
    expect(d.beneficiosDescricao).toContain('Beneficios exclusivos');

    // Campos sensíveis AUSENTES
    expect(d).not.toHaveProperty('aceiteTermoRepasse');
    expect(d).not.toHaveProperty('declaracaoVeracidade');

    // Cleanup
    await prisma
      .$executeRawUnsafe(
        'DELETE FROM campaign_offer_audit_logs WHERE campaignId = ?',
        checkoutCampaignId,
      )
      .catch(() => {});
    await prisma.campaignResourceAllocation
      .deleteMany({ where: { campaignId: checkoutCampaignId } })
      .catch(() => {});
    await prisma.campaign
      .delete({ where: { id: checkoutCampaignId } })
      .catch(() => {});
  });

  // ============================================================
  // T044-07: CAMPOS NULL — tolerância a campos CVM ausentes
  // ============================================================
  it.skip('T044-07: CAMPOS NULL — criar campaign SEM campos CVM, retornam null', async () => {
    // Criar campaign sem nenhum campo CVM
    const createRes = await request(app.getHttpServer())
      .post(`/campaigns/${startupId}/new-round`)
      .set('Cookie', buildAuthCookie(sessionId))
      .send({
        title: 'Rodada Sem CVM',
        targetAmount: 100000,
        minInvestment: 500,
        valuation: 1000000,
        tokenPrice: 10,
        totalTokens: 10000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        // Nenhum campo CVM
      });

    expect(createRes.status).toBe(201);
    const nullCampaignId = createRes.body.data.id;

    // GET retorna 9 campos como null/default
    const getRes = await request(app.getHttpServer())
      .get(`/campaigns/${nullCampaignId}`)
      .expect(200);

    expect(getRes.body.error).toBe(false);
    const d = getRes.body.data;
    expect(d.dataLancamentoRodada).toBeNull();
    expect(d.objetivoCaptacao).toBeNull();
    expect(d.oQueEsperaAlcancar).toBeNull();
    expect(d.participacaoLucros).toBe(false); // default
    expect(d.faturamentoMinimoLucros).toBeNull();
    expect(d.beneficiosAdicionais).toBe(false); // default
    expect(d.beneficiosDescricao).toBeNull();
    expect(d.aceiteTermoRepasse).toBe(false); // default
    expect(d.declaracaoVeracidade).toBe(false); // default

    // Checkout data retorna subset com nulls
    const checkoutRes = await request(app.getHttpServer())
      .get(`/campaigns/${nullCampaignId}/checkout`)
      .set('Cookie', buildAuthCookie(sessionId))
      .expect(200);

    expect(checkoutRes.body.error).toBe(false);
    const cd = checkoutRes.body.data;
    expect(cd.dataLancamentoRodada).toBeNull();
    expect(cd.objetivoCaptacao).toBeNull();
    expect(cd.oQueEsperaAlcancar).toBeNull();
    expect(cd.participacaoLucros).toBe(false);
    expect(cd.faturamentoMinimoLucros).toBeNull();
    expect(cd.beneficiosAdicionais).toBe(false);
    expect(cd.beneficiosDescricao).toBeNull();
    expect(cd).not.toHaveProperty('aceiteTermoRepasse');
    expect(cd).not.toHaveProperty('declaracaoVeracidade');

    // Cleanup
    await prisma
      .$executeRawUnsafe(
        'DELETE FROM campaign_offer_audit_logs WHERE campaignId = ?',
        nullCampaignId,
      )
      .catch(() => {});
    await prisma.campaignResourceAllocation
      .deleteMany({ where: { campaignId: nullCampaignId } })
      .catch(() => {});
    await prisma.campaign
      .delete({ where: { id: nullCampaignId } })
      .catch(() => {});
  });
});
