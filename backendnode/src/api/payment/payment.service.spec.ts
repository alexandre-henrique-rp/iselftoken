import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from 'src/api/config/config.service';
import { InvestmentsService } from 'src/api/investments/investments.service';
import { SessionService } from 'src/auth/session/session.service';
import { PaymentPublisher } from 'src/messaging/payment.publisher';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { SystemConfigService } from '../../common/system-config/system-config.service';
import { CouponSettlementService } from './coupons/coupon-settlement.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaymentMethodDto, PaymentPurposeDto } from './dto/create-payment.dto';
import { EfiChargeAdapter } from './efi/adapters/efi-charge.adapter';
import { EfiPixAdapter } from './efi/adapters/efi-pix.adapter';
import { PaymentService } from './payment.service';
import { InstallmentCalculatorService } from './service/installment-calculator.service';
import { InstallmentConfigService } from './service/installment-config.service';

describe('PaymentService', () => {
  let service: PaymentService;

  const mockPayment = {
    id: 1,
    userId: 1,
    amount: 1000,
    method: 'PIX',
    purpose: 'INVESTMENT',
    status: 'PENDING',
    txid: null,
    qrCodeBase64: null,
    copyPastePix: null,
    paidAt: null,
    createdAt: new Date(),
    user: { nome: 'João Silva', email: 'joao@test.com' },
  };

  const mockPrismaService = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn().mockResolvedValue({ status: 'PENDING' }),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    investment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    campaign: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: 99 }),
    },
    startup: {
      findFirst: jest.fn().mockResolvedValue(null), // CNPJ não duplicado por padrão
      findUnique: jest.fn().mockResolvedValue(null),
    },
    campaignExtension: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    startupDraft: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: 7 }),
    },
    paymentOrder: {
      create: jest.fn().mockResolvedValue({ id: 300 }),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    paymentItem: {
      create: jest.fn().mockResolvedValue({ id: 301 }),
    },
    upload: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    // Executa a callback passando um `tx` que reusa os mocks acima.
    $transaction: jest.fn(async (cb: any) =>
      cb({
        subscription: mockPrismaService.subscription,
        campaign: mockPrismaService.campaign,
        campaignExtension: mockPrismaService.campaignExtension,
        payment: mockPrismaService.payment,
        paymentOrder: mockPrismaService.paymentOrder,
        paymentItem: mockPrismaService.paymentItem,
        startup: { create: jest.fn().mockResolvedValue({}) },
        startupDraft: { update: jest.fn().mockResolvedValue({}) },
        startupDrafts: { update: jest.fn().mockResolvedValue({}) },
        kYCProfile: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      }),
    ),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockInvestmentsService = {
    confirmInvestment: jest.fn(),
  };

  const mockEfiPixAdapter = {
    createPix: jest.fn(),
    getPix: jest.fn(),
    cancelPix: jest.fn(),
    refundPix: jest.fn(),
  };

  const mockEfiChargeAdapter = {
    createCharge: jest.fn(),
    createLocation: jest.fn(),
    getCharge: jest.fn(),
    createOneStepCard: jest.fn(),
    getCardCharge: jest.fn(),
    refundCard: jest.fn(),
  };

  /**
   * Mock do EventEmitter2. Fase v3 do Hub (2026-07-23): subscription/
   * investment listeners serao chamados via evento. Tests unit existentes
   * nao testam listeners (cross-module), apenas verificam que emit()
   * foi chamado com o payload correto.
   */
  const mockEventEmitter = {
    emit: jest.fn(),
  };

  // Mock for InstallmentCalculatorService (T051 integration)
  const mockInstallmentCalculatorService = {
    calculateInstallments: jest.fn().mockReturnValue({
      principal: 1000,
      installments: 6,
      interestRate: 0.0299,
      totalWithInterest: 1192.3,
      installmentAmount: 198.72,
      totalInterest: 192.3,
    }),
  };

  // Mock for InstallmentConfigService (T051 integration)
  const mockInstallmentConfigService = {
    getVigente: jest.fn().mockResolvedValue({
      id: 1,
      interestRate: 0.0299,
      maxInstallments: 12,
      minInstallmentAmount: 50,
      effectiveFrom: new Date(),
      effectiveUntil: null,
      isActive: true,
      createdById: 1,
    }),
  };

  const mockCouponSettlementService = {
    settlePayment: jest.fn().mockResolvedValue({
      settled: false,
      couponIds: [],
    }),
    reconcilePayment: jest.fn().mockResolvedValue({ couponIds: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: ConfigService,
          useValue: {
            getEffective: jest.fn().mockImplementation((key: string) => {
              if (key === 'fundraising.equityMin') return Promise.resolve(5);
              if (key === 'fundraising.equityMax') return Promise.resolve(49);
              if (key === 'fundraising.minCampaign')
                return Promise.resolve(10000);
              if (key === 'fundraising.maxCampaign')
                return Promise.resolve(5000000);
              if (key === 'fundraising.fastTrackFee')
                return Promise.resolve(2500);
              if (key === 'fundraising.tokenPrice') return Promise.resolve(200);
              if (key === 'fundraising.tokenSalePrice')
                return Promise.resolve(240);
              if (key === 'fundraising.platformFee')
                return Promise.resolve(0.05);
              return Promise.resolve(0);
            }),
          },
        },
        { provide: AuditService, useValue: mockAuditService },
        { provide: InvestmentsService, useValue: mockInvestmentsService },
        // Mock do EventEmitter2 injetado via class token (Fase v3).
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: EfiPixAdapter, useValue: mockEfiPixAdapter },
        { provide: EfiChargeAdapter, useValue: mockEfiChargeAdapter },
        // Mock services for installment integration (T051)
        {
          provide: InstallmentCalculatorService,
          useValue: mockInstallmentCalculatorService,
        },
        {
          provide: InstallmentConfigService,
          useValue: mockInstallmentConfigService,
        },
        {
          provide: SessionService,
          useValue: {
            refreshUserSubscriptions: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: PaymentPublisher,
          // Por padrão publica com sucesso (true) — evita o fallback inline.
          useValue: {
            publishPaymentConfirmed: jest.fn().mockResolvedValue(true),
            publishEfiWebhook: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: CouponSettlementService,
          useValue: mockCouponSettlementService,
        },
        {
          provide: SystemConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'COMPLIANCE_FEE') return Promise.resolve(500);
              if (key === 'FAST_DEPLOY_FEE') return Promise.resolve(1000);
              return Promise.resolve(0);
            }),
            getFinancialConfigs: jest.fn().mockResolvedValue({
              TOKEN_BASE_VALUE: 200,
              TOKEN_TRANSACTION_FEE: 1,
              TOKEN_MINT_FEE: 1,
              PLATFORM_ADMIN_FEE_PCT: 0.2,
              COMPLIANCE_FEE: 500,
              FAST_DEPLOY_FEE: 1000,
              CAMPAIGN_MIN_TARGET: 10000,
              CAMPAIGN_MAX_TARGET: 5000000,
              CAMPAIGN_MIN_TOKENS: 1000,
              CAMPAIGN_MAX_TOKENS: 10000000,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reseta as filas de mockResolvedValueOnce / mockImplementationOnce
    // que podem vazar entre testes do mesmo describe (cria Campaign → legado
    // → rollback). jest.clearAllMocks não limpa implementações por default.
    mockPrismaService.payment.create.mockReset();
    mockPrismaService.payment.findUnique.mockReset();
    mockPrismaService.payment.findFirst.mockReset();
    mockPrismaService.payment.update.mockReset();
    mockPrismaService.payment.updateMany.mockReset().mockResolvedValue({
      count: 1,
    });
    mockPrismaService.startupDraft.findUnique.mockReset();
    mockPrismaService.startupDraft.update.mockReset().mockResolvedValue({});
    mockPrismaService.upload.findFirst.mockReset().mockResolvedValue(null);
    mockPrismaService.campaign.findUnique.mockReset();
    mockPrismaService.campaign.update.mockReset().mockResolvedValue({});
    mockPrismaService.campaignExtension.findUnique.mockReset();
    mockPrismaService.campaignExtension.update
      .mockReset()
      .mockResolvedValue({});
    mockPrismaService.$transaction.mockReset();
    // Restaura o default do $transaction
    mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
      cb({
        subscription: mockPrismaService.subscription,
        campaign: mockPrismaService.campaign,
        campaignExtension: mockPrismaService.campaignExtension,
        startup: { create: jest.fn().mockResolvedValue({}) },
        startupDraft: { update: jest.fn().mockResolvedValue({}) },
        kYCProfile: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      }),
    );
  });

  describe('generatePix', () => {
    it('deve gerar QR code base64 + copyPastePix + expiresAt 24h', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockEfiPixAdapter.createPix.mockResolvedValue({
        txid: 'ISelf12345',
        location: 'https://pix-h.api.efipay.com.br/qr/123',
        pixCopiaECola: '00020126...',
        qrCodeImage: 'data:image/png;base64,iVBORw0KGgo=',
        calendario: { expiracao: 86400 },
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        txid: 'ISelf12345',
        qrCodeBase64: 'data:image/png;base64,iVBORw0KGgo=',
        copyPastePix: '00020126...',
      });

      const result = await service.generatePix(1, 1);

      expect(result.error).toBe(false);
      expect(result.data.qrCodeBase64).toBeDefined();
      expect(result.data.copyPastePix).toBeDefined();
      expect(result.data.expiresAt).toBeDefined();
      const diffHours =
        (new Date(result.data.expiresAt).getTime() - Date.now()) /
        (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(23.9);
      expect(diffHours).toBeLessThanOrEqual(24.1);
    });

    it('deve lançar 404 se pagamento não existir', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.generatePix(999, 1)).rejects.toThrow(HttpException);
    });

    it('deve lançar 403 se userId não corresponder', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(service.generatePix(1, 999)).rejects.toThrow(HttpException);
    });

    it('deve lançar 400 se pagamento não estiver PENDING', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
      });

      await expect(service.generatePix(1, 1)).rejects.toThrow(HttpException);
    });

    it('deve gerar txid com prefixo ISelf', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockEfiPixAdapter.createPix.mockResolvedValue({
        txid: 'ISelfABC123',
        location: 'https://pix-h.api.efipay.com.br/qr/abc',
        pixCopiaECola: '00020126...',
        qrCodeImage: 'data:image/png;base64,iVBORw0KGgo=',
        calendario: { expiracao: 86400 },
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        txid: 'ISelfABC123',
        qrCodeBase64: 'data:image/png;base64,iVBORw0KGgo=',
        copyPastePix: '00020126...',
      });

      const result = await service.generatePix(1, 1);

      expect(result.data.txid).toMatch(/^ISelf/);
    });
  });

  describe('cancelAndClearPixCharge', () => {
    it('cancela a cobrança externa e limpa o QR local por CAS', async () => {
      const payment = {
        id: 1,
        userId: 1,
        status: 'PENDING',
        txid: 'old-txid',
        serviceDetails: { couponCode: 'OLD' },
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(payment);
      mockEfiPixAdapter.cancelPix.mockResolvedValue({
        txid: 'old-txid',
        status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR',
      });
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.cancelAndClearPixCharge(1, 1, 'old-txid');

      expect(mockEfiPixAdapter.cancelPix).toHaveBeenCalledWith('old-txid');
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ txid: 'old-txid' }),
          data: expect.objectContaining({
            txid: null,
            qrCodeBase64: null,
            copyPastePix: null,
            efiLocation: null,
          }),
        }),
      );
      expect(result.txid).toBe('old-txid');
    });

    it('não limpa o payment quando o cancelamento EFI falha', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        status: 'PENDING',
        txid: 'old-txid',
        serviceDetails: {},
      });
      mockEfiPixAdapter.cancelPix.mockRejectedValue(
        new Error('efi unavailable'),
      );

      await expect(
        service.cancelAndClearPixCharge(1, 1, 'old-txid'),
      ).rejects.toThrow('efi unavailable');
      expect(mockPrismaService.payment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('processWebhookPaymentReceived', () => {
    // Helper: S18.6 — webhook agora usa `findMany` (txid não é mais @unique).
    // Cada teste deste describe mocka ambos os métodos para retornar o
    // mesmo Payment envolvido em array (findMany) ou como objeto (findUnique).
    const mockPaymentAsWebhook = (payment: object, override?: object) => {
      const merged = { ...payment, ...override };
      mockPrismaService.payment.findMany.mockResolvedValue([merged] as any);
      mockPrismaService.payment.findUnique.mockResolvedValue(merged as any);
    };

    it('deve atualizar status para PAID e registrar paidAt', async () => {
      mockPaymentAsWebhook({ ...mockPayment, txid: 'ISelf123' });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
        paidAt: new Date(),
      });

      const result = await service.processWebhookPaymentReceived(
        'ISelf123',
        'E123456789',
      );

      expect(result.error).toBe(false);
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
            paidAt: expect.any(Date),
          }),
        }),
      );
    });

    it('deve retornar sucesso se PAID e efeitos já aplicados (idempotência)', async () => {
      mockPaymentAsWebhook({
        ...mockPayment,
        txid: 'ISelf123',
        status: 'PAID',
        // Idempotência total só quando os efeitos já foram aplicados.
        effectsAppliedAt: new Date(),
      });

      const result = await service.processWebhookPaymentReceived(
        'ISelf123',
        'E123456789',
      );

      expect(result.error).toBe(false);
      expect(result.message).toContain('já processado');
    });

    it('deve retornar erro 404 se pagamento não existir', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([] as any);

      const result = await service.processWebhookPaymentReceived(
        'INVALID',
        'E123',
      );

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });

    it('PAID sem effectsAppliedAt: reprocessa efeitos (recuperação de pago-sem-plano)', async () => {
      // Cenário do bloqueador: Payment ficou PAID mas os efeitos nunca
      // rodaram (crash/publish falho). A reentrega DEVE reaplicar.
      const paidSemEfeito = {
        ...mockPayment,
        id: 8,
        txid: 'ISelf-recover',
        purpose: 'SUBSCRIPTION',
        subscriptionId: 10,
        status: 'PAID',
        effectsAppliedAt: null,
        subscription: { id: 10, plan: { periodoMeses: 12 } },
      };
      mockPaymentAsWebhook(paidSemEfeito);

      const result = await service.processWebhookPaymentReceived(
        'ISelf-recover',
        'E2E-RECOVER',
      );

      expect(result.error).toBe(false);
      // NÃO curto-circuita como "já processado" — reprocessa os efeitos.
      expect(result.message).toContain('reprocessados');
    });

    it('deve.emitir payment.confirmed quando status transiciona para PAID', async () => {
      const paymentWithSub = {
        ...mockPayment,
        id: 5,
        txid: 'ISelf123',
        purpose: 'SUBSCRIPTION',
        subscriptionId: 10,
        investmentId: null,
        campaignId: null,
        subscription: { id: 10, plan: { periodoMeses: 12 } },
      };
      mockPaymentAsWebhook(paymentWithSub);
      mockPrismaService.payment.update.mockResolvedValue({
        ...paymentWithSub,
        status: 'PAID',
      });

      await service.processWebhookPaymentReceived('ISelf123', 'E123456789');

      // Shape aninhado (PaymentConfirmedEvent): payload sob `payment`.
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.confirmed',
        expect.objectContaining({
          paymentId: 5,
          payment: expect.objectContaining({
            id: 5,
            userId: 1,
            purpose: 'SUBSCRIPTION',
            subscriptionId: 10,
          }),
        }),
      );
    });

    it('idempotente: não emite evento se já PAID', async () => {
      mockPaymentAsWebhook({
        ...mockPayment,
        txid: 'ISelf123',
        status: 'PAID',
        effectsAppliedAt: new Date(),
      });

      await service.processWebhookPaymentReceived('ISelf123', 'E123456789');

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('auditLog PAYMENT_PAID registrado quando transição para PAID', async () => {
      mockPaymentAsWebhook({ ...mockPayment, txid: 'ISelf123' });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
      });

      await service.processWebhookPaymentReceived('ISelf123', 'E123456789');

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_PAID',
          entity: 'Payment',
          entityId: 1,
          userId: null,
          oldValue: expect.objectContaining({ status: 'PENDING' }),
          newValue: expect.objectContaining({ status: 'PAID' }),
        }),
      );
    });

    it('S18.6 — PIX consolidado: marca 2 Payments (TOKEN_RESERVATION + FAST_TRACK_REVIEW) com mesmo txid', async () => {
      const ftPayment = {
        ...mockPayment,
        id: 100,
        purpose: 'FAST_TRACK_REVIEW',
        txid: 'ISelf-CONSOLIDATED',
        status: 'PENDING',
        effectsAppliedAt: null,
      };
      const trPayment = {
        ...mockPayment,
        id: 101,
        purpose: 'TOKEN_RESERVATION',
        txid: 'ISelf-CONSOLIDATED',
        status: 'PENDING',
        effectsAppliedAt: null,
      };
      mockPrismaService.payment.findMany.mockResolvedValue([
        trPayment,
        ftPayment,
      ] as any);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
        paidAt: new Date(),
      });

      const result = await service.processWebhookPaymentReceived(
        'ISelf-CONSOLIDATED',
        'E2E-CONSOLIDATED',
      );

      expect(result.error).toBe(false);
      // Os 2 Payments foram marcados PAID em sequência.
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.payment.updateMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: 101, status: 'PENDING' },
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
      expect(mockPrismaService.payment.updateMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: 100, status: 'PENDING' },
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
      // Log consolidado com os propósitos.
      expect(result.data).toHaveLength(2);
    });

    it('S18.6 — reconciliação: Fast Track com txid=null (legado) é espelhado e marcado PAID', async () => {
      // Caso legado: Payment FAST_TRACK_REVIEW foi criado antes do fix
      // de generatePix (txid permanece NULL). O webhook recebe o txid
      // do Payment principal e o reconciliador:
      //   1. Encontra o sibling via `StartupDraft.fastTrackPaymentId`
      //   2. Espelha o txid nele (UPDATE txid = webhook.txid)
      //   3. Marca PAID via findMany({ txid }) na recarga
      const trPayment = {
        ...mockPayment,
        id: 101,
        purpose: 'TOKEN_RESERVATION',
        txid: 'ISelf-RECONCILE',
        status: 'PENDING',
        effectsAppliedAt: null,
      };
      const ftLegacy = {
        ...mockPayment,
        id: 102,
        purpose: 'FAST_TRACK_REVIEW',
        txid: null, // legado: txid não foi setado
        status: 'PENDING',
        effectsAppliedAt: null,
      };
      // 1ª chamada: findMany({ txid }) → retorna só o principal (sibling tem txid=null)
      mockPrismaService.payment.findMany
        .mockResolvedValueOnce([trPayment] as any)
        // 2ª chamada (siblings): retorna o Fast Track com txid=null
        .mockResolvedValueOnce([ftLegacy] as any)
        // 3ª chamada (recarga após espelhar txid): retorna ambos
        .mockResolvedValueOnce([trPayment, ftLegacy] as any);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
        paidAt: new Date(),
      });

      const result = await service.processWebhookPaymentReceived(
        'ISelf-RECONCILE',
        'E2E-RECONCILE',
      );

      expect(result.error).toBe(false);
      // Espelha o txid no Fast Track
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [102] } },
          data: expect.objectContaining({ txid: 'ISelf-RECONCILE' }),
        }),
      );
      // 3 chamadas no total: 1 espelhamento de txid + 2 PAID transitions
      // (principal na recarga + sibling encontrado via txid após o espelho).
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledTimes(3);
      // Mensagem reflete o caso consolidado (2 Payments)
      expect(result.message).toBe('Pagamento(s) confirmado(s)');
    });

    it('S18.7 — PIX consolidado COMPLIANCE_FEE + FAST_DEPLOY: marca ambos como PAID via mesmo txid', async () => {
      // Cenário: founder quita a Taxa de Compliance + Publicação Rápida em um
      // único PIX. ANTES deste fix o FAST_DEPLOY ficava PENDING (sibling
      // detectado só por txid exato, e o FAST_DEPLOY é vinculado via
      // campaignId, não por txid compartilhado). DEPOIS: reconciliação
      // espelha o txid no FAST_DEPLOY via campaignId do primary COMPLIANCE_FEE
      // e ambos viram PAID atomicamente.
      const complianceFee = {
        ...mockPayment,
        id: 91,
        purpose: 'COMPLIANCE_FEE',
        campaignId: 7,
        txid: 'ISelf-COMPLIANCE-DEPLOY',
        status: 'PENDING',
        effectsAppliedAt: null,
      };
      const fastDeploy = {
        ...mockPayment,
        id: 92,
        purpose: 'FAST_DEPLOY',
        campaignId: 7,
        txid: null, // FAST_DEPLOY não recebeu o txid (caso legado)
        status: 'PENDING',
        effectsAppliedAt: null,
      };
      // Sequência de findMany:
      // 1ª: where { txid } → retorna só o principal
      // 2ª: siblings FastTrack (StartupDraft) → []
      // 3ª: siblings FastDeploy (campaignId) → [fastDeploy]
      // 4ª: recarga após espelhar txid → [complianceFee, fastDeploy]
      mockPrismaService.payment.findMany
        .mockResolvedValueOnce([complianceFee] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([fastDeploy] as any)
        .mockResolvedValueOnce([complianceFee, fastDeploy] as any);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
        paidAt: new Date(),
      });

      const result = await service.processWebhookPaymentReceived(
        'ISelf-COMPLIANCE-DEPLOY',
        'E2E-COMPLIANCE-DEPLOY',
      );

      expect(result.error).toBe(false);
      // 1) Espelhamento do txid no FAST_DEPLOY
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [92] } },
          data: expect.objectContaining({ txid: 'ISelf-COMPLIANCE-DEPLOY' }),
        }),
      );
      // 2) Marca COMPLIANCE_FEE PAID
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 91, status: 'PENDING' },
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
      // 3) Marca FAST_DEPLOY PAID
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 92, status: 'PENDING' },
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
      // Total: 3 updateMany (1 mirror + 2 PAID)
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledTimes(3);
      expect(result.message).toBe('Pagamento(s) confirmado(s)');
    });

    it('S18.7 — end-to-end: createComplianceFee + generatePix + webhook propaga PAID para Order+Items+Payment irmão', async () => {
      // Simula o fluxo completo do founder:
      // 1) createComplianceFee(3, 42, true) → cria Order #500 com 2 items +
      //    2 Payments legados (id 91 + 92)
      // 2) generatePix(91) → atribui txid='ISelf-CONSOLIDATED' no primary +
      //    espelha no FAST_DEPLOY + atualiza Order
      // 3) webhook chega com txid → marca Order #500 PAID, items PAID, e ambos
      //    Payments legados PAID (atomicamente)
      const order500 = {
        id: 500,
        userId: 42,
        status: 'PENDING',
        method: 'PIX',
        totalAmount: 2500,
        totalOriginal: 2500,
        totalDiscount: 0,
        txid: null,
        campaignId: 3,
      };
      const primaryPayment = {
        id: 91,
        userId: 42,
        amount: new Prisma.Decimal('1500.00'),
        originalAmount: new Prisma.Decimal('1500.00'),
        discountAmount: new Prisma.Decimal('0'),
        paidAmount: new Prisma.Decimal('1500.00'),
        method: 'PIX',
        purpose: 'COMPLIANCE_FEE',
        status: 'PENDING',
        txid: 'ISelf-CONSOLIDATED',
        campaignId: 3,
        subscriptionId: null,
        investmentId: null,
        manualApprovedById: null,
        effectsAppliedAt: null,
        serviceDetails: {},
        paymentGroupId: null,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        paidAt: null,
        user: {
          nome: 'Founder Test',
          email: 'founder@test.com',
          reg_documento: '12345678901',
          cidade: 'São Paulo',
          uf: 'SP',
        },
      } as any;
      const siblingPayment = {
        ...primaryPayment,
        id: 92,
        amount: new Prisma.Decimal('1000.00'),
        originalAmount: new Prisma.Decimal('1000.00'),
        purpose: 'FAST_DEPLOY',
        paymentGroupId: 91,
        txid: null, // FAST_DEPLOY não tem txid ainda
      } as any;
      mockPrismaService.payment.findUnique.mockImplementation(
        async (args: any) => {
          if (args.where.id === 91) return primaryPayment;
          if (args.where.id === 92) return siblingPayment;
          return null;
        },
      );
      mockPrismaService.payment.findFirst.mockResolvedValue(siblingPayment);
      mockPrismaService.payment.findMany.mockImplementation(
        async (args: any) => {
          if (args?.where?.txid) return [primaryPayment, siblingPayment];
          return [primaryPayment, siblingPayment];
        },
      );
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.payment.update.mockResolvedValue({});
      mockPrismaService.paymentOrder.findFirst.mockResolvedValue(order500);
      mockPrismaService.paymentOrder.update.mockResolvedValue({});
      mockEfiPixAdapter.createPix.mockResolvedValue({
        txid: 'ISelf-CONSOLIDATED',
        qrCodeImage: 'data:image/png;base64,...',
        pixCopiaECola: '00020126...',
        location: 'https://pix.example.com/123',
      });

      // (2) generatePix(91) — espelha txid
      const pixResult = await service.generatePix(91, 42);
      expect(pixResult.error).toBe(false);
      // Order #500 foi encontrada e atualizada com o txid
      expect(mockPrismaService.paymentOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 500 },
          data: expect.objectContaining({ txid: 'ISelf-CONSOLIDATED' }),
        }),
      );

      // (3) webhook recebe o txid — marca ambos Payments como PAID
      const webhookResult = await service.processWebhookPaymentReceived(
        'ISelf-CONSOLIDATED',
        'E2E-CONSOLIDATED',
      );
      expect(webhookResult.error).toBe(false);
      // Reconciliação S18.6+S18.7: o txid é espelhado nos siblings do bundle
      // (FAST_DEPLOY via campaignId) — assertion flexível porque a query usa
      // `OR` com múltiplas condições.
      const mirrorCall = mockPrismaService.payment.updateMany.mock.calls.find(
        (c: any) =>
          c[0]?.data?.txid === 'ISelf-CONSOLIDATED' &&
          c[0]?.where?.OR !== undefined,
      );
      expect(mirrorCall).toBeDefined();
      // Os 2 Payments são marcados PAID
      const paidCalls = mockPrismaService.payment.updateMany.mock.calls.filter(
        (c: any) => c[0]?.data?.status === 'PAID',
      );
      const paidIds = paidCalls.map((c: any) => c[0]?.where?.id).sort();
      expect(paidIds).toEqual([91, 92]);
    });
  });

  describe('syncPayment', () => {
    it('retorna status terminal sem chamar EFI quando payment já está PAID', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        id: 1,
        status: 'PAID',
      });

      const result = await service.syncPayment(1, 1, 'USER');

      expect(result.paymentId).toBe(1);
      expect(result.status).toBe('PAID');
      expect(mockEfiPixAdapter.getPix).not.toHaveBeenCalled();
    });

    it('retorna status terminal sem chamar EFI quando payment está CANCELED', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        id: 1,
        status: 'CANCELED',
      });

      const result = await service.syncPayment(1, 1, 'USER');

      expect(result.paymentId).toBe(1);
      expect(result.status).toBe('CANCELED');
      expect(mockEfiPixAdapter.getPix).not.toHaveBeenCalled();
    });

    it('consulta EFI quando PENDING + txid + EFI_ENABLED e processa sync', async () => {
      const paidPayment = {
        ...mockPayment,
        id: 7,
        txid: 'ISelfABC',
        status: 'PAID',
        effectsAppliedAt: new Date(), // <-- necessário para idempotência
      };
      // Mock findUnique: 1=initial lookup, 2=processWebhookPaymentReceived (findUnique inside),
      // 3=re-fetch after sync
      const pendingPayment = {
        ...mockPayment,
        id: 7,
        txid: 'ISelfABC',
        status: 'PENDING',
        effectsAppliedAt: null,
      };
      mockPrismaService.payment.findUnique
        .mockResolvedValueOnce(pendingPayment) // syncPayment: lookup inicial
        .mockResolvedValueOnce(pendingPayment) // processWebhookPaymentReceived: lookup por txid (ainda PENDING → marca PAID)
        .mockResolvedValueOnce(pendingPayment) // processPaymentEffects: lookup payment (effectsAppliedAt: null → processa)
        .mockResolvedValueOnce(paidPayment) // confirmInvestmentForPayment: lookup payment (sem investmentId → return early)
        .mockResolvedValueOnce(paidPayment); // syncPayment: re-fetch após sync
      // Mock findMany (S18.6 — processWebhookPaymentReceived agora usa findMany)
      mockPrismaService.payment.findMany.mockResolvedValue([
        pendingPayment,
      ] as any);
      // Mock findFirst (usado por processWebhookPaymentReceived para buscar por txid)
      mockPrismaService.payment.findFirst.mockResolvedValue(paidPayment);
      mockPrismaService.payment.update.mockResolvedValue(paidPayment);
      mockEfiPixAdapter.getPix.mockResolvedValue({
        txid: 'ISelfABC',
        status: 'CONCLUIDA',
        calendario: { criacao: new Date().toISOString(), expiracao: 3600 },
        valor: { original: '1000.00' },
        pix: [
          {
            valor: '1000.00',
            horarios: { operacao: 'E2E-ID-SYNC' },
          },
        ],
      });

      const result = await service.syncPayment(7, 1, 'USER');

      expect(result.paymentId).toBe(7);
      expect(result.status).toBe('PAID');
      expect(mockEfiPixAdapter.getPix).toHaveBeenCalledWith('ISelfABC');
    });

    it('throws 404 quando payment não existe', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.syncPayment(999, 1, 'USER')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 403 quando não é owner e não é ADMIN', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        id: 1,
        userId: 99, // diferente do userId=1
      });

      await expect(service.syncPayment(1, 1, 'USER')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ADMIN pode consultar qualquer payment', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        id: 1,
        userId: 99,
        status: 'PAID',
      });

      const result = await service.syncPayment(1, 1, 'ADMIN');

      expect(result.paymentId).toBe(1);
      expect(result.status).toBe('PAID');
    });

    it('FINANCEIRO pode consultar qualquer payment', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        id: 1,
        userId: 99,
        status: 'CANCELED',
      });

      const result = await service.syncPayment(1, 1, 'FINANCEIRO');

      expect(result.paymentId).toBe(1);
      expect(result.status).toBe('CANCELED');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      // S18.7 — dual-write: o _createOrderWithItems chama $transaction com
      // tx.payment, tx.paymentOrder, tx.paymentItem. Reconfigura após
      // clearAllMocks.
      mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
        cb({
          payment: mockPrismaService.payment,
          paymentOrder: mockPrismaService.paymentOrder,
          paymentItem: mockPrismaService.paymentItem,
        }),
      );
    });

    it('deve criar pagamento com status PENDING', async () => {
      const createdPayment = {
        ...mockPayment,
        id: 2,
      };
      mockPrismaService.payment.create
        .mockImplementationOnce((args: any) =>
          Promise.resolve({ id: 2, ...args.data }),
        )
        .mockImplementationOnce((args: any) =>
          Promise.resolve({ id: 2, ...args.data }),
        )
        .mockResolvedValueOnce(createdPayment);
      mockPrismaService.investment.findFirst.mockResolvedValue({
        id: 5,
        campaignId: 8,
      });

      const result = await service.create(
        {
          amount: 500,
          method: PaymentMethodDto.PIX,
          purpose: PaymentPurposeDto.INVESTMENT,
          investmentId: 5,
        },
        1,
      );

      expect(result.error).toBe(false);
      // S18.7 — dual-write: payment.create é chamado 2x (1 no helper +
      // 1 no update das FKs) e findUnique para retornar o pagamento completo.
      expect(mockPrismaService.payment.create).toHaveBeenCalled();
    });

    it('cria pagamento de assinatura somente para assinatura do usuário', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({ id: 4 });
      const subPayment = {
        ...mockPayment,
        id: 3,
        purpose: 'SUBSCRIPTION',
      };
      mockPrismaService.payment.create
        .mockImplementationOnce((args: any) =>
          Promise.resolve({ id: 3, ...args.data }),
        )
        .mockImplementationOnce((args: any) =>
          Promise.resolve({ id: 3, ...args.data }),
        )
        .mockResolvedValueOnce(subPayment);

      const result = await service.create(
        {
          amount: 500,
          method: PaymentMethodDto.PIX,
          purpose: PaymentPurposeDto.SUBSCRIPTION,
          subscriptionId: 4,
        },
        1,
      );

      expect(result.error).toBe(false);
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { id: 4, userId: 1 },
        select: { id: true },
      });
    });

    it('rejeita assinatura pertencente a outro usuário', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            amount: 500,
            method: PaymentMethodDto.PIX,
            purpose: PaymentPurposeDto.SUBSCRIPTION,
            subscriptionId: 4,
          },
          1,
        ),
      ).rejects.toMatchObject({
        response: { message: 'REFERENCIA_PAGAMENTO_INVALIDA' },
      });
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });

    it('rejeita investimento pertencente a outro usuário', async () => {
      mockPrismaService.investment.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            amount: 500,
            method: PaymentMethodDto.PIX,
            purpose: PaymentPurposeDto.INVESTMENT,
            investmentId: 5,
          },
          1,
        ),
      ).rejects.toMatchObject({
        response: { message: 'REFERENCIA_PAGAMENTO_INVALIDA' },
      });
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });

    it('rejeita campanha inconsistente com o investimento do usuário', async () => {
      mockPrismaService.investment.findFirst.mockResolvedValue({
        id: 5,
        campaignId: 8,
      });

      await expect(
        service.create(
          {
            amount: 500,
            method: PaymentMethodDto.PIX,
            purpose: PaymentPurposeDto.INVESTMENT,
            investmentId: 5,
            campaignId: 9,
          },
          1,
        ),
      ).rejects.toMatchObject({
        response: { message: 'REFERENCIA_PAGAMENTO_INVALIDA' },
      });
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });

    it('rejeita reserva de campanha de outro founder', async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            amount: 500,
            method: PaymentMethodDto.PIX,
            purpose: PaymentPurposeDto.TOKEN_RESERVATION,
            campaignId: 8,
          },
          1,
        ),
      ).rejects.toMatchObject({
        response: { message: 'REFERENCIA_PAGAMENTO_INVALIDA' },
      });
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve retornar pagamento com qrCodeBase64 e copyPastePix', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        qrCodeBase64: 'base64data',
        copyPastePix: '000201...',
      });

      const result = await service.findOne(1);

      expect(result.error).toBe(false);
      expect(result.data.qrCodeBase64).toBe('base64data');
      expect(result.data.copyPastePix).toBe('000201...');
    });

    it('deve retornar 404 se pagamento não existir', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });

    it('mantém 404 neutro para usuário que não é proprietário', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        purpose: 'TOKEN_RESERVATION',
        userId: 7,
        startupDraft: {
          status: 'PENDING_PAYMENT',
          payload: { nomeFantasia: 'Acme Saúde', cnpj: 'sensível' },
        },
      });

      const result = await service.findOne(1, 8);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
      expect(JSON.stringify(result)).not.toContain('Acme Saúde');
      expect(JSON.stringify(result)).not.toContain('sensível');
    });

    it.each(['PENDING_PAYMENT', 'PROCESSING', 'PROCESSED', 'FAILED'])(
      'lê o nome do snapshot sem depender do status %s',
      async (status) => {
        mockPrismaService.payment.findUnique.mockResolvedValue({
          ...mockPayment,
          purpose: 'TOKEN_RESERVATION',
          userId: 7,
          startupDraft: {
            status,
            payload: { nomeFantasia: 'Acme Saúde' },
          },
        });

        const result = await service.findOne(1, 7);

        expect(result.data.reservationContext?.displayName).toBe('Acme Saúde');
        expect(result.data.startupDraft).toBeUndefined();
      },
    );

    it('deve expor o contexto sanitizado do draft de reserva', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        purpose: 'TOKEN_RESERVATION',
        userId: 7,
        startupDraft: {
          status: 'PENDING_PAYMENT',
          payload: {
            nomeFantasia: '  Acme Saúde  ',
            razaoSocial: 'Acme Saúde Tecnologia Ltda',
            cnpj: '12.345.678/0001-90',
            banco: 'dados privados',
          },
        },
        campaign: null,
      });

      const result = await service.findOne(1, 7);

      expect(result.data.reservationContext).toEqual({
        kind: 'STARTUP_RESERVATION',
        displayName: 'Acme Saúde',
        nameSource: 'DRAFT_PAYLOAD',
        startup: null,
        campaign: null,
        totalTokens: null,
      });
      expect(JSON.stringify(result.data)).not.toContain('12.345.678');
      expect(JSON.stringify(result.data)).not.toContain('dados privados');
    });

    it('deve priorizar a startup persistida e preservar o título da rodada separado', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        purpose: 'TOKEN_RESERVATION',
        userId: 7,
        startupDraft: {
          status: 'PROCESSED',
          payload: {
            nomeFantasia: 'Nome do draft',
            razaoSocial: 'Razão do draft',
          },
        },
        campaign: {
          title: 'Rodada Seed 2026',
          startup: {
            nome: '  Startup Persistida  ',
            razao_social: 'Razão Persistida',
            slug: 'startup-persistida',
          },
        },
      });

      const result = await service.findOne(1, 7);

      expect(result.data.reservationContext).toEqual({
        kind: 'STARTUP_RESERVATION',
        displayName: 'Startup Persistida',
        nameSource: 'PERSISTED_STARTUP',
        startup: {
          slug: 'startup-persistida',
          displayName: 'Startup Persistida',
        },
        campaign: { title: 'Rodada Seed 2026' },
        totalTokens: null,
      });
    });

    it('usa razão social da startup persistida quando nome está vazio', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        purpose: 'TOKEN_RESERVATION',
        userId: 7,
        startupDraft: null,
        campaign: {
          title: 'Rodada Seed 2026',
          startup: {
            nome: '   ',
            razao_social: '  Startup Legal Persistida Ltda  ',
            slug: 'startup-legal-persistida',
          },
        },
      });

      const result = await service.findOne(1, 7);

      expect(result.data.reservationContext).toEqual({
        kind: 'STARTUP_RESERVATION',
        displayName: 'Startup Legal Persistida Ltda',
        nameSource: 'PERSISTED_STARTUP',
        startup: {
          slug: 'startup-legal-persistida',
          displayName: 'Startup Legal Persistida Ltda',
        },
        campaign: { title: 'Rodada Seed 2026' },
        totalTokens: null,
      });
    });

    it('deve usar razão social e fallback neutro sem os textos de assinatura', async () => {
      mockPrismaService.payment.findUnique
        .mockResolvedValueOnce({
          ...mockPayment,
          purpose: 'TOKEN_RESERVATION',
          userId: 7,
          startupDraft: {
            status: 'FAILED',
            payload: { nomeFantasia: '   ', razaoSocial: '  Razão Social  ' },
          },
          campaign: null,
        })
        .mockResolvedValueOnce({
          ...mockPayment,
          purpose: 'TOKEN_RESERVATION',
          userId: 7,
          startupDraft: {
            status: 'FAILED',
            payload: { nomeFantasia: ' ', razaoSocial: '\t' },
          },
          campaign: null,
        });

      const withLegalName = await service.findOne(1, 7);
      const withoutName = await service.findOne(1, 7);

      expect(withLegalName.data.reservationContext?.displayName).toBe(
        'Razão Social',
      );
      expect(withLegalName.data.reservationContext?.nameSource).toBe(
        'DRAFT_PAYLOAD',
      );
      expect(withoutName.data.reservationContext).toEqual({
        kind: 'STARTUP_RESERVATION',
        displayName: null,
        nameSource: 'NONE',
        startup: null,
        campaign: null,
        totalTokens: null,
      });
      expect(JSON.stringify(withoutName.data)).not.toContain('Token Nexus AI');
      expect(JSON.stringify(withoutName.data)).not.toContain(
        'Acesso à inteligência de mercado',
      );
    });

    it('retorna somente a allowlist mínima do checkout', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        purpose: 'TOKEN_RESERVATION',
        userId: 7,
        campaignId: 99,
        subscriptionId: 12,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        startupDraft: {
          status: 'PROCESSED',
          payload: {
            nomeFantasia: 'Acme Saúde',
            cpf: 'não deve retornar',
            email: 'nao-retornar@example.com',
          },
        },
        campaign: { title: 'Rodada Seed', startup: null },
      });

      const result = await service.findOne(1, 7);
      const publicData = result.data as Record<string, unknown>;

      expect(publicData).toMatchObject({
        id: 1,
        amount: 1000,
        method: 'PIX',
        purpose: 'TOKEN_RESERVATION',
        status: 'PENDING',
        investmentId: null,
        subscription: null,
        investment: null,
      });
      expect(publicData).not.toHaveProperty('userId');
      expect(publicData).not.toHaveProperty('campaignId');
      expect(publicData).not.toHaveProperty('subscriptionId');
      expect(publicData).not.toHaveProperty('createdAt');
      expect(publicData).not.toHaveProperty('startupDraft');
      expect(publicData).not.toHaveProperty('campaign');
      expect(JSON.stringify(publicData)).not.toContain('não deve retornar');
      expect(JSON.stringify(publicData)).not.toContain(
        'nao-retornar@example.com',
      );
    });

    it('não mistura slug persistido com nome vindo do draft', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        purpose: 'TOKEN_RESERVATION',
        userId: 7,
        startupDraft: {
          status: 'PENDING_PAYMENT',
          payload: { nomeFantasia: 'Nome do draft' },
        },
        campaign: {
          title: 'Rodada Seed',
          startup: {
            nome: '   ',
            razao_social: null,
            slug: 'startup-persistida',
          },
        },
      });

      const result = await service.findOne(1, 7);

      expect(result.data.reservationContext).toEqual({
        kind: 'STARTUP_RESERVATION',
        displayName: 'Nome do draft',
        nameSource: 'DRAFT_PAYLOAD',
        startup: null,
        campaign: { title: 'Rodada Seed' },
        totalTokens: null,
      });
    });

    it('expõe totalTokens da reserva via payload do draft ou campanha', async () => {
      mockPrismaService.payment.findUnique
        .mockResolvedValueOnce({
          ...mockPayment,
          purpose: 'TOKEN_RESERVATION',
          userId: 7,
          startupDraft: {
            status: 'PENDING_PAYMENT',
            payload: { nomeFantasia: 'Acme', totalTokens: 2500 },
          },
          campaign: null,
        })
        .mockResolvedValueOnce({
          ...mockPayment,
          purpose: 'TOKEN_RESERVATION',
          userId: 7,
          startupDraft: null,
          campaign: {
            title: 'Rodada',
            totalTokens: 3000,
            startup: { nome: 'Acme', razao_social: null, slug: 'acme' },
          },
        });

      const viaDraft = await service.findOne(1, 7);
      const viaCampaign = await service.findOne(1, 7);

      expect(viaDraft.data.reservationContext?.totalTokens).toBe(2500);
      expect(viaCampaign.data.reservationContext?.totalTokens).toBe(3000);
    });

    it('mantém reservationContext nulo para assinatura', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        purpose: 'SUBSCRIPTION',
        userId: 7,
        subscription: { plan: { nome: 'Fundador', descricao: 'Plano anual' } },
        startupDraft: {
          status: 'PENDING_PAYMENT',
          payload: { nomeFantasia: 'Não deve aparecer' },
        },
      });

      const result = await service.findOne(1, 7);

      expect(result.data.reservationContext).toBeNull();
      expect(result.data.subscription.plan.nome).toBe('Fundador');
    });
  });

  describe('generateCardCheckout', () => {
    const cardInput = {
      paymentToken: 'tok_abc123',
      installments: 1,
      cardMask: 'XXXXXXXXXXXX3991',
    };
    const userWithData = {
      nome: 'João Silva',
      email: 'joao@test.com',
      reg_documento: '12345678900',
      telefone: '11999998888',
    };

    it('cobra o cartão (one-step) e marca PAID quando aprovado', async () => {
      mockPrismaService.payment.findUnique
        // 1ª chamada: generateCardCheckout carrega o payment + user
        .mockResolvedValueOnce({ ...mockPayment, user: userWithData })
        // chamadas seguintes: processWebhookPaymentReceived busca por txid
        .mockResolvedValue({
          ...mockPayment,
          txid: 'EFI-CHARGE-12345',
          subscription: null,
          investment: null,
        });
      mockEfiChargeAdapter.createOneStepCard.mockResolvedValue({
        chargeId: 12345,
        status: 'approved',
        total: 100000,
        installments: 1,
        installmentValue: 100000,
        approved: true,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
        paidAt: new Date(),
      });

      const result = await service.generateCardCheckout(1, 1, cardInput);

      expect(result.error).toBe(false);
      expect(result.data.status).toBe('PAID');
      expect(result.data.chargeId).toBe(12345);
      expect(mockEfiChargeAdapter.createOneStepCard).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentToken: 'tok_abc123',
          installments: 1,
          customer: expect.objectContaining({ email: 'joao@test.com' }),
        }),
      );
    });

    it('lança 422 (card_declined) quando a EFI recusa', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        user: userWithData,
      });
      mockEfiChargeAdapter.createOneStepCard.mockResolvedValue({
        chargeId: 999,
        status: 'unpaid',
        total: 100000,
        installments: 1,
        reason: 'Transação não autorizada por motivos de segurança.',
        approved: false,
      });

      await expect(
        service.generateCardCheckout(1, 1, cardInput),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('deve lançar 404 se pagamento não existir', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.generateCardCheckout(999, 1, cardInput),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 403 se userId não corresponder', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      await expect(
        service.generateCardCheckout(1, 999, cardInput),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 400 se pagamento não estiver PENDING', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
      });
      await expect(
        service.generateCardCheckout(1, 1, cardInput),
      ).rejects.toThrow(HttpException);
    });

    // BUG-FIX: card payments must persist method='CREDIT_CARD' so dashboards
    // and listing UI (user.payments, pending-payments-card) reflect the real
    // payment method instead of the default 'PIX' from the wizard.
    describe('BUG-FIX — method=CREDIT_CARD após liquidação no cartão', () => {
      beforeEach(() => {
        mockPrismaService.payment.findUnique
          // 1ª chamada: generateCardCheckout carrega o payment + user
          .mockResolvedValueOnce({ ...mockPayment, user: userWithData })
          // chamadas seguintes: processWebhookPaymentReceived busca por txid
          .mockResolvedValue({
            ...mockPayment,
            txid: 'EFI-CHARGE-12345',
            subscription: null,
            investment: null,
          });
        mockEfiChargeAdapter.createOneStepCard.mockResolvedValue({
          chargeId: 12345,
          status: 'approved',
          total: 100000,
          installments: 1,
          installmentValue: 100000,
          approved: true,
        });
        mockPrismaService.payment.update.mockResolvedValue({
          ...mockPayment,
          status: 'PAID',
          paidAt: new Date(),
        });
      });

      it('deve persistir method="CREDIT_CARD" no updateMany do lock de emissão', async () => {
        await service.generateCardCheckout(1, 1, cardInput);

        expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ id: 1 }),
            data: expect.objectContaining({ method: 'CREDIT_CARD' }),
          }),
        );
      });

      it('deve incluir cardStatus (result.status) no serviceDetails', async () => {
        await service.generateCardCheckout(1, 1, cardInput);

        expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              serviceDetails: expect.objectContaining({
                cardStatus: 'approved',
              }),
            }),
          }),
        );
      });

      it('deve persistir installments no serviceDetails quando installments > 1', async () => {
        await service.generateCardCheckout(1, 1, {
          ...cardInput,
          installments: 3,
        });

        expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              serviceDetails: expect.objectContaining({
                installments: 3,
              }),
            }),
          }),
        );
      });

      it('não deve regredir method para "PIX" no updateMany do processWebhookPaymentReceived', async () => {
        await service.generateCardCheckout(1, 1, cardInput);

        const methodUpdateCalls =
          mockPrismaService.payment.updateMany.mock.calls
            .map((c) => c[0])
            .filter((arg) => arg && arg.data && 'method' in arg.data);

        // Nenhum updateMany dentro do pipeline pós-aprovação pode sobrescrever
        // method para PIX após o cartão ter sido emitido.
        methodUpdateCalls.forEach((arg) => {
          expect(arg.data.method).not.toBe('PIX');
        });
        // Pelo menos 1 updateMany DEVE ter persistido CREDIT_CARD (o lock de emissão).
        expect(
          methodUpdateCalls.some((arg) => arg.data.method === 'CREDIT_CARD'),
        ).toBe(true);
      });
    });

    describe('juros no valor cobrado (fonte de verdade do backend)', () => {
      beforeEach(() => {
        mockInstallmentConfigService.getVigente.mockResolvedValue({
          id: 1,
          interestRate: 0.0299,
          maxInstallments: 18,
          minInstallmentAmount: 100,
        });
        mockPrismaService.payment.update.mockResolvedValue({
          ...mockPayment,
          status: 'PAID',
          paidAt: new Date(),
        });
      });

      function mockApprovedCard() {
        mockPrismaService.payment.findUnique
          .mockResolvedValueOnce({ ...mockPayment, user: userWithData })
          .mockResolvedValue({
            ...mockPayment,
            txid: 'EFI-CHARGE-12345',
            subscription: null,
            investment: null,
          });
        mockEfiChargeAdapter.createOneStepCard.mockResolvedValue({
          chargeId: 12345,
          status: 'approved',
          total: 100000,
          installments: 1,
          installmentValue: 100000,
          approved: true,
        });
      }

      it('cobra o principal puro (sem juros) para 1x', async () => {
        mockInstallmentCalculatorService.calculateInstallments.mockReturnValueOnce(
          {
            principal: 1000,
            installments: 1,
            interestRate: 0.0299,
            totalWithInterest: 1000,
            installmentAmount: 1000,
            totalInterest: 0,
          },
        );
        mockApprovedCard();

        await service.generateCardCheckout(1, 1, {
          ...cardInput,
          installments: 1,
        });

        // amount=1000 → 100000 centavos.
        expect(mockEfiChargeAdapter.createOneStepCard).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [expect.objectContaining({ value: 100000 })],
          }),
        );
      });

      it('cobra o total COM juros para N>1 e persiste o snapshot', async () => {
        mockInstallmentCalculatorService.calculateInstallments.mockReturnValueOnce(
          {
            principal: 1000,
            installments: 12,
            interestRate: 0.0299,
            totalWithInterest: 1424.26,
            installmentAmount: 118.69,
            totalInterest: 424.26,
          },
        );
        mockApprovedCard();

        await service.generateCardCheckout(1, 1, {
          ...cardInput,
          installments: 12,
        });

        // total com juros 1424.26 → 142426 centavos.
        expect(mockEfiChargeAdapter.createOneStepCard).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [expect.objectContaining({ value: 142426 })],
            installments: 12,
          }),
        );
        // Snapshot estruturado persistido.
        expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              serviceDetails: expect.objectContaining({
                installmentSnapshot: expect.objectContaining({
                  principal: 1000,
                  installments: 12,
                  totalWithInterest: 1424.26,
                  totalInterest: 424.26,
                }),
              }),
            }),
          }),
        );
      });

      it('lança 422 amount_below_minimum quando a parcela fica abaixo do mínimo', async () => {
        mockPrismaService.payment.findUnique
          .mockResolvedValueOnce({ ...mockPayment, user: userWithData })
          .mockResolvedValue({ ...mockPayment, user: userWithData });
        mockInstallmentCalculatorService.calculateInstallments.mockReturnValueOnce(
          {
            principal: 1000,
            installments: 18,
            interestRate: 0.0299,
            totalWithInterest: 1700,
            installmentAmount: 94.44, // < 100
            totalInterest: 700,
          },
        );

        await expect(
          service.generateCardCheckout(1, 1, {
            ...cardInput,
            installments: 18,
          }),
        ).rejects.toThrow(UnprocessableEntityException);
        // Não deve ter chamado a EFI.
        expect(mockEfiChargeAdapter.createOneStepCard).not.toHaveBeenCalled();
      });
    });
  });

  describe('approveManually', () => {
    it('deve exigir justificativa com ao menos 10 caracteres', async () => {
      await expect(
        service.approveManually(1, 1, 'curto', 'comprovante-key'),
      ).rejects.toThrow(HttpException);
    });

    it('deve exigir comprovante', async () => {
      await expect(
        service.approveManually(
          1,
          1,
          'justificativa valida com mais de dez caracteres',
          '',
        ),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 404 se pagamento não existir', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.approveManually(
          999,
          1,
          'justificativa valida com mais de dez caracteres',
          'comprovante-key',
        ),
      ).rejects.toThrow(HttpException);
    });

    it('deve ser idempotente quando pagamento já está PAID', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
      });
      const result = await service.approveManually(
        1,
        1,
        'justificativa valida com mais de dez caracteres',
        'comprovante-key',
      );
      expect(result.error).toBe(false);
      expect(result.message).toContain('PAID');
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('deve lançar 400 se pagamento não estiver PENDING', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'CANCELED',
      });
      await expect(
        service.approveManually(
          1,
          1,
          'justificativa valida com mais de dez caracteres',
          'comprovante-key',
        ),
      ).rejects.toThrow(HttpException);
    });

    it('deve aprovar manualmente, atualizar payment e disparar webhook pipeline', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update
        .mockResolvedValueOnce({ ...mockPayment, txid: 'MANUAL-1-123' })
        .mockResolvedValueOnce({ ...mockPayment, status: 'PAID' });

      const result = await service.approveManually(
        1,
        1,
        'justificativa valida com mais de dez caracteres',
        'comprovante-key',
      );

      expect(result.error).toBe(false);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_APPROVE_MANUAL',
          entity: 'Payment',
          entityId: 1,
        }),
      );
    });
  });

  describe('cancelByAdmin', () => {
    it('deve exigir justificativa com ao menos 10 caracteres', async () => {
      await expect(service.cancelByAdmin(1, 1, 'curto')).rejects.toThrow(
        HttpException,
      );
    });

    it('deve lançar 404 se pagamento não existir', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.cancelByAdmin(999, 1, 'justificativa valida com mais de dez'),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 400 se pagamento já está REFUNDED', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'REFUNDED',
      });
      await expect(
        service.cancelByAdmin(1, 1, 'justificativa valida com mais de dez'),
      ).rejects.toThrow(HttpException);
    });

    it('deve ser idempotente quando pagamento já está CANCELED', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'CANCELED',
      });
      const result = await service.cancelByAdmin(
        1,
        1,
        'justificativa valida com mais de dez',
      );
      expect(result.error).toBe(false);
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
    });

    it('deve cancelar pagamento PENDING e gravar audit log', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'CANCELED',
      });

      const result = await service.cancelByAdmin(
        1,
        1,
        'justificativa valida com mais de dez',
      );

      expect(result.error).toBe(false);
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'CANCELED' }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_CANCEL',
          entityId: 1,
        }),
      );
    });
  });

  describe('simulatePaid', () => {
    it('deve lançar 403 se NODE_ENV=production', async () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await expect(service.simulatePaid(1, 1)).rejects.toThrow(HttpException);
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it('deve lançar 404 se pagamento não existir', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);
      await expect(service.simulatePaid(999, 1)).rejects.toThrow(HttpException);
    });

    it('deve lançar 403 se userId não corresponder', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      await expect(service.simulatePaid(1, 999)).rejects.toThrow(HttpException);
    });

    it('deve ser idempotente quando pagamento já está PAID', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
      });
      const result = await service.simulatePaid(1, 1);
      expect(result.error).toBe(false);
      expect(result.message).toContain('PAID');
    });

    it('deve lançar 400 se pagamento não estiver PENDING', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'CANCELED',
      });
      await expect(service.simulatePaid(1, 1)).rejects.toThrow(HttpException);
    });

    it('deve simular PAID gerando txid synth quando payment não tem txid', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      // S18.6 — processWebhookPaymentReceived agora usa findMany, não findUnique.
      mockPrismaService.payment.findMany.mockResolvedValue([
        mockPayment,
      ] as any);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
      });

      const result = await service.simulatePaid(1, 1);

      expect(result.error).toBe(false);
      const updateCalls = mockPrismaService.payment.update.mock.calls;
      const synthCall = updateCalls.find((c) =>
        String(c[0]?.data?.txid ?? '').startsWith('DEV-SIM-'),
      );
      expect(synthCall).toBeDefined();
    });
  });

  describe('createCheckout', () => {
    beforeEach(() => {
      // S18.7 — re-estabelece o mock default de $transaction com
      // payment/paymentOrder/paymentItem (helper _createOrderWithItems).
      mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
        cb({
          payment: mockPrismaService.payment,
          paymentOrder: mockPrismaService.paymentOrder,
          paymentItem: mockPrismaService.paymentItem,
        }),
      );
    });

    it('cria Payment PENDING com PIX e retorna shape correto', async () => {
      const createdPayment = {
        id: 10,
        userId: 1,
        amount: 100,
        method: 'PIX',
        purpose: 'INVESTMENT',
        status: 'PENDING',
        txid: null,
        qrCodeBase64: null,
        copyPastePix: null,
        paidAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.payment.create.mockResolvedValue(createdPayment);
      mockPrismaService.investment.findFirst.mockResolvedValue({
        id: 5,
        campaignId: 8,
      });
      // Split persistido: subtotal 100 + taxa 5 → total cobrado 105
      mockPrismaService.investment.findUnique.mockResolvedValue({
        tokenSubtotal: 100,
        platformFeeAmount: 5,
        amount: 100,
      });
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...createdPayment,
        user: {
          nome: 'João Silva',
          email: 'joao@test.com',
          reg_documento: '12345678900',
          cidade: 'São Paulo',
          uf: 'SP',
        },
      });
      mockEfiPixAdapter.createPix.mockResolvedValue({
        txid: 'ISelfABCD1234',
        location: 'https://pix-h.api.efipay.com.br/qr/xyz',
        pixCopiaECola: '00020126580014br.gov.bcb.pixtel...',
        qrCodeImage: 'data:image/png;base64,iVBORw0KGgo=',
        calendario: { expiracao: 1800 },
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...createdPayment,
        txid: 'ISelfABCD1234',
        qrCodeBase64: 'data:image/png;base64,iVBORw0KGgo=',
        copyPastePix: '00020126580014br.gov.bcb.pixtel...',
      });

      const dto: CreateCheckoutDto = {
        amount: 100,
        purpose: PaymentPurposeDto.INVESTMENT,
        method: 'PIX' as any,
        investmentId: 5,
      };

      const result = await service.createCheckout(dto, 1, 'USER');

      expect(result.paymentId).toBe(10);
      expect(result.method).toBe('PIX');
      expect(result.qrCodeBase64).toBe('data:image/png;base64,iVBORw0KGgo=');
      expect(result.copyPastePix).toBe('00020126580014br.gov.bcb.pixtel...');
      expect(result.txid).toBe('ISelfABCD1234');
    });

    it('rejeita createCheckout com investimento de outro usuário', async () => {
      mockPrismaService.investment.findFirst.mockResolvedValue(null);

      const dto: CreateCheckoutDto = {
        amount: 100,
        purpose: PaymentPurposeDto.INVESTMENT,
        method: 'PIX' as any,
        investmentId: 5,
      };

      await expect(
        service.createCheckout(dto, 1, 'USER'),
      ).rejects.toMatchObject({
        response: { message: 'REFERENCIA_PAGAMENTO_INVALIDA' },
      });
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });

    it('aceita reserva de campanha pertencente ao founder autenticado', async () => {
      mockPrismaService.campaign.findFirst.mockResolvedValue({ id: 8 });
      const created = {
        id: 11,
        userId: 1,
        amount: 100,
        method: 'PIX',
        purpose: 'TOKEN_RESERVATION',
        status: 'PENDING',
      };
      mockPrismaService.payment.create
        .mockImplementationOnce((args: any) =>
          Promise.resolve({ id: 11, ...args.data }),
        )
        .mockImplementationOnce((args: any) =>
          Promise.resolve({ id: 11, ...args.data }),
        )
        .mockResolvedValueOnce(created);

      const result = await service.create(
        {
          amount: 100,
          method: PaymentMethodDto.PIX,
          purpose: PaymentPurposeDto.TOKEN_RESERVATION,
          campaignId: 8,
        },
        1,
      );

      expect(result.error).toBe(false);
      expect(mockPrismaService.campaign.findFirst).toHaveBeenCalledWith({
        where: { id: 8, startup: { founderId: 1 } },
        select: { id: true },
      });
    });

    it('aceita campanha de outro founder quando ela coincide com o investimento do usuário', async () => {
      mockPrismaService.investment.findFirst.mockResolvedValue({
        id: 5,
        campaignId: 8,
      });
      const created = {
        ...mockPayment,
        id: 12,
      };
      mockPrismaService.payment.create
        .mockImplementationOnce((args: any) =>
          Promise.resolve({ id: 12, ...args.data }),
        )
        .mockImplementationOnce((args: any) =>
          Promise.resolve({ id: 12, ...args.data }),
        )
        .mockResolvedValueOnce(created);

      const result = await service.create(
        {
          amount: 500,
          method: PaymentMethodDto.PIX,
          purpose: PaymentPurposeDto.INVESTMENT,
          investmentId: 5,
          campaignId: 8,
        },
        1,
      );

      expect(result.error).toBe(false);
      expect(mockPrismaService.campaign.findFirst).not.toHaveBeenCalled();
    });

    it('rejeita IDs extras para propósitos sem relacionamento', async () => {
      await expect(
        service.create(
          {
            amount: 100,
            method: PaymentMethodDto.PIX,
            purpose: PaymentPurposeDto.EARLY_ACCESS,
            campaignId: 8,
          },
          1,
        ),
      ).rejects.toMatchObject({
        response: { code: 'invalid_purpose_combination' },
      });
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });

    it('throws 403 quando USER tenta VERIFICATION_SEAL', async () => {
      const dto: CreateCheckoutDto = {
        amount: 50,
        purpose: PaymentPurposeDto.VERIFICATION_SEAL,
        method: 'PIX' as any,
      };

      await expect(service.createCheckout(dto, 1, 'USER')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws 422 quando SUBSCRIPTION sem subscriptionId', async () => {
      const dto: CreateCheckoutDto = {
        amount: 100,
        purpose: PaymentPurposeDto.SUBSCRIPTION,
        method: 'PIX' as any,
        // falta subscriptionId
      };

      await expect(service.createCheckout(dto, 1, 'USER')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws 422 quando installments > 18', async () => {
      const dto: CreateCheckoutDto = {
        amount: 1000,
        purpose: PaymentPurposeDto.INVESTMENT,
        method: 'CREDIT_CARD' as any,
        installments: 24,
        investmentId: 5,
      };

      await expect(service.createCheckout(dto, 1, 'USER')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws 400 quando installments informado em PIX', async () => {
      const dto: CreateCheckoutDto = {
        amount: 100,
        purpose: PaymentPurposeDto.INVESTMENT,
        method: 'PIX' as any,
        installments: 3, // não faz sentido em PIX
        investmentId: 5,
      };

      await expect(service.createCheckout(dto, 1, 'USER')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generatePix — EFI mode', () => {
    const mockPaymentWithUser = {
      id: 1,
      userId: 1,
      amount: 1000,
      method: 'PIX',
      purpose: 'INVESTMENT',
      status: 'PENDING',
      txid: null,
      qrCodeBase64: null,
      copyPastePix: null,
      paidAt: null,
      createdAt: new Date(),
      user: {
        nome: 'João Silva',
        email: 'joao@test.com',
        reg_documento: '12345678900',
        cidade: 'São Paulo',
        uf: 'SP',
      },
    };

    beforeEach(() => {});

    afterEach(() => {});

    it('usa EfiPixAdapter quando EFI_ENABLED=true', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(
        mockPaymentWithUser,
      );
      mockEfiPixAdapter.createPix.mockResolvedValue({
        txid: 'EFI123456789012345678901234',
        status: 'ATIVA',
        calendario: {
          criacao: new Date().toISOString(),
          expiracao: 3600,
        },
        valor: { original: '1000.00' },
        chave: 'pix-key',
        location: 'https://pix-h.api.efipay.com.br/qr/123',
        pixCopiaECola: '00020126580014br.gov.bcb.pix...',
        qrCodeImage: 'data:image/png;base64,iVBORw0KGgo=',
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPaymentWithUser,
        txid: 'EFI123456789012345678901234',
        qrCodeBase64: 'data:image/png;base64,iVBORw0KGgo=',
        copyPastePix: '00020126580014br.gov.bcb.pix...',
      });

      const result = await service.generatePix(1, 1);

      expect(mockEfiPixAdapter.createPix).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '1000.00',
          payerName: 'João Silva',
          payerCpf: '12345678900',
        }),
      );
      expect(result.error).toBe(false);
      expect(result.data.txid).toBe('EFI123456789012345678901234');
    });

    it('throws 404 quando payment não existe', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.generatePix(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 403 quando payment não é do user', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(
        mockPaymentWithUser,
      );

      await expect(service.generatePix(1, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws 422 quando payment não está PENDING', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPaymentWithUser,
        status: 'PAID',
      });

      await expect(service.generatePix(1, 1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('createStartupCheckout — limites de equity', () => {
    const basePayload = {
      razaoSocial: 'Startup Teste LTDA',
      nomeFantasia: 'Startup Teste',
      cnpj: '12345678000195',
      dataAbertura: '01/01/2020',
      paisIso3: 'BRA',
      estagio: 'mvp',
      descricao: 'Descrição da startup teste',
      titular: 'Titular Teste',
      banco: 'Banco Teste',
      agencia: '1234',
      conta: '12345',
      digito: '1',
      categoryId: 1,
      areaAtuacaoId: 1,
      metaCaptacao: 100000,
      equityOferecido: 10,
    };

    it('rejeita equity acima do limite vigente do Admin', async () => {
      await expect(
        service.createStartupCheckout(
          {
            amount: 500,
            method: 'PIX' as any,
            payload: {
              ...basePayload,
              equityOferecido: 50,
              metaCaptacao: 100000,
            },
          } as any,
          1,
        ),
      ).rejects.toThrow('Equity deve estar entre 5% e 49%.');
    });

    it('rejeita equity abaixo do limite vigente do Admin', async () => {
      await expect(
        service.createStartupCheckout(
          {
            amount: 500,
            method: 'PIX' as any,
            payload: {
              ...basePayload,
              equityOferecido: 4,
              metaCaptacao: 100000,
            },
          } as any,
          1,
        ),
      ).rejects.toThrow('Equity deve estar entre 5% e 49%.');
    });

    it('rejeita metaCaptacao ausente ou NaN', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { metaCaptacao: _omit, ...payloadWithoutMeta } = basePayload;
      await expect(
        service.createStartupCheckout(
          {
            amount: 500,
            method: 'PIX' as any,
            payload: { ...payloadWithoutMeta, equityOferecido: 10 },
          } as any,
          1,
        ),
      ).rejects.toThrow('Meta de captação inválida.');
    });

    it('rejeita metaCaptacao <= 0', async () => {
      await expect(
        service.createStartupCheckout(
          {
            amount: 500,
            method: 'PIX' as any,
            payload: { ...basePayload, equityOferecido: 10, metaCaptacao: 0 },
          } as any,
          1,
        ),
      ).rejects.toThrow('Meta de captação inválida.');
    });

    it('rejeita metaCaptacao abaixo do mínimo configurado', async () => {
      await expect(
        service.createStartupCheckout(
          {
            amount: 500,
            method: 'PIX' as any,
            payload: {
              ...basePayload,
              equityOferecido: 10,
              metaCaptacao: 100, // abaixo do minCampaign default 10.000
            },
          } as any,
          1,
        ),
      ).rejects.toThrow(/Meta de captação deve ser no mínimo R\$/);
    });
  });

  describe('createStartupCheckout — taxonomia multi-área (CASE.md §[Taxonomia])', () => {
    const basePayload = {
      razaoSocial: 'Startup Teste LTDA',
      nomeFantasia: 'Startup Teste',
      cnpj: '12345678000195',
      dataAbertura: '01/01/2020',
      paisIso3: 'BRA',
      estagio: 'mvp',
      descricao: 'Descrição da startup teste',
      titular: 'Titular Teste',
      banco: 'Banco Teste',
      agencia: '1234',
      conta: '12345',
      digito: '1',
      metaCaptacao: 100000,
      equityOferecido: 10,
    };

    function buildTxMock() {
      return {
        payment: {
          create: jest
            .fn()
            .mockImplementation((args: any) =>
              Promise.resolve({ id: 200, ...args.data }),
            ),
        },
        paymentOrder: {
          create: jest.fn().mockResolvedValue({ id: 300 }),
        },
        paymentItem: {
          create: jest.fn().mockResolvedValue({ id: 301 }),
        },
        startupDraft: {
          create: jest.fn().mockResolvedValue({ id: 7 }),
        },
      } as any;
    }

    it('aceita payload com areaAtuacaoIds (plural, contrato vigente CASE.md §[Taxonomia])', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
        cb(buildTxMock()),
      );

      const result = await service.createStartupCheckout(
        {
          amount: 500,
          method: 'PIX' as any,
          payload: {
            ...basePayload,
            categoryId: 1,
            areaAtuacaoIds: [10, 11], // contrato novo: array de IDs
          },
        } as any,
        1,
      );

      expect(result.error).toBe(false);
      expect(result.data.paymentId).toBe(200);
    });

    it('mantém compatibilidade com areaAtuacaoId (singular, legado)', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
        cb(buildTxMock()),
      );

      const result = await service.createStartupCheckout(
        {
          amount: 500,
          method: 'PIX' as any,
          payload: {
            ...basePayload,
            categoryId: 1,
            areaAtuacaoId: 10, // legado: número único
          },
        } as any,
        1,
      );

      expect(result.error).toBe(false);
    });

    it('rejeita payload com categoryId mas sem nenhuma área (array vazio e sem singular)', async () => {
      await expect(
        service.createStartupCheckout(
          {
            amount: 500,
            method: 'PIX' as any,
            payload: { ...basePayload, categoryId: 1, areaAtuacaoIds: [] },
          } as any,
          1,
        ),
      ).rejects.toThrow(/Categoria e área de atuação são obrigatórias/);
    });
  });

  describe('createStartupCheckout — Fast Track Review (S18.6)', () => {
    const basePayload = {
      razaoSocial: 'Startup Teste LTDA',
      nomeFantasia: 'Startup Teste',
      cnpj: '12345678000195',
      dataAbertura: '01/01/2020',
      paisIso3: 'BRA',
      estagio: 'mvp',
      descricao: 'Descrição da startup teste',
      titular: 'Titular Teste',
      banco: 'Banco Teste',
      agencia: '1234',
      conta: '12345',
      digito: '1',
      categoryId: 1,
      areaAtuacaoId: 1,
      metaCaptacao: 100000,
      equityOferecido: 10,
    };

    it('sem wantsFastTrackReview=true: cria 1 Payment (TOKEN_RESERVATION) e nenhum fastTrackPaymentId', async () => {
      const txMock: any = {
        payment: {
          create: jest
            .fn()
            .mockImplementationOnce((args: any) =>
              Promise.resolve({ id: 200, ...args.data }),
            ),
        },
        paymentOrder: {
          create: jest.fn().mockResolvedValue({ id: 300 }),
        },
        paymentItem: {
          create: jest.fn().mockResolvedValue({ id: 301 }),
        },
        startupDraft: {
          create: jest.fn().mockResolvedValue({ id: 7 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
        cb(txMock),
      );

      const result = await service.createStartupCheckout(
        {
          amount: 500, // só a reserva
          method: 'PIX' as any,
          payload: { ...basePayload } as any, // sem wantsFastTrackReview
        } as any,
        1,
      );

      expect(result.error).toBe(false);
      expect(result.data.fastTrackPaymentId).toBeNull();
      // S18.7 — PaymentOrder + 1 PaymentItem + 1 Payment legado
      expect(txMock.paymentOrder.create).toHaveBeenCalledTimes(1);
      expect(txMock.paymentItem.create).toHaveBeenCalledTimes(1);
      expect(txMock.payment.create).toHaveBeenCalledTimes(1);
      // Payment principal: TOKEN_RESERVATION, amount=500
      expect(txMock.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purpose: 'TOKEN_RESERVATION',
            amount: 500,
            originalAmount: 500,
            discountAmount: 0,
            paidAmount: 500,
          }),
        }),
      );
    });

    it('com wantsFastTrackReview=true: cria 2 Payments (TOKEN_RESERVATION + FAST_TRACK_REVIEW)', async () => {
      const txMock: any = {
        payment: {
          create: jest
            .fn()
            .mockImplementationOnce((args: any) =>
              Promise.resolve({ id: 200, ...args.data }),
            )
            .mockImplementationOnce((args: any) =>
              Promise.resolve({ id: 201, ...args.data }),
            ),
        },
        paymentOrder: {
          create: jest.fn().mockResolvedValue({ id: 300 }),
        },
        paymentItem: {
          create: jest.fn().mockResolvedValue({ id: 301 }),
        },
        startupDraft: {
          create: jest.fn().mockResolvedValue({ id: 7 }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
        cb(txMock),
      );

      const result = await service.createStartupCheckout(
        {
          amount: 3000, // 500 reserva + 2500 fast track
          method: 'PIX' as any,
          payload: { ...basePayload, wantsFastTrackReview: true } as any,
        } as any,
        1,
      );

      expect(result.error).toBe(false);
      expect(result.data.fastTrackPaymentId).toBe(201);
      // S18.7 — PaymentOrder + 2 PaymentItems + 2 Payment legados
      expect(txMock.paymentOrder.create).toHaveBeenCalledTimes(1);
      expect(txMock.paymentItem.create).toHaveBeenCalledTimes(2);
      // 2 Payments legados criados
      expect(txMock.payment.create).toHaveBeenCalledTimes(2);
      // 1º Payment: TOKEN_RESERVATION, amount=500
      expect(txMock.payment.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            purpose: 'TOKEN_RESERVATION',
            amount: 500,
            originalAmount: 500,
            paidAmount: 500,
          }),
        }),
      );
      // 2º Payment: FAST_TRACK_REVIEW, amount=2500, com paymentGroupId
      expect(txMock.payment.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            purpose: 'FAST_TRACK_REVIEW',
            amount: 2500,
            originalAmount: 2500,
            paidAmount: 2500,
            paymentGroupId: 200, // aponta para a âncora
          }),
        }),
      );
      // StartupDraft (criado FORA da transaction, no nível prisma) aponta
      // para o Payment principal + Order.
      expect(mockPrismaService.startupDraft.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId: 200, // primary Payment
            paymentOrder: { connect: { id: 300 } },
          }),
        }),
      );
    });

    it('valor total inconsistente: rejeita com 400', async () => {
      await expect(
        service.createStartupCheckout(
          {
            amount: 999, // não bate com reserva + fastTrack
            method: 'PIX' as any,
            payload: { ...basePayload, wantsFastTrackReview: true } as any,
          } as any,
          1,
        ),
      ).rejects.toThrow(/Valor total inconsistente/);
    });
  });

  describe('regenerateStartupCheckout (Gerar Novo Pagamento)', () => {
    const expiredPayment = {
      id: 100,
      userId: 1,
      amount: 500,
      method: 'PIX',
      purpose: 'TOKEN_RESERVATION',
      status: 'EXPIRED',
      startupDraft: {
        id: 9,
        founderId: 1,
        payload: { cnpj: '12345678000195', nomeFantasia: 'Startup' },
      },
    };

    it('recria Payment PENDING + novo draft a partir de um EXPIRED', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        expiredPayment,
      );
      mockPrismaService.payment.findFirst.mockResolvedValueOnce(null); // sem pending
      mockPrismaService.$transaction.mockImplementationOnce(async () => ({
        id: 200,
        amount: 500,
        method: 'PIX',
        purpose: 'TOKEN_RESERVATION',
        status: 'PENDING',
        startupDraft: { id: 10 },
      }));

      const result = await service.regenerateStartupCheckout(100, 1);

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(201);
      expect(result.data.paymentId).toBe(200);
      expect(result.data.reused).toBe(false);
    });

    it('idempotente: retorna o PENDING existente sem criar outro', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(
        expiredPayment,
      );
      mockPrismaService.payment.findFirst.mockResolvedValueOnce({
        id: 150,
        amount: 500,
        method: 'PIX',
        status: 'PENDING',
      });
      const txSpy = mockPrismaService.$transaction;
      const callsBefore = txSpy.mock.calls.length;

      const result = await service.regenerateStartupCheckout(100, 1);

      expect(result.data.reused).toBe(true);
      expect(result.data.paymentId).toBe(150);
      expect(txSpy.mock.calls.length).toBe(callsBefore); // não abriu transação
    });

    it('rejeita quando não é o dono (403)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        ...expiredPayment,
        userId: 999,
      });
      const result = await service.regenerateStartupCheckout(100, 1);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(403);
    });

    it('rejeita quando a cobrança ainda está ativa (409)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        ...expiredPayment,
        status: 'PENDING',
      });
      const result = await service.regenerateStartupCheckout(100, 1);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(409);
    });

    it('rejeita quando não há rascunho preservado (422)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        ...expiredPayment,
        startupDraft: null,
      });
      const result = await service.regenerateStartupCheckout(100, 1);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(422);
    });

    it('404 quando o pagamento não existe', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(null);
      const result = await service.regenerateStartupCheckout(100, 1);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });
  });

  describe('processTokenReservationPayment — Campaign DRAFT automática', () => {
    const draftPayload = {
      nomeFantasia: 'Startup Teste',
      razaoSocial: 'Startup Teste LTDA',
      cnpj: '12345678000195',
      dataAbertura: '2020',
      paisIso3: 'BRA',
      estagio: 'mvp',
      descricao: 'desc',
      titular: 'Titular',
      banco: 'Banco',
      agencia: '1234',
      conta: '12345',
      digito: '1',
      metaCaptacao: 100000, // R$ 100k
      equityOferecido: 10, // 10%
      categoryId: 1,
      areaAtuacaoId: 1,
    };

    it('cria Campaign DRAFT com reservationFeePaid=true junto com a Startup', async () => {
      // payment PAID sem campaignId (caminho novo — StartupDraft)
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });
      // 2a chamada: lookup do payment dentro de processTokenReservationPayment
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        purpose: 'TOKEN_RESERVATION',
        campaignId: null,
      });
      mockPrismaService.startupDraft.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: 1,
        status: 'PENDING_PAYMENT',
        payload: draftPayload,
      });
      mockPrismaService.startupDraft.update.mockResolvedValue({});
      mockPrismaService.upload.findFirst.mockResolvedValue(null);
      // 3a chamada (final): marca effectsAppliedAt
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });

      // Captura o callback do $transaction para inspecionar args.
      const captured: {
        campaignArgs?: any;
        startupArgs?: any;
        paymentUpdateManyCalls?: any[];
      } = {};
      mockPrismaService.$transaction.mockImplementationOnce(async (cb: any) => {
        const txMock = {
          kYCProfile: { create: jest.fn().mockResolvedValue({ id: 1 }) },
          startup: {
            create: jest.fn().mockImplementation((args: any) => {
              captured.startupArgs = args;
              return Promise.resolve({ id: 24, ...draftPayload });
            }),
          },
          startupDraft: { update: jest.fn().mockResolvedValue({}) },
          campaign: {
            create: jest.fn().mockImplementation((args: any) => {
              captured.campaignArgs = args;
              return Promise.resolve({ id: 99 });
            }),
          },
          payment: {
            updateMany: jest.fn().mockImplementation((args: any) => {
              captured.paymentUpdateManyCalls =
                captured.paymentUpdateManyCalls ?? [];
              captured.paymentUpdateManyCalls.push(args);
              return Promise.resolve({ count: 1 });
            }),
          },
          startupDocument: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await service.processPaymentEffects(100);

      expect(captured.startupArgs).toBeDefined();
      expect(captured.startupArgs.data.slug).toBe('startup-teste');
      expect(captured.startupArgs.data.conta).toBe('12345');
      expect(captured.startupArgs.data.digito).toBe('1');
      expect(captured.startupArgs.data.documento_titular).toBeNull();
      expect(captured.startupArgs.data.pix_key).toBeNull();
      expect(captured.campaignArgs).toBeDefined();
      expect(captured.campaignArgs.data.startupId).toBe(24);
      expect(captured.campaignArgs.data.targetAmount).toBe(100000);
      expect(captured.campaignArgs.data.totalTokens).toBe(500); // ceil(100000/200)
      expect(captured.campaignArgs.data.valuation).toBe(1000000); // 100k * 100/10
      expect(captured.campaignArgs.data.reservationFeePaid).toBe(true);
      expect(captured.campaignArgs.data.status).toBe('DRAFT');
      expect(captured.campaignArgs.data.tokensSold).toBe(0);
      // Snapshots financeiros (ADR-008 Modelo B — split venda/base)
      expect(captured.campaignArgs.data.tokenBaseValue).toBe(200);
      expect(captured.campaignArgs.data.tokenSellPrice).toBe(240);
      expect(captured.campaignArgs.data.adminFeeValue).toBe(5000); // 100k * 0.05
      expect(captured.campaignArgs.data.tokenMintingCost).toBe(500); // 500 * 1
      // S18.6 — vincula os Payments do checkout consolidado à Campaign recém-criada
      // para que a tela /founder/startups/:id/captacao exiba os Payments via
      // include Campaign.payments.
      expect(captured.paymentUpdateManyCalls).toBeDefined();
      const linkCall = captured.paymentUpdateManyCalls!.find(
        (c: any) => c.data?.campaignId === 99,
      );
      expect(linkCall).toBeDefined();
      expect(linkCall.where.id.in).toEqual([100]); // só primary (sem Fast Track no draft mockado)
      // effectsAppliedAt gravado
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { effectsAppliedAt: expect.any(Date) },
      });
    });

    it('persiste lista completa em areas_atuacao quando payload traz areaAtuacaoIds (multi-área)', async () => {
      const multiAreaPayload = {
        ...draftPayload,
        categoryId: 1,
        areaAtuacaoIds: [10, 11, 12], // contrato vigente (CASE.md §[Taxonomia])
      };

      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 101,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 101,
        purpose: 'TOKEN_RESERVATION',
        campaignId: null,
      });
      mockPrismaService.startupDraft.findUnique.mockResolvedValueOnce({
        id: 2,
        founderId: 1,
        status: 'PENDING_PAYMENT',
        payload: multiAreaPayload,
      });
      mockPrismaService.startupDraft.update.mockResolvedValue({});
      mockPrismaService.upload.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 101,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });

      const captured: { startupArgs?: any } = {};
      mockPrismaService.$transaction.mockImplementationOnce(async (cb: any) => {
        const txMock = {
          kYCProfile: { create: jest.fn().mockResolvedValue({ id: 1 }) },
          startup: {
            create: jest.fn().mockImplementation((args: any) => {
              captured.startupArgs = args;
              return Promise.resolve({ id: 25 });
            }),
          },
          startupDraft: { update: jest.fn().mockResolvedValue({}) },
          campaign: {
            create: jest.fn().mockResolvedValue({ id: 100 }),
          },
          payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          startupDocument: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await service.processPaymentEffects(101);

      expect(captured.startupArgs).toBeDefined();
      // Multi-área: persiste a lista completa na coluna JSON
      expect(captured.startupArgs.data.areas_atuacao).toEqual([10, 11, 12]);
      // E mantém a primeira área na coluna legacy para retrocompat
      expect(captured.startupArgs.data.areaAtuacaoId).toBe(10);
      expect(captured.startupArgs.data.categoryId).toBe(1);
    });

    it('faz fallback para areaAtuacaoId (singular legado) preservando compatibilidade', async () => {
      const legacyPayload = {
        ...draftPayload,
        categoryId: 1,
        areaAtuacaoId: 7, // legado: número único, sem array
      };

      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 102,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 102,
        purpose: 'TOKEN_RESERVATION',
        campaignId: null,
      });
      mockPrismaService.startupDraft.findUnique.mockResolvedValueOnce({
        id: 3,
        founderId: 1,
        status: 'PENDING_PAYMENT',
        payload: legacyPayload,
      });
      mockPrismaService.startupDraft.update.mockResolvedValue({});
      mockPrismaService.upload.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 102,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });

      const captured: { startupArgs?: any } = {};
      mockPrismaService.$transaction.mockImplementationOnce(async (cb: any) => {
        const txMock = {
          kYCProfile: { create: jest.fn().mockResolvedValue({ id: 1 }) },
          startup: {
            create: jest.fn().mockImplementation((args: any) => {
              captured.startupArgs = args;
              return Promise.resolve({ id: 26 });
            }),
          },
          startupDraft: { update: jest.fn().mockResolvedValue({}) },
          campaign: {
            create: jest.fn().mockResolvedValue({ id: 101 }),
          },
          payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          startupDocument: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await service.processPaymentEffects(102);

      expect(captured.startupArgs).toBeDefined();
      // Legado: areas_atuacao vira [areaAtuacaoId] para futura leitura multi-área
      expect(captured.startupArgs.data.areas_atuacao).toEqual([7]);
      expect(captured.startupArgs.data.areaAtuacaoId).toBe(7);
    });

    it('caminho legado: payment já tem campaignId (apenas marca reservationFeePaid)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 200,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 200,
        purpose: 'TOKEN_RESERVATION',
        campaignId: 50, // legado
      });
      mockPrismaService.campaign.update.mockResolvedValueOnce({});
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 200,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });

      await service.processPaymentEffects(200);

      expect(mockPrismaService.campaign.update).toHaveBeenCalledWith({
        where: { id: 50 },
        data: { reservationFeePaid: true, status: 'OPEN' },
      });
      expect(mockPrismaService.campaign.create).not.toHaveBeenCalled();
    });

    it('rollback: falha na $transaction marca StartupDraft como FAILED (sem órfãos)', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        purpose: 'TOKEN_RESERVATION',
        campaignId: null,
      });
      mockPrismaService.startupDraft.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: 1,
        status: 'PENDING_PAYMENT',
        payload: draftPayload,
      });
      mockPrismaService.startupDraft.update.mockResolvedValue({});
      mockPrismaService.upload.findFirst.mockResolvedValue(null);

      // $transaction propaga o erro (Prisma faz rollback de
      // kYCProfile + startup + campaign + startupDocument atomicamente).
      mockPrismaService.$transaction.mockImplementationOnce(async () => {
        throw new Error('Campaign DRAFT creation failed');
      });

      // O método tem try/catch interno que marca o draft como FAILED —
      // comportamento documentado em processTokenReservationPayment
      // (linha ~2438 do payment.service.ts). A garantia de não-duplicação
      // vem do PENDING_PAYMENT → PROCESSING em tx, mas como o erro
      // acontece DEPOIS do PROCESSING, o FAILED é setado.
      await service.processPaymentEffects(100);

      // draft marcado como FAILED (não fica preso em PENDING_PAYMENT)
      const draftUpdates = mockPrismaService.startupDraft.update.mock.calls;
      expect(
        draftUpdates.some(
          (c) => c[0]?.data?.status === 'FAILED' && c[0]?.where?.id === 1,
        ),
      ).toBe(true);
    });

    it('S18.6 — marca Startup.fastTrackReview=true quando draft tem fastTrackPaymentId', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        purpose: 'TOKEN_RESERVATION',
        campaignId: null,
      });
      // S18.6 — draft com fastTrackPaymentId (founder contratou Fast Track)
      mockPrismaService.startupDraft.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: 1,
        status: 'PENDING_PAYMENT',
        payload: draftPayload,
        fastTrackPaymentId: 200, // Fast Track contratado
      });
      mockPrismaService.startupDraft.update.mockResolvedValue({});
      mockPrismaService.upload.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });

      // Captura args do tx.startup.create + tx.payment.updateMany (S18.6)
      const captured: {
        startupArgs?: any;
        paymentUpdateManyCalls?: any[];
      } = {};
      mockPrismaService.$transaction.mockImplementationOnce(async (cb: any) => {
        const txMock = {
          kYCProfile: { create: jest.fn().mockResolvedValue({ id: 1 }) },
          startup: {
            create: jest.fn().mockImplementation((args: any) => {
              captured.startupArgs = args;
              return Promise.resolve({ id: 24, ...draftPayload });
            }),
          },
          startupDraft: { update: jest.fn().mockResolvedValue({}) },
          campaign: { create: jest.fn().mockResolvedValue({ id: 99 }) },
          payment: {
            updateMany: jest.fn().mockImplementation((args: any) => {
              captured.paymentUpdateManyCalls =
                captured.paymentUpdateManyCalls ?? [];
              captured.paymentUpdateManyCalls.push(args);
              return Promise.resolve({ count: 2 });
            }),
          },
          startupDocument: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await service.processPaymentEffects(100);

      expect(captured.startupArgs).toBeDefined();
      expect(captured.startupArgs.data.fastTrackReview).toBe(true);
      expect(captured.startupArgs.data.fastTrackReviewedAt).toBeInstanceOf(
        Date,
      );
      // S18.6 — vincula AMBOS os Payments (primary + Fast Track) à Campaign.
      const linkCall = captured.paymentUpdateManyCalls!.find(
        (c: any) => c.data?.campaignId === 99,
      );
      expect(linkCall).toBeDefined();
      expect(linkCall.where.id.in.sort()).toEqual([100, 200]);
    });

    it('S18.6 — Startup.fastTrackReview=false quando draft NÃO tem fastTrackPaymentId', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        purpose: 'TOKEN_RESERVATION',
        campaignId: null,
      });
      mockPrismaService.startupDraft.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: 1,
        status: 'PENDING_PAYMENT',
        payload: draftPayload,
        fastTrackPaymentId: null, // NÃO contratou Fast Track
      });
      mockPrismaService.startupDraft.update.mockResolvedValue({});
      mockPrismaService.upload.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 100,
        userId: 1,
        purpose: 'TOKEN_RESERVATION',
        status: 'PAID',
        effectsAppliedAt: null,
      });

      const captured: { startupArgs?: any } = {};
      mockPrismaService.$transaction.mockImplementationOnce(async (cb: any) => {
        const txMock = {
          kYCProfile: { create: jest.fn().mockResolvedValue({ id: 1 }) },
          startup: {
            create: jest.fn().mockImplementation((args: any) => {
              captured.startupArgs = args;
              return Promise.resolve({ id: 24, ...draftPayload });
            }),
          },
          startupDraft: { update: jest.fn().mockResolvedValue({}) },
          campaign: { create: jest.fn().mockResolvedValue({ id: 99 }) },
          startupDocument: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await service.processPaymentEffects(100);

      expect(captured.startupArgs.data.fastTrackReview).toBe(false);
      expect(captured.startupArgs.data.fastTrackReviewedAt).toBeNull();
    });
  });

  describe('processReservationExtensionPayment (reativação c/ período)', () => {
    it('reativa OPEN, soma meta+tokens e aplica deadline = now + periodDays', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 555,
        purpose: 'TOKEN_RESERVATION_EXTENSION',
        campaignId: 9,
      });
      mockPrismaService.campaignExtension.findUnique.mockResolvedValueOnce({
        id: 1,
        campaignId: 9,
        additionalAmount: 200000,
        tokenReserve: 5000,
        periodDays: 45,
        status: 'PENDING_RESERVATION_PAYMENT',
      });
      mockPrismaService.campaign.findUnique.mockResolvedValueOnce({
        targetAmount: 500000,
        totalTokens: 12500,
      });

      await (service as any).processReservationExtensionPayment(555);

      const call = mockPrismaService.campaign.update.mock.calls.find(
        (c: any) => c[0]?.where?.id === 9,
      );
      expect(call).toBeDefined();
      expect(call[0].data.status).toBe('OPEN');
      expect(call[0].data.targetAmount).toBe(700000);
      expect(call[0].data.totalTokens).toBe(17500);
      // deadline ~ now + 45 dias.
      const dl = new Date(call[0].data.deadline).getTime();
      const dias = (dl - Date.now()) / (1000 * 60 * 60 * 24);
      expect(dias).toBeGreaterThanOrEqual(44.9);
      expect(dias).toBeLessThanOrEqual(45.1);
      expect(mockPrismaService.campaignExtension.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REACTIVATED' }),
        }),
      );
    });

    it('idempotente: no-op se extensão já REACTIVATED', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 555,
        purpose: 'TOKEN_RESERVATION_EXTENSION',
        campaignId: 9,
      });
      mockPrismaService.campaignExtension.findUnique.mockResolvedValueOnce({
        id: 1,
        campaignId: 9,
        additionalAmount: 200000,
        tokenReserve: 5000,
        periodDays: 30,
        status: 'REACTIVATED',
      });
      const before = mockPrismaService.campaign.update.mock.calls.length;
      await (service as any).processReservationExtensionPayment(555);
      expect(mockPrismaService.campaign.update.mock.calls.length).toBe(before);
    });
  });

  describe('createComplianceFee (bundling FAST_DEPLOY)', () => {
    const campaignRow = {
      id: 3,
      startupId: 30,
      startup: { founderId: 42, status: 'PENDING_APPROVAL' },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // S18.7 — re-estabelece o mock default de $transaction após
      // clearAllMocks (que limpa implementações). O helper
      // _createOrderWithItems usa tx.payment, tx.paymentOrder e
      // tx.paymentItem.
      mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
        cb({
          payment: mockPrismaService.payment,
          paymentOrder: mockPrismaService.paymentOrder,
          paymentItem: mockPrismaService.paymentItem,
        }),
      );
      mockPrismaService.campaign.findUnique.mockResolvedValue(campaignRow);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 900, ...args.data }),
      );
      mockPrismaService.startup.update = jest.fn().mockResolvedValue({});
    });

    it('wantsFastDeploy=false: cria apenas 1 Payment (COMPLIANCE_FEE)', async () => {
      const res = await service.createComplianceFee(3, 42, false);
      expect(res.codigo).toBe(201);
      // 1 só create (COMPLIANCE_FEE)
      expect(mockPrismaService.payment.create).toHaveBeenCalledTimes(1);
      const purposes = mockPrismaService.payment.create.mock.calls.map(
        (c: any) => c[0].data.purpose,
      );
      expect(purposes).toEqual(['COMPLIANCE_FEE']);
    });

    it('wantsFastDeploy=true: cria 2 Payments (COMPLIANCE_FEE + FAST_DEPLOY)', async () => {
      const res = await service.createComplianceFee(3, 42, true);
      expect(res.codigo).toBe(201);
      expect(mockPrismaService.payment.create).toHaveBeenCalledTimes(2);
      const purposes = mockPrismaService.payment.create.mock.calls.map(
        (c: any) => c[0].data.purpose,
      );
      expect(purposes).toContain('COMPLIANCE_FEE');
      expect(purposes).toContain('FAST_DEPLOY');
      // FAST_DEPLOY amount = FAST_DEPLOY_FEE (1000) do mock SystemConfig
      const fd = mockPrismaService.payment.create.mock.calls
        .map((c: any) => c[0].data)
        .find((d: any) => d.purpose === 'FAST_DEPLOY');
      expect(Number(fd.amount)).toBe(1000);
      expect(fd.campaignId).toBe(3);
    });

    it('COMPLIANCE_FEE já PAID: idempotente, ignora wantsFastDeploy (0 creates)', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValueOnce({
        id: 500,
        purpose: 'COMPLIANCE_FEE',
        status: 'PAID',
      });
      const res = await service.createComplianceFee(3, 42, true);
      expect(res.codigo).toBe(200);
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });

    it('wantsFastDeploy=true mas FAST_DEPLOY já PENDING: não duplica (só COMPLIANCE_FEE criado)', async () => {
      // 1ª findFirst (COMPLIANCE_FEE existente) => null
      // 2ª findFirst (FAST_DEPLOY existente) => já existe
      mockPrismaService.payment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 777 });
      const res = await service.createComplianceFee(3, 42, true);
      expect(res.codigo).toBe(201);
      const purposes = mockPrismaService.payment.create.mock.calls.map(
        (c: any) => c[0].data.purpose,
      );
      expect(purposes).toEqual(['COMPLIANCE_FEE']);
    });
  });

  describe('processPaymentEffects (FAST_DEPLOY)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('FAST_DEPLOY PAID: seta campaign.fastDeploy=true e marca effectsAppliedAt', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 900,
        userId: 42,
        purpose: 'FAST_DEPLOY',
        status: 'PAID',
        campaignId: 3,
        effectsAppliedAt: null,
      });
      mockPrismaService.campaign.findUnique.mockResolvedValueOnce({
        id: 3,
        fastDeploy: false,
      });
      mockPrismaService.campaign.update.mockResolvedValueOnce({});
      mockPrismaService.payment.update.mockResolvedValueOnce({});

      await service.processPaymentEffects(900);

      expect(mockPrismaService.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 3 },
          data: { fastDeploy: true },
        }),
      );
      // effectsAppliedAt marcado
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 900 },
          data: expect.objectContaining({
            effectsAppliedAt: expect.anything(),
          }),
        }),
      );
    });

    it('FAST_DEPLOY idempotente: campanha já fastDeploy=true não chama update', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 901,
        userId: 42,
        purpose: 'FAST_DEPLOY',
        status: 'PAID',
        campaignId: 3,
        effectsAppliedAt: null,
      });
      mockPrismaService.campaign.findUnique.mockResolvedValueOnce({
        id: 3,
        fastDeploy: true,
      });
      mockPrismaService.payment.update.mockResolvedValueOnce({});

      await service.processPaymentEffects(901);

      expect(mockPrismaService.campaign.update).not.toHaveBeenCalled();
    });
  });

  describe('simulateInstallments', () => {
    it('retorna opções com juros compostos e marca belowMinimum', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 10,
        userId: 42,
        status: 'PENDING',
        amount: 1000,
      });
      mockInstallmentConfigService.getVigente.mockResolvedValueOnce({
        id: 1,
        interestRate: 0.0299,
        maxInstallments: 12,
        minInstallmentAmount: 100,
      });
      // Calculadora real: 1x = principal (sem juros); Nx = P*(1+i)^n / n.
      mockInstallmentCalculatorService.calculateInstallments.mockImplementation(
        (principal: number, n: number, rate: number) => {
          if (n === 1) {
            return {
              principal,
              installments: 1,
              interestRate: rate,
              totalWithInterest: principal,
              installmentAmount: principal,
              totalInterest: 0,
            };
          }
          const total = Math.round(principal * (1 + rate) ** n * 100) / 100;
          const installmentAmount = Math.round((total / n) * 100) / 100;
          return {
            principal,
            installments: n,
            interestRate: rate,
            totalWithInterest: total,
            installmentAmount,
            totalInterest: Math.round((total - principal) * 100) / 100,
          };
        },
      );

      const res: any = await service.simulateInstallments(10, 42);
      const data = res.data;

      expect(data.options).toHaveLength(12);
      // 1x = principal, sem juros.
      expect(data.options[0].installments).toBe(1);
      expect(data.options[0].installmentAmount).toBe(1000);
      expect(data.options[0].totalInterest).toBe(0);
      expect(data.options[0].belowMinimum).toBe(false);
      // 12x: parcela de 1000*(1.0299)^12/12 ≈ 118,56 (acima do mínimo 100).
      const twelve = data.options[11];
      expect(twelve.installments).toBe(12);
      expect(twelve.totalWithInterest).toBeGreaterThan(1000);
      expect(twelve.belowMinimum).toBe(false);
    });

    it('marca belowMinimum quando a parcela fica abaixo do mínimo', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 11,
        userId: 42,
        status: 'PENDING',
        amount: 150,
      });
      mockInstallmentConfigService.getVigente.mockResolvedValueOnce({
        id: 1,
        interestRate: 0.0299,
        maxInstallments: 3,
        minInstallmentAmount: 100,
      });
      mockInstallmentCalculatorService.calculateInstallments.mockImplementation(
        (principal: number, n: number, rate: number) => {
          if (n === 1) {
            return {
              principal,
              installments: 1,
              interestRate: rate,
              totalWithInterest: principal,
              installmentAmount: principal,
              totalInterest: 0,
            };
          }
          const total = Math.round(principal * (1 + rate) ** n * 100) / 100;
          const installmentAmount = Math.round((total / n) * 100) / 100;
          return {
            principal,
            installments: n,
            interestRate: rate,
            totalWithInterest: total,
            installmentAmount,
            totalInterest: Math.round((total - principal) * 100) / 100,
          };
        },
      );

      const res: any = await service.simulateInstallments(11, 42);
      const data = res.data;
      // 2x de ~79,5 e 3x de ~54,7 ficam abaixo de 100 → belowMinimum=true.
      expect(data.options[1].belowMinimum).toBe(true);
      expect(data.options[2].belowMinimum).toBe(true);
    });

    it('lança NotFound quando o pagamento não existe', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(null);
      await expect(service.simulateInstallments(999, 42)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança Forbidden quando o pagamento é de outro usuário', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 12,
        userId: 999,
        status: 'PENDING',
        amount: 1000,
      });
      await expect(service.simulateInstallments(12, 42)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lança 422 quando o pagamento não está PENDING', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        id: 13,
        userId: 42,
        status: 'PAID',
        amount: 1000,
      });
      await expect(service.simulateInstallments(13, 42)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });
});
