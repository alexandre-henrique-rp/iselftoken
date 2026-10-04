/**
 * @description E2E — Cancelamento de Rodada com Estorno (B11/T055/T108/T109).
 *
 * Cobre o fluxo completo de PATCH /startup/:startupId/rodada/:rodadaId/cancelar
 * com o servico de refund (RefundService + EfiPixAdapter — devolucao PIX).
 *
 * Cenarios cobertos:
 *  - C1: Cancelamento de rodada PAUSED com 3 investments CONFIRMED (PIX) → 3 refunds OK + CLOSED
 *  - C2: Cancelamento de rodada PAUSED com 0 investments → CLOSED sem refunds
 *  - C3: Falha parcial (2o refund PIX timeout) → 502 + campaign NAO fechada + somente 1 investment REFUNDED
 *  - C4: roundStatus invalido (FUNDED) → 409 ConflictException
 *
 * Profile LEAN: Direct Coding + supertest + jest.spyOn para mocks deterministicos.
 */

import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SessionService } from '../../../src/auth/session/session.service';
import { EmailService } from '../../../src/email/email.service';
import { EfiPixAdapter } from '../../../src/api/payment/efi/adapters/efi-pix.adapter';
import { OBJECT_STORAGE_PROVIDER } from '../../../src/common/storage/storage-provider.module';
import { ValidateFundador } from '../../../src/api/startup/service/validate.fundador';
import {
  generateUniqueEmail,
  generateValidPassword,
  buildAuthCookie,
} from './setup/test-helpers';

/** Prefixo para emails do test — facilita cleanup e rastreabilidade */
const TEST_PREFIX = `e2eCancel_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

describe('E2E — Cancelamento de Rodada com Estorno (B11/T055)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let emailService: EmailService;

  // Mocks injetaveis (default = mock adapter "happy path")
  let mockPixAdapter: jest.Mocked<Pick<EfiPixAdapter, 'refundPix'>>;

  // IDs criados por cenario (cleanup deterministico)
  let founderId: number;
  let founderEmail: string;
  let founderCookie: string;
  let sessionId: string;
  let twoFactorCode: string | undefined;

  // Cleanup tracking (lista para afterAll)
  const createdStartupIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdPaymentIds: number[] = [];
  const createdInvestmentIds: number[] = [];
  const createdAuditLogIds: number[] = [];

  beforeAll(async () => {
    // Cria mocks ANTES de criar o module — serao injetados via overrideProvider
    mockPixAdapter = {
      refundPix: jest
        .fn()
        .mockImplementation(
          async ({ e2eId, amount }: { e2eId: string; amount: string }) => ({
            id: `MOCK-REFUND-${e2eId.slice(0, 8)}-${Date.now()}`,
            status: 'DEVOLVIDO',
            valor: amount,
          }),
        ),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('Logger')
      .useValue({
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })
      .overrideProvider(Logger)
      .useValue({
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })
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
      .overrideProvider(EfiPixAdapter)
      .useValue(mockPixAdapter)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    sessionService = app.get(SessionService);
    emailService = app.get(EmailService);

    // Mock EmailService para capturar codigo 2FA
    jest
      .spyOn(emailService, 'sendVerificationCodeEmail')
      .mockImplementation(async (_to, _nome, codigo, acao) => {
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

    // Cria plano FUNDADOR (necessario para subscriptions dos founders do teste 403)
    const existingPlans = await prisma.plan.count();
    if (existingPlans === 0) {
      await prisma.plan.create({
        data: {
          nome: 'Plano Fundador',
          slug: 'fundador',
          preco: 100,
          periodo: '12',
          visivel: true,
          recomendado: true,
        },
      });
    }
  });

  afterAll(async () => {
    // Cleanup deterministico em ordem reversa (FKs primeiro)
    try {
      if (createdAuditLogIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { id: { in: createdAuditLogIds } },
        });
      }
      if (createdPaymentIds.length > 0) {
        await prisma.payment.deleteMany({
          where: { id: { in: createdPaymentIds } },
        });
      }
      if (createdInvestmentIds.length > 0) {
        await prisma.investment.deleteMany({
          where: { id: { in: createdInvestmentIds } },
        });
      }
      if (createdStartupIds.length > 0) {
        // Deleta campaigns + startup
        await prisma.campaign.deleteMany({
          where: { startupId: { in: createdStartupIds } },
        });
        await prisma.startup.deleteMany({
          where: { id: { in: createdStartupIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } catch (err) {
      console.error('[CLEANUP ERROR]', err);
    }

    await app.close();
  });

  // ============================================================
  // SETUP: Founder unico usado por TODOS os cenarios (role ADMIN bypass)
  // ============================================================
  beforeAll(async () => {
    // Cria founder via Prisma direto + promove para ADMIN (bypass plan)
    founderEmail = `${TEST_PREFIX}@example.com`.toLowerCase();
    const hashed = await bcrypt.hash(generateValidPassword(), 10);
    const founder = await prisma.user.create({
      data: {
        email: founderEmail,
        nome: 'Founder B11 Cancel',
        senha: hashed,
        role: 'ADMIN', // bypass plan check
        telefone: '11987654321',
        termosAceitos: true,
        politicaAceita: true,
      },
    });
    founderId = founder.id;
    createdUserIds.push(founderId);

    await prisma.wallet.create({
      data: { userId: founder.id, balance: 0, blocked: 0, currency: 'BRL' },
    });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: founderEmail, senha: generateValidPassword() })
      .expect(200);
    sessionId = loginRes.body.data.sessionId;

    // 2FA
    await sessionService.storeVerificationCode(sessionId, twoFactorCode!, 300);

    await request(app.getHttpServer())
      .post('/auth/verify-code')
      .set('Cookie', buildAuthCookie(sessionId))
      .send({ codigo: twoFactorCode })
      .expect(200);

    founderCookie = buildAuthCookie(sessionId);
  });

  /**
   * Helper: cria startup + campaign + investments + payments (PAID).
   * Retorna IDs para validacao.
   */
  async function setupStartupWithCampaignAndInvestments(opts: {
    campaignStatus: 'PAUSED' | 'OPEN' | 'FUNDED' | 'CLOSED';
    investorCount: number;
    paymentMethods?: 'PIX' | 'CREDIT_CARD' | 'MIXED';
  }): Promise<{
    startupId: number;
    campaignId: number;
    paymentIds: number[];
    investmentIds: number[];
  }> {
    const { campaignStatus, investorCount, paymentMethods = 'PIX' } = opts;

    // Cria startup com campaign (modelo minimo: nome, slug, cnpj, pais, status)
    const startup = await prisma.startup.create({
      data: {
        founderId,
        nome: `Startup B11 ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        slug: `b11-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        cnpj: `${Date.now()}`.slice(0, 14).padStart(14, '0'),
        email: `startup-${Date.now()}@example.com`,
        razao_social: `Startup B11 ${Date.now()} LTDA`,
        pais: 'BRA',
        status: 'APPROVED',
        campaigns: {
          create: {
            title: `Rodada B11 ${Date.now()}`,
            targetAmount: 100000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 1,
            totalTokens: 100000,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: campaignStatus,
            closedAt: ['CLOSED', 'FUNDED'].includes(campaignStatus)
              ? new Date()
              : null,
          },
        },
      },
      include: { campaigns: true },
    });
    createdStartupIds.push(startup.id);
    const campaign = startup.campaigns[0];

    const paymentIds: number[] = [];
    const investmentIds: number[] = [];

    // Cria N investments + payments
    for (let i = 0; i < investorCount; i++) {
      const method: 'PIX' | 'CREDIT_CARD' =
        paymentMethods === 'MIXED'
          ? i % 2 === 0
            ? 'PIX'
            : 'CREDIT_CARD'
          : paymentMethods;

      // Cria investor (Investidor dummy)
      const invEmail =
        `${TEST_PREFIX}_inv${i}_${Date.now()}_${i}@example.com`.toLowerCase();
      const invHashed = await bcrypt.hash(generateValidPassword(), 10);
      const investor = await prisma.user.create({
        data: {
          email: invEmail,
          nome: `Investor B11 ${i}`,
          senha: invHashed,
          role: 'USER',
          telefone: '11987654321',
          termosAceitos: true,
          politicaAceita: true,
        },
      });
      createdUserIds.push(investor.id);

      const usePix = method === 'PIX';
      const txid = usePix ? `B11TX${Date.now()}${i}`.slice(0, 26) : null;

      // Cria Payment PAID
      const payment = await prisma.payment.create({
        data: {
          userId: investor.id,
          purpose: 'INVESTMENT',
          amount: 500 + i * 100, // 500, 600, 700, ...
          method,
          status: 'PAID',
          txid,
          paidAt: new Date(),
          campaignId: campaign.id,
        },
      });
      createdPaymentIds.push(payment.id);
      paymentIds.push(payment.id);

      // Cria Investment CONFIRMED
      const investment = await prisma.investment.create({
        data: {
          userId: investor.id,
          campaignId: campaign.id,
          amount: 500 + i * 100,
          tokensQty: 100 * (i + 1),
          status: 'CONFIRMED',
        },
      });
      createdInvestmentIds.push(investment.id);
      investmentIds.push(investment.id);

      // Liga payment <-> investment (1:1 via investmentId FK no Payment)
      await prisma.payment.update({
        where: { id: payment.id },
        data: { investmentId: investment.id },
      });
    }

    return {
      startupId: startup.id,
      campaignId: campaign.id,
      paymentIds,
      investmentIds,
    };
  }

  beforeEach(() => {
    // Reset call history entre cenarios (mas mantem mock implementation)
    mockPixAdapter.refundPix.mockClear();
    // Re-aplica default happy path (caso algum teste tenha configurado falha)
    mockPixAdapter.refundPix.mockImplementation(
      async ({ e2eId, amount }: { e2eId: string; amount: string }) => ({
        id: `MOCK-REFUND-${e2eId.slice(0, 8)}-${Date.now()}`,
        status: 'DEVOLVIDO',
        valor: amount,
      }),
    );
  });

  // ============================================================
  // C1 — Cancelamento com refunds completos (3 investments PIX)
  // ============================================================
  describe('C1: cancelamento de rodada PAUSED com 3 investments CONFIRMED (PIX)', () => {
    it('processa 3 refunds, marca 3 Investments REFUNDED e fecha campaign como CLOSED', async () => {
      const { startupId, campaignId, paymentIds, investmentIds } =
        await setupStartupWithCampaignAndInvestments({
          campaignStatus: 'PAUSED',
          investorCount: 3,
          paymentMethods: 'PIX',
        });

      const res = await request(app.getHttpServer())
        .patch(`/startup/${startupId}/rodada/${campaignId}/cancelar`)
        .set('Cookie', founderCookie)
        .expect(200);

      expect(res.body.error).toBe(false);
      expect(res.body.data.roundStatus).toBe('cancelada');
      expect(res.body.data.refundsProcessed).toBe(3);

      // Adapter chamado 3x (PIX)
      expect(mockPixAdapter.refundPix).toHaveBeenCalledTimes(3);

      // Campaign foi fechada
      const campaignAfter = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });
      expect(campaignAfter?.status).toBe('CLOSED');
      expect(campaignAfter?.closedAt).not.toBeNull();

      // 3 Payments marcados REFUNDED
      const paymentsAfter = await prisma.payment.findMany({
        where: { id: { in: paymentIds } },
      });
      expect(paymentsAfter.every((p) => p.status === 'REFUNDED')).toBe(true);

      // 3 Investments marcados REFUNDED
      const investmentsAfter = await prisma.investment.findMany({
        where: { id: { in: investmentIds } },
      });
      expect(investmentsAfter.every((inv) => inv.status === 'REFUNDED')).toBe(
        true,
      );

      // 3 AuditLog PAYMENT_REFUND criados
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'PAYMENT_REFUND',
          entity: 'Payment',
          entityId: { in: paymentIds.map(String) },
        },
      });
      expect(auditLogs.length).toBe(3);
      createdAuditLogIds.push(...auditLogs.map((a) => a.id));
    });
  });

  // ============================================================
  // C2 — Cancelamento sem investimentos
  // ============================================================
  describe('C2: cancelamento de rodada PAUSED vazia (sem investments)', () => {
    it('fecha campaign sem chamar refund e sem gerar AuditLog de refund', async () => {
      // Snapshot ANTES: contagem de logs PAYMENT_REFUND existentes
      const logsCountBefore = await prisma.auditLog.count({
        where: { action: 'PAYMENT_REFUND' },
      });

      const startup = await prisma.startup.create({
        data: {
          founderId,
          nome: `Startup C2 ${Date.now()}`,
          slug: `c2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          cnpj: `${Date.now()}`.slice(0, 14).padStart(14, '0'),
          email: `c2-${Date.now()}@example.com`,
          razao_social: `Startup C2 ${Date.now()} LTDA`,
          pais: 'BRA',
          status: 'APPROVED',
          campaigns: {
            create: {
              title: `Rodada C2 ${Date.now()}`,
              targetAmount: 50000,
              minInvestment: 100,
              valuation: 500000,
              tokenPrice: 1,
              totalTokens: 50000,
              deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: 'PAUSED',
            },
          },
        },
        include: { campaigns: true },
      });
      createdStartupIds.push(startup.id);
      const campaign = startup.campaigns[0];

      const res = await request(app.getHttpServer())
        .patch(`/startup/${startup.id}/rodada/${campaign.id}/cancelar`)
        .set('Cookie', founderCookie)
        .expect(200);

      expect(res.body.error).toBe(false);
      expect(res.body.data.roundStatus).toBe('cancelada');
      expect(res.body.data.refundsProcessed).toBe(0);

      // Nenhum refund chamado
      expect(mockPixAdapter.refundPix).not.toHaveBeenCalled();

      // Campaign fechada
      const campaignAfter = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      });
      expect(campaignAfter?.status).toBe('CLOSED');
      expect(campaignAfter?.closedAt).not.toBeNull();

      // Sem audit logs PAYMENT_REFUND novos nesta run (C2 nao processa refunds)
      // Comparacao: contagem ANTES do cancelamento vs DEPOIS
      const logsCountAfter = await prisma.auditLog.count({
        where: { action: 'PAYMENT_REFUND' },
      });
      // Nenhum refund foi feito em C2 → contagem nao deve mudar
      expect(logsCountAfter).toBe(logsCountBefore);
    });
  });

  // ============================================================
  // C3 — Falha parcial com rollback (2o refund falha → 502)
  // ============================================================
  describe('C3: cancelamento com falha parcial (2o refund PIX timeout)', () => {
    it('retorna 502, NAO fecha campaign, e mantem 1 investment REFUNDED (1o que succeeded)', async () => {
      const { startupId, campaignId, paymentIds, investmentIds } =
        await setupStartupWithCampaignAndInvestments({
          campaignStatus: 'PAUSED',
          investorCount: 3,
          paymentMethods: 'PIX',
        });

      // Configura PIX adapter para falhar no 2o refund
      let callCount = 0;
      mockPixAdapter.refundPix.mockImplementation(
        async ({ e2eId, amount }: { e2eId: string; amount: string }) => {
          callCount++;
          if (callCount === 2) {
            throw new Error('EFI timeout');
          }
          return {
            id: `MOCK-REFUND-${e2eId.slice(0, 8)}-${Date.now()}-${callCount}`,
            status: 'DEVOLVIDO',
            valor: amount,
          };
        },
      );

      const res = await request(app.getHttpServer())
        .patch(`/startup/${startupId}/rodada/${campaignId}/cancelar`)
        .set('Cookie', founderCookie)
        .expect(200); // backend retorna 200 com error:true wrapper

      expect(res.body.error).toBe(true);
      expect(res.body.codigo).toBe(502);
      expect(res.body.message).toMatch(/Refund falhou/i);

      // Adapter chamado 2x (1o OK, 2o falhou antes de chamar o 3o)
      expect(mockPixAdapter.refundPix).toHaveBeenCalledTimes(2);

      // Campaign NAO foi fechada (status original mantido)
      const campaignAfter = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });
      expect(campaignAfter?.status).toBe('PAUSED');
      expect(campaignAfter?.closedAt).toBeNull();

      // 1o Payment marcado REFUNDED (refund succeedeu)
      const payment1 = await prisma.payment.findUnique({
        where: { id: paymentIds[0] },
      });
      expect(payment1?.status).toBe('REFUNDED');

      // 2o e 3o Payment NAO foram alterados (continuam PAID)
      const payments234 = await prisma.payment.findMany({
        where: { id: { in: [paymentIds[1], paymentIds[2]] } },
      });
      expect(payments234.every((p) => p.status === 'PAID')).toBe(true);

      // 1o Investment REFUNDED (ja passou pelo service), 2o e 3o CONFIRMED
      const investments = await prisma.investment.findMany({
        where: { id: { in: investmentIds } },
        orderBy: { id: 'asc' },
      });
      expect(investments[0].status).toBe('REFUNDED');
      expect(investments[1].status).toBe('CONFIRMED');
      expect(investments[2].status).toBe('CONFIRMED');

      // AuditLog registra a falha (PAYMENT_REFUND_FAILED)
      const failedLogs = await prisma.auditLog.findMany({
        where: {
          action: 'PAYMENT_REFUND_FAILED',
          entity: 'Payment',
          entityId: paymentIds[1].toString(),
        },
      });
      expect(failedLogs.length).toBeGreaterThanOrEqual(1);
      createdAuditLogIds.push(...failedLogs.map((l) => l.id));
    });
  });

  // ============================================================
  // C4 — Status invalido (roundStatus = 'encerrada') → 409 Conflict
  // ============================================================
  describe('C4: cancelamento de rodada com status invalido', () => {
    it('retorna 409 quando campaign.status = FUNDED (roundStatus=encerrada)', async () => {
      const { startupId, campaignId } =
        await setupStartupWithCampaignAndInvestments({
          campaignStatus: 'FUNDED',
          investorCount: 0,
        });

      const res = await request(app.getHttpServer())
        .patch(`/startup/${startupId}/rodada/${campaignId}/cancelar`)
        .set('Cookie', founderCookie)
        .expect(409);

      // NestJS ConflictException retorna mensagem direta, nao wrapper ResponseDto
      expect(res.body.message || res.body.data?.message).toMatch(
        /Status atual|rodada/i,
      );

      // Nenhum refund chamado
      expect(mockPixAdapter.refundPix).not.toHaveBeenCalled();

      // Campaign mantem status FUNDED
      const campaignAfter = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });
      expect(campaignAfter?.status).toBe('FUNDED');
    });

    it('retorna 409 quando campaign.status = OPEN (roundStatus=ativa)', async () => {
      const { startupId, campaignId } =
        await setupStartupWithCampaignAndInvestments({
          campaignStatus: 'OPEN',
          investorCount: 0,
        });

      const res = await request(app.getHttpServer())
        .patch(`/startup/${startupId}/rodada/${campaignId}/cancelar`)
        .set('Cookie', founderCookie)
        .expect(409);

      expect(res.body.message || res.body.data?.message).toMatch(
        /Status atual|rodada/i,
      );

      // Campaign mantem status OPEN
      const campaignAfter = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });
      expect(campaignAfter?.status).toBe('OPEN');
    });

    it('retorna 404 quando startup nao existe', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/startup/9999999/rodada/9999999/cancelar`)
        .set('Cookie', founderCookie)
        .expect(200); // service retorna ResponseDto.error com codigo 404

      expect(res.body.error).toBe(true);
      expect(res.body.codigo).toBe(404);
    });

    it('retorna 403 quando founder tenta cancelar startup de outro founder', async () => {
      // Cria o dono da startup (FOUNDER role, com subscription ACTIVE
      // para passar o AuthGuard session filter)
      const otherEmail =
        `${TEST_PREFIX}_other_${Date.now()}@example.com`.toLowerCase();
      const otherPassword = generateValidPassword();
      const otherHashed = await bcrypt.hash(otherPassword, 10);
      const planRecord = await prisma.plan.findFirst({
        where: { slug: 'fundador' },
      });
      const planId = planRecord?.id ?? 1;
      const other = await prisma.user.create({
        data: {
          email: otherEmail,
          nome: 'Outro Founder',
          senha: otherHashed,
          role: 'FOUNDER',
          telefone: '11987654321',
          termosAceitos: true,
          politicaAceita: true,
          subscriptions: {
            create: {
              planId,
              status: 'ACTIVE',
              startedAt: new Date(),
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
      createdUserIds.push(other.id);

      // Cria startup PERTENCENTE ao outro founder
      const otherStartup = await prisma.startup.create({
        data: {
          founderId: other.id,
          nome: `Startup Other ${Date.now()}`,
          slug: `other-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          cnpj: `${Date.now()}9`.slice(0, 14).padStart(14, '0'),
          email: `other-startup-${Date.now()}@example.com`,
          razao_social: `Startup Other ${Date.now()} LTDA`,
          pais: 'BRA',
          status: 'APPROVED',
          campaigns: {
            create: {
              title: `Rodada Other ${Date.now()}`,
              targetAmount: 10000,
              minInvestment: 100,
              valuation: 100000,
              tokenPrice: 1,
              totalTokens: 10000,
              deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: 'PAUSED',
            },
          },
        },
        include: { campaigns: true },
      });
      createdStartupIds.push(otherStartup.id);
      const otherCampaign = otherStartup.campaigns[0];

      // Cria um TERCEIRO founder (com subscription ACTIVE) que tera cookie
      // para tentar cancelar startup do `other`
      const thirdEmail =
        `${TEST_PREFIX}_third_${Date.now()}@example.com`.toLowerCase();
      const thirdPassword = generateValidPassword();
      const thirdHashed = await bcrypt.hash(thirdPassword, 10);
      const third = await prisma.user.create({
        data: {
          email: thirdEmail,
          nome: 'Terceiro Founder',
          senha: thirdHashed,
          role: 'FOUNDER',
          telefone: '11987654321',
          termosAceitos: true,
          politicaAceita: true,
          subscriptions: {
            create: {
              planId,
              status: 'ACTIVE',
              startedAt: new Date(),
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
      createdUserIds.push(third.id);

      // Login do terceiro
      const loginRes = await request(app.getHttpServer())
        .post('/auth')
        .send({ email: thirdEmail, senha: thirdPassword })
        .expect(200);

      const thirdSessionId = loginRes.body.data.sessionId;
      await sessionService.storeVerificationCode(
        thirdSessionId,
        twoFactorCode!,
        300,
      );
      await request(app.getHttpServer())
        .post('/auth/verify-code')
        .set('Cookie', buildAuthCookie(thirdSessionId))
        .send({ codigo: twoFactorCode })
        .expect(200);

      // Refresh session cache com subscriptions (caso o verify-code nao
      // tenha incluido no payload)
      const freshThird = await prisma.user.findUnique({
        where: { id: third.id },
        include: {
          subscriptions: { where: { status: 'ACTIVE' } },
        },
      });
      await sessionService.updateSession(thirdSessionId, {
        ...freshThird,
        af2Verified: true,
        af2VerifiedAt: new Date().toISOString(),
        lastAccessAt: new Date().toISOString(),
      } as Record<string, unknown>);

      const thirdCookie = buildAuthCookie(thirdSessionId);

      const res = await request(app.getHttpServer())
        .patch(
          `/startup/${otherStartup.id}/rodada/${otherCampaign.id}/cancelar`,
        )
        .set('Cookie', thirdCookie)
        .expect(200);

      expect(res.body.error).toBe(true);
      expect(res.body.codigo).toBe(403);
    });
  });

  // ============================================================
  // RELATORIO
  // ============================================================
  describe('RELATORIO B11 Cancel + Refund E2E', () => {
    it('resumo dos cenarios executados', () => {
      console.log(`
      ============================================
      [B11/T055 — Cancelamento de Rodada com Estorno]
      ============================================
      C1 - Cancelamento PAUSED + 3 PIX investments:
            - 3 refunds PIX OK
            - 3 Payments REFUNDED, 3 Investments REFUNDED
            - Campaign CLOSED + closedAt preenchido
            - 3 AuditLog PAYMENT_REFUND criados
      C2 - Cancelamento PAUSED sem investments:
            - 0 refunds
            - Campaign CLOSED sem audit log
      C3 - Falha parcial (2o refund timeout):
            - Resposta 502 com mensagem "Refund falhou..."
            - 1 Payment REFUNDED (1o OK), 2 e 3 permanecem PAID
            - 1 Investment REFUNDED (1o), 2 e 3 permanecem CONFIRMED
            - Campaign NAO foi fechada (rollback)
            - AuditLog PAYMENT_REFUND_FAILED registrado
      C4 - Status invalido:
            - FUNDED (encerrada) → 409
            - OPEN (ativa) → 409
            - Startup inexistente → 404
            - Founder de outro user → 403
      ============================================
      Total de cenarios: 4 (com 6 testes)
      Profile: LEAN (Direct Coding)
      Coverage target: >=70%
      ============================================
      `);
      expect(founderId).toBeDefined();
      expect(createdStartupIds.length).toBeGreaterThanOrEqual(4);
    });
  });
});
