import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { ConfigService } from 'src/api/config/config.service';
import { InvestmentsService } from 'src/api/investments/investments.service';
import { CampaignFinancialHelper } from 'src/api/campaigns/service/campaign-financial.helper';
import { SessionService } from 'src/auth/session/session.service';
import { AuditService } from 'src/common/audit/audit.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { SystemConfigService } from 'src/common/system-config/system-config.service';
import { PaymentPublisher } from 'src/messaging/payment.publisher';
import { PrismaService } from 'src/prisma/prisma.service';
import { CouponSettlementService } from './coupons/coupon-settlement.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateStartupCheckoutDto } from './dto/create-startup-checkout.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { EfiChargeAdapter } from './efi/adapters/efi-charge.adapter';
import { EfiPixAdapter } from './efi/adapters/efi-pix.adapter';
import {
  PaymentCancelledEvent,
  PaymentConfirmedEvent,
  PaymentEvents,
} from './events/payment-events';
import { InstallmentCalculatorService } from './service/installment-calculator.service';
import { InstallmentConfigService } from './service/installment-config.service';

/**
 * Normaliza um telefone brasileiro para o formato exigido pela EFI no campo
 * `credit_card.customer.phone_number`, cuja validação é a regex
 * `^[1-9]{2}9?[0-9]{8}$` — ou seja: DDD (2 dígitos, sem 0 inicial) +
 * 9 opcional + 8 dígitos. Aceita apenas 10 (fixo) ou 11 (celular) dígitos.
 *
 * Passos:
 * 1. Remove tudo que não é dígito (máscara, espaços, parênteses, `+`).
 * 2. Remove o DDI `55` quando o número vem com código de país (12–13 dígitos).
 * 3. Retorna o telefone só se casar com a regex da EFI; caso contrário
 *    `undefined`, para que o campo (opcional) seja omitido do payload em vez
 *    de derrubar a cobrança inteira com um `validation_error`.
 */
function normalizeBrazilianPhone(raw?: string | null): string | undefined {
  if (!raw) return undefined;

  let digits = raw.replace(/\D/g, '');

  // Remove o DDI 55 (Brasil) quando presente: 12 dígitos (55 + fixo) ou
  // 13 dígitos (55 + celular).
  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith('55')
  ) {
    digits = digits.slice(2);
  }

  return /^[1-9]{2}9?[0-9]{8}$/.test(digits) ? digits : undefined;
}

/** Mantém a mesma escala monetária usada em todos os meios de pagamento. */
function normalizePaymentAmount(amount: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(amount).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_EVEN,
  );
}

const EFI_PREFLIGHT_ERROR_CODES = new Set([
  'pix_payer_doc_required',
  'card_payment_token_required',
  'card_customer_email_required',
  'card_customer_name_required',
  'card_installments_invalid',
  'card_customer_cpf_required',
  'card_customer_birth_required',
  'card_billing_address_required',
  'payment_amount_not_positive',
]);

function isKnownEfiPreflightError(error: unknown): boolean {
  if (!(error instanceof HttpException)) return false;

  const response = error.getResponse();
  const code =
    typeof response === 'object' && response !== null
      ? (response as { code?: unknown }).code
      : undefined;

  return typeof code === 'string' && EFI_PREFLIGHT_ERROR_CODES.has(code);
}

/**
 * Extrai detalhes úteis de um erro pra cuspir no `detalhe` do ResponseDto.
 * Strings ou objetos crus são repassados sem expor credenciais.
 */
function buildErrorDetail(error: unknown) {
  if (error instanceof Error) {
    // fetch nativo do Node esconde o erro real em `error.cause` quando
    // dá ruim no transporte (mTLS handshake, DNS, ECONNREFUSED, etc).
    const cause = (error as Error & { cause?: unknown }).cause;
    const causeInfo =
      cause instanceof Error
        ? {
            name: cause.name,
            message: cause.message,
            code: (cause as Error & { code?: string }).code,
          }
        : cause;
    return {
      message: error.message,
      name: error.name,
      cause: causeInfo,
      stack: error.stack,
    };
  }
  return { raw: error };
}

type ReservationNameSource = 'PERSISTED_STARTUP' | 'DRAFT_PAYLOAD' | 'NONE';

type ReservationContext = {
  kind: 'STARTUP_RESERVATION';
  displayName: string | null;
  nameSource: ReservationNameSource;
  startup: { slug: string | null; displayName: string } | null;
  campaign: { title: string } | null;
  /** Quantidade de tokens reservados (draft ou campaign persistida). */
  totalTokens: number | null;
};

const STARTUP_CHECKOUT_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * Normaliza somente textos comerciais autorizados para a projeção do checkout.
 * O payload inteiro do draft nunca atravessa este mapper.
 */
function sanitizeCommercialText(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255)
    .trim();

  return normalized || null;
}

function buildReservationContext(payment: {
  purpose: string;
  startupDraft?: { payload: unknown } | null;
  campaign?: {
    title: unknown;
    totalTokens?: unknown;
    startup?: {
      nome: unknown;
      razao_social: unknown;
      slug: unknown;
    } | null;
  } | null;
}): ReservationContext | null {
  if (payment.purpose !== 'TOKEN_RESERVATION') return null;

  const persistedStartup = payment.campaign?.startup;
  const persistedName =
    sanitizeCommercialText(persistedStartup?.nome) ??
    sanitizeCommercialText(persistedStartup?.razao_social);
  const draftPayload =
    payment.startupDraft?.payload &&
    typeof payment.startupDraft.payload === 'object'
      ? (payment.startupDraft.payload as Record<string, unknown>)
      : null;
  const draftName =
    sanitizeCommercialText(draftPayload?.nomeFantasia) ??
    sanitizeCommercialText(draftPayload?.razaoSocial);
  const displayName = persistedName ?? draftName;
  const nameSource: ReservationNameSource = persistedName
    ? 'PERSISTED_STARTUP'
    : draftName
      ? 'DRAFT_PAYLOAD'
      : 'NONE';
  const campaignTitle = sanitizeCommercialText(payment.campaign?.title);

  // Quantidade reservada: prefere a Campaign persistida (pos-reserva);
  // fallback no payload do StartupDraft (checkout pre-criacao).
  const rawTokens = payment.campaign?.totalTokens ?? draftPayload?.totalTokens;
  const totalTokens =
    Number.isFinite(Number(rawTokens)) && Number(rawTokens) > 0
      ? Math.trunc(Number(rawTokens))
      : null;

  return {
    kind: 'STARTUP_RESERVATION',
    displayName,
    nameSource,
    totalTokens,
    // A startup subobject is a persisted-startup projection only. The draft
    // snapshot can identify the reservation, but it does not mean that a
    // Startup row already exists or that its slug belongs to the draft name.
    startup: persistedName
      ? {
          slug: sanitizeCommercialText(persistedStartup?.slug),
          displayName: persistedName,
        }
      : null,
    campaign: campaignTitle ? { title: campaignTitle } : null,
  };
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  private async generateUniqueStartupSlug(name: unknown): Promise<string> {
    const base =
      String(name || 'startup')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, 'e')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/g, '') || 'startup';

    const exists = async (slug: string) =>
      (await this.prisma.startup.findUnique({
        where: { slug },
        select: { id: true },
      })) !== null;

    if (!(await exists(base))) return base;

    for (let counter = 1; counter <= 9999; counter += 1) {
      const candidate = `${base}-${counter}`;
      if (!(await exists(candidate))) return candidate;
    }

    throw new ConflictException(
      'Não foi possível gerar um slug único para a startup.',
    );
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly audit: AuditService,
    private readonly investmentsService: InvestmentsService,
    private readonly efiPixAdapter: EfiPixAdapter,
    private readonly efiChargeAdapter: EfiChargeAdapter,
    private readonly eventEmitter: EventEmitter2,
    private readonly systemConfigService: SystemConfigService,
    private readonly installmentCalculator: InstallmentCalculatorService,
    private readonly installmentConfigService: InstallmentConfigService,
    private readonly sessionService: SessionService,
    private readonly paymentPublisher: PaymentPublisher,
    private readonly couponSettlementService: CouponSettlementService,
  ) {}

  private async validatePaymentReferences(
    dto: {
      purpose: string;
      subscriptionId?: number;
      investmentId?: number;
      campaignId?: number;
    },
    userId: number,
  ): Promise<void> {
    const hasSubscriptionId = dto.subscriptionId != null;
    const hasInvestmentId = dto.investmentId != null;
    const hasCampaignId = dto.campaignId != null;

    const invalidReference = (): never => {
      throw new NotFoundException('REFERENCIA_PAGAMENTO_INVALIDA');
    };

    const rejectUnexpectedReferences = (message: string) => {
      throw new UnprocessableEntityException({
        code: 'invalid_purpose_combination',
        message,
      });
    };

    if (dto.purpose === 'SUBSCRIPTION') {
      if (!hasSubscriptionId) {
        throw new UnprocessableEntityException({
          code: 'invalid_purpose_combination',
          message: 'SUBSCRIPTION requires subscriptionId',
        });
      }
      if (hasInvestmentId || hasCampaignId) {
        rejectUnexpectedReferences(
          'SUBSCRIPTION does not accept investmentId or campaignId',
        );
      }

      const subscription = await this.prisma.subscription.findFirst({
        where: { id: dto.subscriptionId, userId },
        select: { id: true },
      });
      if (!subscription) invalidReference();
      return;
    }

    if (dto.purpose === 'INVESTMENT') {
      if (!hasInvestmentId) {
        throw new UnprocessableEntityException({
          code: 'invalid_purpose_combination',
          message: 'INVESTMENT requires investmentId',
        });
      }
      if (hasSubscriptionId) {
        rejectUnexpectedReferences('INVESTMENT does not accept subscriptionId');
      }

      const investment = await this.prisma.investment.findFirst({
        where: { id: dto.investmentId, userId },
        select: { id: true, campaignId: true },
      });
      if (!investment) {
        invalidReference();
        return;
      }
      if (hasCampaignId && investment.campaignId !== dto.campaignId) {
        invalidReference();
      }
      return;
    }

    if (dto.purpose === 'TOKEN_RESERVATION') {
      if (!hasCampaignId) {
        throw new UnprocessableEntityException({
          code: 'invalid_purpose_combination',
          message: 'TOKEN_RESERVATION requires campaignId',
        });
      }
      if (hasSubscriptionId || hasInvestmentId) {
        rejectUnexpectedReferences(
          'TOKEN_RESERVATION does not accept subscriptionId or investmentId',
        );
      }

      const campaign = await this.prisma.campaign.findFirst({
        where: {
          id: dto.campaignId,
          startup: { founderId: userId },
        },
        select: { id: true },
      });
      if (!campaign) invalidReference();
      return;
    }

    if (hasSubscriptionId || hasInvestmentId || hasCampaignId) {
      rejectUnexpectedReferences(
        `${dto.purpose} does not accept subscriptionId, investmentId or campaignId`,
      );
    }
  }

  async create(createPaymentDto: CreatePaymentDto, userId: number) {
    await this.validatePaymentReferences(createPaymentDto, userId);

    try {
      // S18.7 — dual-write: cria 1 PaymentOrder (1 item) + 1 Payment
      // legado. A Order vira a source-of-truth do estado; o Payment é
      // mantido para retrocompat. Idempotente em relação a testes
      // existentes que esperam o `id` do Payment legado.
      const amount = Number(createPaymentDto.amount);
      const orderResult = await this._createOrderWithItems(
        userId,
        createPaymentDto.method as PaymentMethod,
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        [
          {
            purpose: createPaymentDto.purpose as PaymentPurpose,
            amount,
            originalAmount: amount,
          },
        ],
        { campaignId: createPaymentDto.campaignId ?? null },
      );
      // Atualiza o Payment legado com os campos específicos (FKs) que o
      // helper não conhece (subscription, investment).
      const legacyId = orderResult.items[0].paymentId;
      await this.prisma.payment.update({
        where: { id: legacyId },
        data: {
          subscriptionId: createPaymentDto.subscriptionId,
          investmentId: createPaymentDto.investmentId,
        },
      });
      const payment = await this.prisma.payment.findUnique({
        where: { id: legacyId },
      });

      return ResponseDto.success('Pagamento criado com sucesso', 201, payment);
    } catch (error) {
      this.logger.error('Erro ao criar pagamento', error);
      return ResponseDto.error('Erro ao criar pagamento', 500, error);
    }
  }

  /**
   * Cria (ou retorna idempotentemente) o Payment COMPLIANCE_FEE para a
   * campanha informada. Usado pelo fluxo do founder: ao salvar a aba de
   * captação completa no `/founder/startups/:id/captacao`, o frontend
   * chama este endpoint e redireciona para o checkout.
   *
   * Regras:
   *   - Auth + ownership (founderId da startup === userId)
   *   - Idempotente: se já existe Payment PENDING/PAID COMPLIANCE_FEE para
   *     a campanha, retorna o existente (200) em vez de criar novo
   *     (evita duplicidade em caso de duplo-clique em "Salvar").
   *   - Valor vem exclusivamente do SystemConfig `COMPLIANCE_FEE`.
   *
   * NOTA LGPD: termo de aceite formal (Art. 7º V) está pendente em
   * sprint dedicada (LGPD-FIND-S01-001). Por ora, o aceite é implícito
   * — o founder clica "Salvar" e a cobrança é gerada.
   */
  async createComplianceFee(
    campaignId: number,
    userId: number,
    wantsFastDeploy = false,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        startup: { select: { founderId: true, status: true } },
      },
    });

    if (!campaign) {
      return ResponseDto.error('CAMPAIGN_NOT_FOUND', 404);
    }
    if (campaign.startup.founderId !== userId && userId !== undefined) {
      return ResponseDto.error('NOT_OWNER', 403);
    }

    // Idempotência: retorna PENDING/PAID existente se houver.
    const existing = await this.prisma.payment.findFirst({
      where: {
        campaignId,
        purpose: 'COMPLIANCE_FEE',
        status: { in: ['PENDING', 'PAID'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      if (
        existing.status === 'PENDING' &&
        campaign.startup.status !== 'AWAITING_COMPLIANCE_FEE' &&
        // FIX BUG-FUND-STATUS-REGRESSION: nunca regredir o status se a
        // startup já foi aprovada (Fase 1+) — nesse caso a taxa de compliance
        // é parte do fluxo de Fase 3, não uma re-análise do cadastro. Sem
        // este guard, gerar uma 2ª cobrança de COMPLIANCE_FEE para uma
        // startup já APPROVED voltaria o status para `AWAITING_COMPLIANCE_FEE`,
        // fazendo o `/founder/dashboard` mostrar "ANÁLISE" e a borda da logo
        // mudar de magenta (aprovada) para âmbar (em análise).
        campaign.startup.status !== 'APPROVED'
      ) {
        await this.prisma.startup.update({
          where: { id: campaign.startupId },
          data: { status: 'AWAITING_COMPLIANCE_FEE' },
        });
      }
      // Guard FAST_DEPLOY: se a cobrança de compliance já existe (PENDING/PAID),
      // a janela de contratação consolidada da Publicação Rápida já passou —
      // ignoramos `wantsFastDeploy` para não criar um 2º produto órfão fora do
      // checkout consolidado. (Consistente com a idempotência acima.)
      return ResponseDto.success(
        'Cobrança de compliance já existente',
        200,
        existing,
      );
    }

    // Valor vem do SystemConfig (SystemConfigService.get).
    const fee = await this.systemConfigService.get('COMPLIANCE_FEE');
    if (!Number.isFinite(fee) || fee <= 0) {
      return ResponseDto.error('COMPLIANCE_FEE_NOT_CONFIGURED', 500);
    }

    // S18.7 — dual-write: cria 1 PaymentOrder + 1-2 PaymentItems + 1-2
    // Payment legados com paymentGroupId. O estado do pagamento passa a ser
    // carregado pela Order; o Payment legado é mantido para retrocompat.
    const fastDeployFee = wantsFastDeploy
      ? await this.systemConfigService.get('FAST_DEPLOY_FEE')
      : 0;
    if (
      wantsFastDeploy &&
      (!Number.isFinite(fastDeployFee) || fastDeployFee <= 0)
    ) {
      this.logger.warn(
        `FAST_DEPLOY_FEE não configurado (campaign ${campaignId}); ` +
          'checkout criado só com COMPLIANCE_FEE.',
      );
    }
    const items: Array<{
      purpose: PaymentPurpose;
      amount: number;
      originalAmount: number;
    }> = [{ purpose: 'COMPLIANCE_FEE', amount: fee, originalAmount: fee }];
    // Idempotência S18.6: não duplicar FAST_DEPLOY se já existir um
    // PENDING/PAID para esta campanha. (Mantém comportamento legado do
    // teste "wantsFastDeploy=true mas FAST_DEPLOY já PENDING: não
    // duplica".)
    if (
      wantsFastDeploy &&
      Number.isFinite(fastDeployFee) &&
      fastDeployFee > 0
    ) {
      const existingFastDeploy = await this.prisma.payment.findFirst({
        where: {
          campaignId,
          purpose: 'FAST_DEPLOY',
          status: { in: ['PENDING', 'PAID'] },
        },
        select: { id: true },
      });
      if (!existingFastDeploy) {
        items.push({
          purpose: 'FAST_DEPLOY',
          amount: fastDeployFee,
          originalAmount: fastDeployFee,
        });
      }
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const orderResult = await this._createOrderWithItems(
      userId,
      'PIX' as PaymentMethod,
      expiresAt,
      items,
      { campaignId },
    );

    // Mantém a semântica de retorno: o "created" representa o Payment
    // principal (COMPLIANCE_FEE) para consumers que ainda leem Payment.
    const created = {
      id: orderResult.items[0].paymentId,
      orderId: orderResult.order.id,
      amount: fee,
      status: 'PENDING' as PaymentStatus,
    };

    // A campanha foi finalizada pelo founder e aguarda o pagamento da taxa;
    // o status alimenta o fluxo de análise do Compliance sem confiar no frontend.
    // FIX BUG-FUND-STATUS-REGRESSION (mesmo guard acima): não regredir
    // startup.status para AWAITING_COMPLIANCE_FEE se a startup já está
    // APPROVED — perderia o badge "Aprovada" no /founder/dashboard.
    if (campaign.startup.status !== 'APPROVED') {
      await this.prisma.startup.update({
        where: { id: campaign.startupId },
        data: { status: 'AWAITING_COMPLIANCE_FEE' },
      });
    }

    return ResponseDto.success('Cobrança de compliance criada', 201, created);
  }

  // ============================================
  // S18.7 — Helper de criação com dual-write
  // ============================================
  // Cria 1 PaymentOrder + N PaymentItems E também os N Payment records
  // legados (com paymentGroupId apontando para o "âncora"). Estratégia
  // non-breaking: durante a transição (Fases 2-5), os consumers legados
  // continuam lendo de Payment; após a Fase 6 (cutover), Payment é removido.
  //
  // Idempotência: paymentGroupId é derivado de forma estável do primeiro
  // Payment criado (âncora), para permitir que backfill futuro (Fase 4)
  // re-derive o mesmo groupId a partir dos Payments legados.
  //
  // Parâmetros:
  //   userId: founder/investidor
  //   method: PIX ou CREDIT_CARD
  //   expiresAt: timestamp de expiração do QR
  //   items: lista de itens do pedido (purpose, amount, originalAmount,
  //     description?, serviceDetails?)
  //   refs: { campaignId?, startupDraftId? } — vínculos de domínio
  async _createOrderWithItems(
    userId: number,
    method: PaymentMethod,
    expiresAt: Date,
    items: Array<{
      purpose: PaymentPurpose;
      amount: number;
      originalAmount: number;
      description?: string;
      serviceDetails?: Prisma.InputJsonValue;
    }>,
    refs: {
      campaignId?: number | null;
      startupDraftId?: number | null;
    } = {},
  ): Promise<{
    order: { id: number; totalAmount: number; totalOriginal: number };
    items: Array<{
      id: number;
      paymentId: number;
      purpose: PaymentPurpose;
      amount: number;
    }>;
  }> {
    if (items.length === 0) {
      throw new Error('_createOrderWithItems requer ao menos 1 item');
    }
    const totalAmount = items.reduce((sum, it) => sum + Number(it.amount), 0);
    const totalOriginal = items.reduce(
      (sum, it) => sum + Number(it.originalAmount),
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1) Cria o Payment âncora (1º item) — usado como groupId de referência.
      const anchor = await tx.payment.create({
        data: {
          userId,
          amount: items[0].amount as any,
          originalAmount: items[0].originalAmount as any,
          discountAmount: 0 as any,
          paidAmount: items[0].amount as any,
          method,
          purpose: items[0].purpose,
          status: 'PENDING',
          expiresAt,
          ...(refs.campaignId != null ? { campaignId: refs.campaignId } : {}),
        },
        select: { id: true, purpose: true },
      });

      // 2) Cria os demais Payments legados (siblings) com paymentGroupId.
      const legacyPayments: Array<{
        id: number;
        purpose: PaymentPurpose;
        amount: number;
      }> = [
        { id: anchor.id, purpose: anchor.purpose, amount: items[0].amount },
      ];

      for (let i = 1; i < items.length; i += 1) {
        const it = items[i];
        const sib = await tx.payment.create({
          data: {
            userId,
            amount: it.amount as any,
            originalAmount: it.originalAmount as any,
            discountAmount: 0 as any,
            paidAmount: it.amount as any,
            method,
            purpose: it.purpose,
            status: 'PENDING',
            expiresAt,
            paymentGroupId: anchor.id,
            ...(refs.campaignId != null ? { campaignId: refs.campaignId } : {}),
          },
          select: { id: true, purpose: true },
        });
        legacyPayments.push({
          id: sib.id,
          purpose: sib.purpose,
          amount: it.amount,
        });
      }

      // 3) Cria a PaymentOrder (fonte da verdade do estado).
      const order = await tx.paymentOrder.create({
        data: {
          userId,
          status: 'PENDING',
          method,
          totalAmount: totalAmount as any,
          totalOriginal: totalOriginal as any,
          totalDiscount: (totalOriginal - totalAmount) as any,
          expiresAt,
          ...(refs.campaignId != null ? { campaignId: refs.campaignId } : {}),
          ...(refs.startupDraftId != null
            ? { startupDraftId: refs.startupDraftId }
            : {}),
        },
        select: { id: true },
      });

      // 4) Cria os PaymentItems (1 por item da ordem) com paymentGroupId
      //    espelhado para a migration reversa ser possível.
      const createdItems: Array<{
        id: number;
        paymentId: number;
        purpose: PaymentPurpose;
        amount: number;
      }> = [];
      for (let i = 0; i < items.length; i += 1) {
        const it = items[i];
        const legacyId = legacyPayments[i].id;
        const created = await tx.paymentItem.create({
          data: {
            orderId: order.id,
            purpose: it.purpose,
            description: it.description,
            unitPrice: it.amount as any, // qty=1 (default) — caller ajusta se necessário
            quantity: 1,
            subtotal: it.amount as any,
            originalSubtotal: it.originalAmount as any,
            discountAmount: (it.originalAmount - it.amount) as any,
            serviceDetails: it.serviceDetails,
          },
          select: { id: true },
        });
        createdItems.push({
          id: created.id,
          paymentId: legacyId,
          purpose: it.purpose,
          amount: it.amount,
        });
      }

      return {
        order: {
          id: order.id,
          totalAmount,
          totalOriginal,
        },
        items: createdItems,
      };
    });
  }

  async createStartupCheckout(dto: CreateStartupCheckoutDto, userId: number) {
    const payload = dto.payload;
    const requiredStringFields = [
      'razaoSocial',
      'nomeFantasia',
      'cnpj',
      'dataAbertura',
      'paisIso3',
      'estagio',
      'descricao',
      'titular',
      'banco',
      'agencia',
      'conta',
      'digito',
    ] as const;

    for (const field of requiredStringFields) {
      if (typeof payload[field] !== 'string' || !payload[field].trim()) {
        throw new BadRequestException(`Campo obrigatório ausente: ${field}`);
      }
    }

    // CASE.md §[Taxonomia] — contrato vigente: `areaAtuacaoIds` (plural,
    // array de IDs). `areaAtuacaoId` (singular, legado) é aceito apenas
    // como fallback para payloads antigos em rascunhos preservados.
    const areaIdsFromPayload = Array.isArray(payload.areaAtuacaoIds)
      ? payload.areaAtuacaoIds.filter(
          (id): id is number =>
            typeof id === 'number' && Number.isInteger(id) && id >= 1,
        )
      : [];
    const areaIdFromLegacy =
      typeof payload.areaAtuacaoId === 'number' &&
      Number.isInteger(payload.areaAtuacaoId) &&
      payload.areaAtuacaoId >= 1
        ? payload.areaAtuacaoId
        : null;
    const resolvedAreaIds =
      areaIdsFromPayload.length > 0
        ? areaIdsFromPayload
        : areaIdFromLegacy !== null
          ? [areaIdFromLegacy]
          : [];

    if (
      typeof payload.categoryId !== 'number' ||
      !Number.isInteger(payload.categoryId) ||
      payload.categoryId < 1 ||
      resolvedAreaIds.length === 0
    ) {
      throw new BadRequestException(
        'Categoria e área de atuação são obrigatórias.',
      );
    }

    const rawCnpj = payload.cnpj;
    if (typeof rawCnpj !== 'string') {
      throw new BadRequestException('Campo obrigatório ausente: cnpj');
    }
    const cnpj = rawCnpj.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cnpj.length !== 14) {
      throw new BadRequestException('CNPJ inválido.');
    }

    if (
      typeof payload.metaCaptacao !== 'number' ||
      !Number.isFinite(payload.metaCaptacao) ||
      payload.metaCaptacao <= 0
    ) {
      throw new BadRequestException('Meta de captação inválida.');
    }

    if (
      typeof payload.equityOferecido !== 'number' ||
      !Number.isFinite(payload.equityOferecido)
    ) {
      throw new BadRequestException('Equity oferecido inválido.');
    }

    const [equityMin, equityMax, campaignMin, campaignMax] = await Promise.all([
      this.configService.getEffective('fundraising.equityMin'),
      this.configService.getEffective('fundraising.equityMax'),
      this.configService.getEffective('fundraising.minCampaign'),
      this.configService.getEffective('fundraising.maxCampaign'),
    ]);
    if (
      !Number.isFinite(equityMin) ||
      !Number.isFinite(equityMax) ||
      equityMin > equityMax
    ) {
      throw new BadRequestException(
        'Limites de equity configurados são inválidos.',
      );
    }
    if (
      payload.equityOferecido < equityMin ||
      payload.equityOferecido > equityMax
    ) {
      throw new BadRequestException(
        `Equity deve estar entre ${equityMin}% e ${equityMax}%.`,
      );
    }
    if (Number.isFinite(campaignMin) && payload.metaCaptacao < campaignMin) {
      throw new BadRequestException(
        `Meta de captação deve ser no mínimo R$ ${campaignMin.toLocaleString('pt-BR')}.`,
      );
    }
    if (Number.isFinite(campaignMax) && payload.metaCaptacao > campaignMax) {
      throw new BadRequestException(
        `Meta de captação deve ser no máximo R$ ${campaignMax.toLocaleString('pt-BR')}.`,
      );
    }
    const uploadIds = [payload.logoFileId, payload.pitchDeckFileId].filter(
      (id): id is number =>
        typeof id === 'number' && Number.isInteger(id) && id > 0,
    );
    const uniqueUploadIds = [...new Set(uploadIds)];
    if (uniqueUploadIds.length > 0) {
      const ownedUploads = await this.prisma.upload.findMany({
        where: { id: { in: uniqueUploadIds }, userId },
        select: { id: true },
      });
      if (ownedUploads.length !== uniqueUploadIds.length) {
        throw new BadRequestException(
          'Um dos arquivos enviados não pertence ao usuário autenticado.',
        );
      }
    }

    const existingStartup = await this.prisma.startup.findFirst({
      where: { cnpj },
      select: { id: true },
    });
    if (existingStartup) {
      throw new ConflictException(
        'Já existe startup registrada com este CNPJ.',
      );
    }

    // O cadastro completo permanece temporário até a confirmação do pagamento.
    // Portanto, drafts pendentes não bloqueiam uma nova tentativa de checkout;
    // somente uma Startup já persistida acima caracteriza duplicidade real.
    const expiresAt = new Date(Date.now() + STARTUP_CHECKOUT_EXPIRATION_MS);

    // Fast Track Review: quando o founder marca esta opção no wizard, o backend
    // cria 2 Payments (TOKEN_RESERVATION + FAST_TRACK_REVIEW) que compartilham
    // o mesmo PIX/txid. O valor total é rateado entre os dois preservando
    // `originalAmount` (valor cheio do produto) e `paidAmount` (valor pago).
    // Admin/compliance veem 2 transações distintas para auditoria e relatórios.
    const wantsFastTrack = payload.wantsFastTrackReview === true;
    let fastTrackFeeConfig = 0;
    if (wantsFastTrack) {
      fastTrackFeeConfig = await this.configService.getEffective(
        'fundraising.fastTrackFee',
      );
      if (!Number.isFinite(fastTrackFeeConfig) || fastTrackFeeConfig <= 0) {
        throw new BadRequestException(
          'Taxa de Fast Track Review não configurada (fundraising.fastTrackFee).',
        );
      }
    }
    const reservationAmount = wantsFastTrack
      ? Math.max(0, Math.round((dto.amount - fastTrackFeeConfig) * 100) / 100)
      : dto.amount;
    const fastTrackAmount = wantsFastTrack ? fastTrackFeeConfig : 0;

    // Sanity: o total do frontend deve bater com a soma server-side.
    const expectedTotal =
      Math.round((reservationAmount + fastTrackAmount) * 100) / 100;
    if (Math.abs(expectedTotal - dto.amount) > 0.01) {
      throw new BadRequestException(
        `Valor total inconsistente. Esperado R$ ${expectedTotal.toFixed(2)}, ` +
          `recebido R$ ${dto.amount.toFixed(2)}.`,
      );
    }

    try {
      // S18.7 — dual-write: cria 1 PaymentOrder + 1-2 PaymentItems + 1-2
      // Payment legados com paymentGroupId. A source of truth do estado
      // passa a ser a Order; o Payment legado é mantido para retrocompat
      // até o cutover da Fase 6.
      const orderItems: Array<{
        purpose: PaymentPurpose;
        amount: number;
        originalAmount: number;
        description?: string;
        serviceDetails?: Prisma.InputJsonValue;
      }> = [
        {
          purpose: 'TOKEN_RESERVATION',
          amount: reservationAmount,
          originalAmount: reservationAmount,
        },
      ];
      if (wantsFastTrack) {
        orderItems.push({
          purpose: 'FAST_TRACK_REVIEW',
          amount: fastTrackAmount,
          originalAmount: fastTrackAmount,
        });
      }
      const orderResult = await this._createOrderWithItems(
        userId,
        dto.method as PaymentMethod,
        expiresAt,
        orderItems,
        {},
      );

      // Atualiza os Payments legados com a relação startupDraftFastTrack
      // (mantém compat com consumers que dependem do StartupDraft.paymentId /
      // fastTrackPaymentId para localizar os Payments).
      const reservationPaymentId = orderResult.items[0].paymentId;
      const fastTrackPaymentId =
        orderResult.items.length > 1 ? orderResult.items[1].paymentId : null;

      // Cria o StartupDraft com FK para o Payment principal.
      const draft = await this.prisma.startupDraft.create({
        data: {
          founderId: userId,
          paymentId: reservationPaymentId,
          paymentOrder: { connect: { id: orderResult.order.id } },
          payload: payload as Prisma.InputJsonValue,
          status: 'PENDING_PAYMENT',
        },
        select: { id: true },
      });

      // Liga o Payment FAST_TRACK_REVIEW ao StartupDraft via relation legacy.
      if (fastTrackPaymentId != null) {
        await this.prisma.payment.update({
          where: { id: fastTrackPaymentId },
          data: {
            startupDraftFastTrack: { connect: { id: draft.id } },
          },
        });
      }

      const result = {
        draftId: draft.id,
        paymentId: reservationPaymentId,
        fastTrackPaymentId,
        orderId: orderResult.order.id,
        amount: reservationAmount,
        method: dto.method as PaymentMethod,
        purpose: 'TOKEN_RESERVATION' as PaymentPurpose,
        status: 'PENDING' as PaymentStatus,
      };

      return ResponseDto.success(
        'Checkout da startup criado com sucesso',
        201,
        result,
      );
    } catch (error) {
      this.logger.error('Erro ao criar checkout da startup', error);
      return ResponseDto.error('Erro ao criar checkout da startup', 500, error);
    }
  }

  /**
   * "Gerar Novo Pagamento" (fluxo_startup §1/§4) — recria a cobrança de reserva
   * a partir de um Payment TOKEN_RESERVATION EXPIRED/CANCELED, SEM o founder
   * refazer o wizard. Reaproveita o payload do StartupDraft preservado.
   *
   * Como StartupDraft.paymentId é @unique (1:1), cria um NOVO Payment PENDING +
   * NOVO StartupDraft copiando o payload; marca o draft antigo como FAILED.
   *
   * Idempotência: se já existir um Payment TOKEN_RESERVATION PENDING não
   * expirado do próprio usuário, retorna-o em vez de criar outra cobrança
   * (evita cobrança duplicada — fluxo_startup §4).
   *
   * @param oldPaymentId Payment expirado/cancelado de origem.
   * @param userId Dono da cobrança (ownership).
   */
  async regenerateStartupCheckout(oldPaymentId: number, userId: number) {
    try {
      const old = await this.prisma.payment.findUnique({
        where: { id: oldPaymentId },
        select: {
          id: true,
          userId: true,
          amount: true,
          method: true,
          purpose: true,
          status: true,
          startupDraft: {
            select: { id: true, payload: true, founderId: true },
          },
        },
      });

      if (!old) {
        return ResponseDto.error('Pagamento não encontrado', 404);
      }
      if (old.userId !== userId) {
        return ResponseDto.error('Acesso negado', 403);
      }
      if (old.purpose !== 'TOKEN_RESERVATION') {
        return ResponseDto.error(
          'Apenas cobranças de reserva de token podem ser regeradas',
          400,
        );
      }
      // Só regenera a partir de uma cobrança encerrada sem pagamento.
      if (old.status !== 'EXPIRED' && old.status !== 'CANCELED') {
        return ResponseDto.error(
          'A cobrança atual ainda está ativa. Retome o checkout existente.',
          409,
          { code: 'PAYMENT_STILL_ACTIVE' },
        );
      }
      if (!old.startupDraft?.payload) {
        return ResponseDto.error(
          'Não há rascunho preservado para regenerar o pagamento. Refaça o cadastro.',
          422,
          { code: 'DRAFT_NOT_FOUND' },
        );
      }

      // Idempotência: reaproveita uma cobrança PENDING já existente do usuário.
      const now = new Date();
      const existingPending = await this.prisma.payment.findFirst({
        where: {
          userId,
          purpose: 'TOKEN_RESERVATION',
          status: 'PENDING',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { id: 'desc' },
        select: { id: true, amount: true, method: true, status: true },
      });
      if (existingPending) {
        return ResponseDto.success(
          'Já existe uma cobrança de reserva pendente',
          200,
          {
            paymentId: existingPending.id,
            amount: Number(existingPending.amount),
            method: existingPending.method,
            status: existingPending.status,
            reused: true,
          },
        );
      }

      const expiresAt = new Date(Date.now() + STARTUP_CHECKOUT_EXPIRATION_MS);
      const payload = old.startupDraft.payload as Prisma.InputJsonValue;
      const oldDraftId = old.startupDraft.id;

      const payment = await this.prisma.$transaction(async (tx) => {
        // Encerra o draft antigo (o novo assume o payload).
        await tx.startupDraft.update({
          where: { id: oldDraftId },
          data: { status: 'FAILED' },
        });
        return tx.payment.create({
          data: {
            userId,
            amount: old.amount,
            method: old.method,
            purpose: 'TOKEN_RESERVATION',
            status: 'PENDING',
            expiresAt,
            startupDraft: {
              create: {
                founderId: userId,
                payload,
                status: 'PENDING_PAYMENT',
              },
            },
          },
          select: {
            id: true,
            amount: true,
            method: true,
            purpose: true,
            status: true,
            startupDraft: { select: { id: true } },
          },
        });
      });

      this.logger.log(
        `Novo pagamento de reserva ${payment.id} gerado a partir do payment ${oldPaymentId} (user ${userId})`,
      );

      return ResponseDto.success('Novo pagamento gerado com sucesso', 201, {
        paymentId: payment.id,
        draftId: payment.startupDraft?.id,
        amount: Number(payment.amount),
        method: payment.method,
        purpose: payment.purpose,
        status: payment.status,
        reused: false,
      });
    } catch (error) {
      this.logger.error('Erro ao regenerar pagamento da reserva', error);
      return ResponseDto.error('Erro ao regenerar pagamento', 500, error);
    }
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    purpose?: string;
    userId?: number;
  }) {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 25;
      const search = query?.search?.trim();

      const where: any = {};

      // LGPD: quando chamado no contexto do usuário logado (GET /payment),
      // restringe a listagem aos próprios pagamentos do usuário. Sem este
      // filtro, o endpoint vazaria pagamentos de todos os usuários.
      if (query?.userId) {
        where.userId = query.userId;
      }

      // Filtros do painel admin /admin/payments: status + purpose exatos.
      // Combinam com `search` via AND.
      if (query?.status) {
        where.status = query.status;
      }
      if (query?.purpose) {
        where.purpose = query.purpose;
      }

      if (search) {
        const searchNum = parseInt(search, 10);
        where.OR = [
          { status: { contains: search } },
          { method: { contains: search } },
          { user: { email: { contains: search } } },
          ...(searchNum ? [{ userId: searchNum }] : []),
        ];
      }

      const [payments, total] = await Promise.all([
        this.prisma.payment.findMany({
          where,
          take: limit,
          skip: (page - 1) * limit,
          select: {
            id: true,
            amount: true,
            method: true,
            purpose: true,
            status: true,
            userId: true,
            createdAt: true,
            // campaignId + dados da campanha + startupId — permite ao
            // /founder/financeiro AGRUPAR pagamentos por startup e mostrar
            // o badge de fase da captação (OPEN vs FUNDED vs PAID_OUT).
            campaignId: true,
            campaign: {
              select: {
                id: true,
                startupId: true,
                title: true,
                status: true,
              },
            },
            // Desconto aplicado (cupom) — usado pelo /founder/financeiro para
            // mostrar "valor original / valor pago / desconto" na Taxa de
            // Compliance e outras cobranças que aceitam coupon. Um Payment pode
            // ter mais de 1 CouponUsage (edge case) — para apresentação usamos
            // o maior desconto, que é o mais útil visualmente.
            couponUsages: {
              select: {
                originalAmount: true,
                discountApplied: true,
                finalAmount: true,
                coupon: {
                  select: { code: true, percent: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.payment.count({ where }),
      ]);

      return ResponseDto.success(
        'Lista de pagamentos retornada com sucesso',
        200,
        payments,
        total,
        page,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao buscar pagamentos', 500, error);
    }
  }

  /**
   * S18.7 — helper que retorna `{ order, items }` para incluir no payload de
   * findOne. Se o Payment não tem Order associada (legado pré-Fase 4),
   * retorna `{}` e o consumer cai no fallback dos campos espelhados.
   * Resiliente: se qualquer query falhar, retorna `{}` em vez de quebrar
   * o findOne inteiro.
   *
   * OTIMIZAÇÃO: usa os campos `userId` e `campaignId` do payment já carregado
   * (via `.userId` e `.campaignId`) em vez de fazer queries findUnique
   * adicionais — evita consumir a fila de mocks de teste.
   */
  private async buildOrderSummaryForPayment(payment: {
    id: number;
    paymentGroupId: number | null;
    userId: number;
    campaignId: number | null;
  }): Promise<{
    order?: unknown;
    items?: unknown;
  }> {
    try {
      const order = await this.prisma.paymentOrder.findFirst({
        where: {
          userId: payment.userId,
          OR: [
            // Ordens ligadas a uma campanha (incluindo bundles FAST_DEPLOY)
            ...(payment.campaignId != null
              ? [{ campaignId: payment.campaignId }]
              : []),
            // Ordens ligadas a StartupDraft (reserva + Fast Track)
            {
              startupDraft: {
                OR: [
                  { paymentId: payment.id },
                  { fastTrackPaymentId: payment.id },
                ],
              },
            },
          ],
        },
        include: {
          items: { orderBy: { id: 'asc' } },
        },
        orderBy: { id: 'desc' },
      });
      if (!order) return {};
      return {
        order: {
          id: order.id,
          status: order.status,
          method: order.method,
          totalAmount: Number(order.totalAmount),
          totalOriginal: Number(order.totalOriginal),
          totalDiscount: Number(order.totalDiscount),
          couponCode: order.couponCode,
          couponPercent: order.couponPercent,
          txid: order.txid,
          efiChargeId: order.efiChargeId,
          paidAt: order.paidAt?.toISOString() ?? null,
          expiresAt: order.expiresAt?.toISOString() ?? null,
        },
        items: order.items.map((it) => ({
          id: it.id,
          purpose: it.purpose,
          description: it.description,
          unitPrice: Number(it.unitPrice),
          quantity: it.quantity,
          subtotal: Number(it.subtotal),
          originalSubtotal: Number(it.originalSubtotal),
          discountAmount: Number(it.discountAmount),
        })),
      };
    } catch {
      return {};
    }
  }

  async findOne(id: number, userId?: number) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id },
        select: {
          id: true,
          amount: true,
          originalAmount: true,
          discountAmount: true,
          paidAmount: true,
          method: true,
          purpose: true,
          status: true,
          userId: true,
          txid: true,
          qrCodeBase64: true,
          copyPastePix: true,
          paidAt: true,
          effectsAppliedAt: true,
          expiresAt: true,
          createdAt: true,
          serviceDetails: true,
          // Plano da assinatura (quando SUBSCRIPTION) — usado pelo checkout
          // para exibir a ordem real (nome/descrição/período) e para saber se
          // é o plano AFILIADO, que é isento de KYC.
          subscriptionId: true,
          investmentId: true,
          campaignId: true,
          // S18.6 — quando este Payment for TOKEN_RESERVATION, o StartupDraft
          // pode ter um `fastTrackPaymentId` apontando para o Payment irmão
          // (FAST_TRACK_REVIEW) do mesmo checkout consolidado. Buscamos o
          // sibling para que o checkout exiba 2 produtos e o admin/relatórios
          // vejam o breakdown.
          startupDraft: {
            select: {
              status: true,
              payload: true,
              fastTrackPaymentId: true,
            },
          },
          campaign: {
            select: {
              title: true,
              totalTokens: true,
              startup: {
                select: {
                  nome: true,
                  razao_social: true,
                  slug: true,
                },
              },
            },
          },
          investment: {
            select: {
              id: true,
              status: true,
              amount: true,
              tokensQty: true,
              // Split financeiro (Modelo B) — exposto ao checkout/admin.
              tokenBasePrice: true,
              tokenSellPrice: true,
              tokenSubtotal: true,
              platformFeePct: true,
              platformFeeAmount: true,
              startupRepasseAmount: true,
              platformSpreadAmount: true,
              platformRevenueAmount: true,
              affiliateCommissionAmount: true,
              allocatedAt: true,
              campaign: {
                select: {
                  id: true,
                  title: true,
                  startup: { select: { id: true, nome: true, slug: true } },
                },
              },
            },
          },
          subscription: {
            select: {
              plan: {
                select: {
                  slug: true,
                  nome: true,
                  descricao: true,
                  periodoMeses: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return ResponseDto.error('Pagamento não encontrado', 404);
      }
      if (userId !== undefined && payment.userId !== userId) {
        return ResponseDto.error('Pagamento não encontrado', 404);
      }

      // S18.6 — busca o sibling Payment (FAST_TRACK_REVIEW) do mesmo checkout
      // consolidado, se existir. Mantém compat: clients que não conhecem o
      // campo ignoram; checkout novo renderiza 2 produtos lado a lado.
      let siblingFastTrack: {
        id: number;
        purpose: string;
        amount: number;
        originalAmount: number | null;
        discountAmount: number | null;
        status: string;
        paidAt: Date | null;
      } | null = null;
      if (payment.startupDraft?.fastTrackPaymentId) {
        const ft = await this.prisma.payment.findUnique({
          where: { id: payment.startupDraft.fastTrackPaymentId },
          select: {
            id: true,
            purpose: true,
            amount: true,
            originalAmount: true,
            discountAmount: true,
            status: true,
            paidAt: true,
          },
        });
        siblingFastTrack = ft
          ? {
              id: ft.id,
              purpose: ft.purpose,
              amount: Number(ft.amount),
              originalAmount: ft.originalAmount
                ? Number(ft.originalAmount)
                : null,
              discountAmount: ft.discountAmount
                ? Number(ft.discountAmount)
                : null,
              status: ft.status,
              paidAt: ft.paidAt,
            }
          : null;
      }

      // FAST_DEPLOY ("Publicação Rápida") — produto adicional do checkout
      // consolidado da Taxa de Compliance. Diferente do FAST_TRACK_REVIEW (que
      // se liga via StartupDraft), ambos os Payments compartilham `campaignId`,
      // então buscamos o sibling por campanha. Mantém compat: clients antigos
      // ignoram o campo; o checkout novo renderiza os 2 produtos.
      let siblingFastDeploy: {
        id: number;
        purpose: string;
        amount: number;
        originalAmount: number | null;
        discountAmount: number | null;
        status: string;
        paidAt: Date | null;
      } | null = null;
      if (payment.purpose === 'COMPLIANCE_FEE' && payment.campaignId) {
        const fd = await this.prisma.payment.findFirst({
          where: {
            campaignId: payment.campaignId,
            purpose: 'FAST_DEPLOY',
            status: { in: ['PENDING', 'PAID'] },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            purpose: true,
            amount: true,
            originalAmount: true,
            discountAmount: true,
            status: true,
            paidAt: true,
          },
        });
        siblingFastDeploy = fd
          ? {
              id: fd.id,
              purpose: fd.purpose,
              amount: Number(fd.amount),
              originalAmount: fd.originalAmount
                ? Number(fd.originalAmount)
                : null,
              discountAmount: fd.discountAmount
                ? Number(fd.discountAmount)
                : null,
              status: fd.status,
              paidAt: fd.paidAt,
            }
          : null;
      }

      return ResponseDto.success('Pagamento encontrado com sucesso', 200, {
        id: payment.id,
        amount: payment.amount,
        originalAmount: payment.originalAmount
          ? Number(payment.originalAmount)
          : null,
        discountAmount: payment.discountAmount
          ? Number(payment.discountAmount)
          : null,
        paidAmount: payment.paidAmount ? Number(payment.paidAmount) : null,
        method: payment.method,
        purpose: payment.purpose,
        status: payment.status,
        txid: payment.txid ?? null,
        qrCodeBase64: payment.qrCodeBase64 ?? null,
        copyPastePix: payment.copyPastePix ?? null,
        paidAt: payment.paidAt ?? null,
        expiresAt: payment.expiresAt ?? null,
        effectsAppliedAt: payment.effectsAppliedAt ?? null,
        investmentId: payment.investmentId ?? null,
        subscription: payment.subscription ?? null,
        investment: payment.investment ?? null,
        reservationContext: buildReservationContext(payment),
        serviceDetails: (payment as any).serviceDetails ?? null,
        // S18.7 — se o Payment tem paymentGroupId, retorna também a Order
        // completa (com seus items) para consumers que optarem pelo
        // modelo Order+Items. Para Payments legados (sem Order), retorna null.
        ...(await this.buildOrderSummaryForPayment({
          id: payment.id,
          paymentGroupId: (payment as any).paymentGroupId ?? null,
          userId: payment.userId,
          campaignId: payment.campaignId,
        })),
        fastTrackPayment: siblingFastTrack,
        fastDeployPayment: siblingFastDeploy,
      });
    } catch (error) {
      return ResponseDto.error('Erro ao buscar pagamento', 500, error);
    }
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto) {
    try {
      // Guard: mudanças de status em pagamentos de INVESTMENT não passam por
      // aqui — cancelamento/estorno devem usar cancelByAdmin, que reverte
      // integralmente o investimento, os tokens e a comissão de afiliado
      // (regra: não existe estorno parcial de investimento).
      if (
        (updatePaymentDto as any).status &&
        ['CANCELED', 'REFUNDED', 'EXPIRED'].includes(
          String((updatePaymentDto as any).status),
        )
      ) {
        const existing = await this.prisma.payment.findUnique({
          where: { id },
          select: { purpose: true },
        });
        if (existing?.purpose === 'INVESTMENT') {
          return ResponseDto.error(
            'Status de pagamento de investimento só pode ser alterado pelo ' +
              'endpoint admin de cancelamento/estorno',
            400,
            { code: 'INVESTMENT_STATUS_GUARD' },
          );
        }
      }

      const payment = await this.prisma.payment.update({
        where: { id },
        data: updatePaymentDto as any,
      });

      return ResponseDto.success(
        'Pagamento atualizado com sucesso',
        200,
        payment,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao atualizar pagamento', 500, error);
    }
  }

  /**
   * Gera cobrança PIX para um pagamento existente usando EFI.
   *
   * O lock temporário em `efiLocation` evita que duas emissões, ou a aplicação
   * de um cupom, atravessem a janela entre a leitura do pagamento e a
   * persistência da cobrança no gateway.
   *
   * @param paymentId ID do pagamento
   * @param userId ID do usuário (valida ownership)
   */
  async generatePix(paymentId: number, userId: number) {
    const lockToken = `__issuing__:${paymentId}:${randomUUID()}`;
    let lockAcquired = false;
    let efiCallStarted = false;

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: {
              nome: true,
              email: true,
              reg_documento: true,
              cidade: true,
              uf: true,
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('payment_not_found');
      }

      if (payment.userId !== userId) {
        throw new ForbiddenException('not_your_payment');
      }

      if (payment.status !== 'PENDING') {
        throw new UnprocessableEntityException({
          code: 'payment_not_pending',
          message: `Pagamento já está com status ${payment.status}`,
        });
      }

      if (normalizePaymentAmount(payment.amount).lte(0)) {
        throw new UnprocessableEntityException({
          code: 'payment_amount_not_positive',
          message:
            'Pagamento sem valor a cobrar não pode gerar uma cobrança PIX.',
        });
      }

      await this.acquirePaymentIssuanceLock(paymentId, userId, lockToken);
      lockAcquired = true;

      // A releitura posterior ao CAS garante que a EFI use o valor já
      // descontado quando o cupom vencer a corrida antes da emissão.
      const lockedPayment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: {
              nome: true,
              email: true,
              reg_documento: true,
              cidade: true,
              uf: true,
            },
          },
        },
      });

      if (!lockedPayment) {
        throw new NotFoundException('payment_not_found');
      }

      efiCallStarted = true;
      return this.generatePixViaEfi(lockedPayment, lockToken);
    } catch (error) {
      // Após iniciar a chamada externa o lock só é liberado para falhas de
      // validação local conhecidas; timeout/erro remoto pode ter criado uma
      // cobrança e precisa permanecer fail-closed para reconciliação segura.
      if (
        lockAcquired &&
        (!efiCallStarted || isKnownEfiPreflightError(error))
      ) {
        await this.releasePaymentIssuanceLock(paymentId, lockToken);
      }

      if (error instanceof HttpException) throw error;
      this.logger.error('Erro ao gerar PIX', error);
      return ResponseDto.error(
        'Erro ao gerar PIX',
        500,
        buildErrorDetail(error),
      );
    }
  }

  /**
   * Cancela uma cobrança PIX aberta e remove seus dados locais antes de uma
   * substituição de valor (por exemplo, após aplicar cupom).
   *
   * A chamada externa acontece fora de transação Prisma porque não é
   * reversível pelo banco local. O CAS final impede que uma cobrança já paga
   * ou alterada por outro fluxo seja apagada localmente.
   */
  async cancelAndClearPixCharge(
    paymentId: number,
    userId: number,
    txid: string,
  ): Promise<{ txid: string; canceledAt: Date }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        userId: true,
        status: true,
        txid: true,
        serviceDetails: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('payment_not_found');
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('not_your_payment');
    }

    if (payment.status !== 'PENDING' || payment.txid !== txid) {
      throw new ConflictException({
        code: 'pix_charge_changed',
        message: 'A cobrança PIX mudou de estado e não pode ser substituída.',
      });
    }

    // Não alterar o Payment antes desta confirmação: se a EFI rejeitar o
    // cancelamento, o QR atual continua sendo a única cobrança válida.
    await this.efiPixAdapter.cancelPix(txid);
    const canceledAt = new Date();
    const currentDetails = (payment.serviceDetails as any) ?? {};
    const history = Array.isArray(currentDetails.pixReissueHistory)
      ? currentDetails.pixReissueHistory
      : [];

    const cleared = await this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        userId,
        status: 'PENDING',
        txid,
      },
      data: {
        txid: null,
        qrCodeBase64: null,
        copyPastePix: null,
        efiLocation: null,
        serviceDetails: {
          ...currentDetails,
          pixReissueHistory: [
            ...history,
            {
              previousTxid: txid,
              reason: 'COUPON_APPLIED',
              canceledAt: canceledAt.toISOString(),
            },
          ],
        } as any,
      },
    });

    if (cleared.count !== 1) {
      this.logger.error(
        `Cobrança PIX cancelada externamente, mas não removida do payment ${paymentId}`,
      );
      throw new ConflictException({
        code: 'pix_charge_changed',
        message:
          'A cobrança PIX foi cancelada, mas a ordem mudou durante a atualização. Tente novamente.',
      });
    }

    return { txid, canceledAt };
  }

  private async acquirePaymentIssuanceLock(
    paymentId: number,
    userId: number,
    lockToken: string,
  ): Promise<void> {
    const lock = await this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        userId,
        status: 'PENDING',
        txid: null,
        efiChargeId: null,
        efiLocation: null,
      },
      data: { efiLocation: lockToken },
    });

    if (lock.count !== 1) {
      throw new ConflictException({
        code: 'payment_issuance_in_progress',
        message:
          'A cobrança deste pagamento já foi emitida ou está em emissão.',
      });
    }
  }

  private async releasePaymentIssuanceLock(
    paymentId: number,
    lockToken: string,
  ): Promise<void> {
    try {
      await this.prisma.payment.updateMany({
        where: { id: paymentId, efiLocation: lockToken },
        data: { efiLocation: null },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao liberar lock de emissão do payment ${paymentId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Helper: gera PIX via EFI (novo gateway).
   * Usa `EfiPixAdapter.createPix()` e persiste txid + qrCodeBase64 + copyPastePix.
   */
  private async generatePixViaEfi(payment: any, lockToken: string) {
    const expirationSeconds = payment.expiresAt
      ? Math.max(
          1,
          Math.ceil(
            (new Date(payment.expiresAt).getTime() - Date.now()) / 1000,
          ),
        )
      : 3600;
    const amount = normalizePaymentAmount(payment.amount);
    const cob = await this.efiPixAdapter.createPix({
      amount: amount.toFixed(2),
      payerName: payment.user.nome,
      payerCpf: payment.user.reg_documento,
      expirationSeconds,
      infoPagar: `Pagamento #${payment.id} - ${payment.purpose}`,
    });

    const finalized = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        userId: payment.userId,
        status: 'PENDING',
        efiLocation: lockToken,
      },
      data: {
        txid: cob.txid,
        // Imagem do QR Code em data URI base64 (renderizável em <img src>).
        qrCodeBase64: cob.qrCodeImage ?? null,
        // BR Code EMV copia-e-cola.
        copyPastePix: cob.pixCopiaECola ?? null,
        // URL de localização da cobrança na EFI.
        efiLocation: cob.location ?? null,
      },
    });

    if (finalized.count !== 1) {
      throw new ConflictException({
        code: 'payment_issuance_in_progress',
        message: 'Não foi possível finalizar a emissão da cobrança PIX.',
      });
    }

    // S18.6/S18.7 — checkout consolidado: espelha o txid nos siblings do
    // bundle (FAST_TRACK_REVIEW via StartupDraft + FAST_DEPLOY via
    // campaignId) para que o webhook localize AMBOS via
    // `findMany({ where: { txid } })` e marque como PAID atomicamente.
    // Também espelha na PaymentOrder (se existir — criada via
    // _createOrderWithItems na Fase 2) para que a source-of-truth do
    // estado fique em sync.
    const siblingWhere: any[] = [
      // Sibling Fast Track vinculado pelo mesmo StartupDraft
      { startupDraftFastTrack: { paymentId: payment.id } },
    ];
    // Sibling Fast Deploy (COMPLIANCE_FEE + FAST_DEPLOY na mesma campanha)
    if (payment.campaignId != null && payment.purpose === 'COMPLIANCE_FEE') {
      siblingWhere.push({
        campaignId: payment.campaignId,
        purpose: 'FAST_DEPLOY',
        id: { not: payment.id },
      });
    }
    await this.prisma.payment.updateMany({
      where: {
        OR: siblingWhere,
        status: 'PENDING',
        userId: payment.userId,
      },
      data: {
        txid: cob.txid,
        copyPastePix: cob.pixCopiaECola ?? null,
        // Mesma QR para ambos os Payments (1 PIX consolidado)
        qrCodeBase64: cob.qrCodeImage ?? null,
      },
    });

    // S18.7 — espelha o txid na PaymentOrder (se existir). A Order é a
    // source-of-truth do estado; sem este espelho, a Order continuaria
    // com txid=null até o webhook disparar. A Order pode ser encontrada
    // via StartupDraft.paymentOrder ou via campaignId + amount (heurística).
    try {
      const order = await this.prisma.paymentOrder.findFirst({
        where: {
          userId: payment.userId,
          status: 'PENDING',
          txid: null,
          OR: [
            { startupDraft: { paymentId: payment.id } },
            ...(payment.campaignId != null
              ? [
                  {
                    campaignId: payment.campaignId,
                    totalAmount: payment.amount,
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      });
      if (order) {
        await this.prisma.paymentOrder.update({
          where: { id: order.id },
          data: { txid: cob.txid },
        });
      }
    } catch (e) {
      // Order não existe (legado pré-S18.7) — segue com Payment legado.
    }

    return ResponseDto.success('PIX gerado com sucesso (EFI)', 200, {
      paymentId: payment.id,
      txid: cob.txid,
      qrCodeBase64: cob.qrCodeImage ?? null,
      copyPastePix: cob.pixCopiaECola ?? null,
      amount: Number(amount.toFixed(2)),
      expiresAt: payment.expiresAt
        ? new Date(payment.expiresAt).toISOString()
        : cob.calendario?.expiracao
          ? new Date(Date.now() + cob.calendario.expiracao * 1000).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(),
      status: payment.status,
    });
  }

  /**
   * Processa webhook de pagamento recebido pela EFI ou simulação.
   * Atualiza status para PAID, registra data de pagamento e, quando o
   * propósito é SUBSCRIPTION, ativa automaticamente a assinatura linkada.
   *
   * Idempotente: se `payment.status === 'PAID'`, retorna imediatamente sem
   * emitir evento novamente (prevê efeitos colaterais duplicados).
   *
   * @param txid Identificador da transação EFI
   * @param endToEndId Identificador end-to-end do BACEN
   */
  async processWebhookPaymentReceived(txid: string, endToEndId: string) {
    try {
      // Busca pelo txid da transação EFI. Um PIX consolidado (ex.: reserva
      // + fast track) pode estar vinculado a 2 Payments que compartilham o
      // mesmo txid — ambos precisam ser marcados PAID e ter os efeitos de
      // domínio aplicados.
      const payments = await this.prisma.payment.findMany({
        where: { txid },
        include: { subscription: true, investment: true },
      });

      // S18.6 — fallback de reconciliação para Payments irmãos do bundle
      // consolidado. 2 tipos de bundle:
      //   - TOKEN_RESERVATION + FAST_TRACK_REVIEW → StartupDraft.fastTrackPaymentId
      //   - COMPLIANCE_FEE + FAST_DEPLOY → mesmo campaignId
      // Para ambos, se o sibling está PENDING e sem txid, espelhamos o txid do
      // webhook para que o loop abaixo marque ambos como PAID atomicamente.
      // Idempotente: webhook duplicado não cria efeitos colaterais.
      let siblingIds: number[] = [];
      if (payments.length > 0) {
        const primaryIds = payments.map((p) => p.id);
        // 1) TOKEN_RESERVATION + FAST_TRACK_REVIEW via StartupDraft
        const fastTrackSiblings = await this.prisma.payment.findMany({
          where: {
            status: 'PENDING',
            txid: null,
            startupDraftFastTrack: {
              paymentId: { in: primaryIds },
            } as any,
          },
          select: { id: true },
        });
        // 2) COMPLIANCE_FEE + FAST_DEPLOY via campaignId. O sibling só é incluído
        // se o primary é COMPLIANCE_FEE (regra S18.7 — a ordem é atômica e o
        // FAST_DEPLOY sempre é secondary do COMPLIANCE_FEE).
        const primaryCampaignIds = payments
          .filter((p) => p.purpose === 'COMPLIANCE_FEE' && p.campaignId != null)
          .map((p) => p.campaignId as number);
        let fastDeploySiblings: { id: number }[] = [];
        if (primaryCampaignIds.length > 0) {
          fastDeploySiblings = await this.prisma.payment.findMany({
            where: {
              status: 'PENDING',
              txid: null,
              purpose: 'FAST_DEPLOY',
              campaignId: { in: primaryCampaignIds },
              id: { notIn: primaryIds },
            },
            select: { id: true },
          });
        }
        // Filtra os primaryIds de ambos os conjuntos (defesa em profundidade
        // para mocks de teste que retornam dados sem filtro).
        const primaryIdSet = new Set(primaryIds);
        siblingIds = [
          ...fastTrackSiblings.map((s) => s.id),
          ...fastDeploySiblings.map((s) => s.id),
        ].filter((id) => !primaryIdSet.has(id));
        // Espelha o txid nos siblings antes de processar (idempotente).
        if (siblingIds.length > 0) {
          await this.prisma.payment.updateMany({
            where: { id: { in: siblingIds } },
            data: { txid },
          });
          this.logger.log(
            `Reconciliação S18.6: ${siblingIds.length} sibling(s) (Fast Track + Fast Deploy) espelhados com txid=${txid}`,
          );
        }
      }

      // Recarrega a lista para incluir os siblings reconciliados.
      const allPayments =
        siblingIds.length > 0
          ? await this.prisma.payment.findMany({
              where: {
                OR: [{ txid }, { id: { in: siblingIds } }],
              },
              include: { subscription: true, investment: true },
            })
          : payments;

      if (allPayments.length === 0) {
        this.logger.warn(`Webhook recebido para txid não encontrado: ${txid}`);
        return ResponseDto.error('Pagamento não encontrado', 404);
      }

      const paidAt = new Date();
      // Tipo explícito: union do Payment "completo" (com subscription/investment
      // relations do findMany) e do Payment "simples" (do findUnique após refresh).
      // O shape retornado no ResponseDto.data é compatível com ambos.
      type UpdatedPayment =
        | (typeof allPayments)[number]
        | Awaited<ReturnType<typeof this.prisma.payment.findUnique>>;
      const updatedPayments: UpdatedPayment[] = [];

      for (const payment of allPayments) {
        // Idempotência ancorada em `effectsAppliedAt`, NÃO em `status === PAID`.
        // Um Payment pode estar PAID mas com efeitos ainda não aplicados (crash
        // entre marcar PAID e processar, ou falha de publish+fallback). Nesse
        // caso, PRECISAMOS reaplicar os efeitos na reentrega — por isso não
        // retornamos cedo só porque está PAID.
        if (payment.status === 'PAID') {
          await this.couponSettlementService.settlePayment(payment.id);
          if (payment.effectsAppliedAt) {
            this.logger.debug(
              `Payment ${payment.id} já PAID e com efeitos aplicados — idempotente`,
            );
            updatedPayments.push(payment);
            continue;
          }
          this.logger.warn(
            `Payment ${payment.id} está PAID mas SEM efeitos aplicados — reprocessando efeitos`,
          );
          await this.dispatchOrApplyEffects(payment.id);
          const refreshed = await this.prisma.payment.findUnique({
            where: { id: payment.id },
          });
          updatedPayments.push(refreshed ?? payment);
          continue;
        }

        const oldValue = { status: payment.status, paidAt: payment.paidAt };

        const transition = await this.prisma.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: {
            status: 'PAID',
            endToEndId,
            paidAt,
          },
        });

        if (transition.count === 0) {
          const current = await this.prisma.payment.findUnique({
            where: { id: payment.id },
          });
          if (current?.status === 'PAID') {
            await this.dispatchOrApplyEffects(current.id);
            updatedPayments.push(current);
            continue;
          }
          this.logger.warn(
            `Payment ${payment.id} não está mais pendente e não pode ser confirmado (txid=${txid})`,
          );
          updatedPayments.push(current ?? payment);
          continue;
        }

        // AuditLog com snapshot antes/depois
        await this.audit.log({
          userId: null,
          action: 'PAYMENT_PAID',
          entity: 'Payment',
          entityId: payment.id,
          oldValue,
          newValue: { status: 'PAID', paidAt, endToEndId },
        });

        // Notificação in-process (observabilidade / listeners não-críticos).
        this.emitPaymentConfirmed({
          id: payment.id,
          userId: payment.userId,
          purpose: payment.purpose,
          status: 'PAID',
          amount: payment.amount,
          subscriptionId: payment.subscriptionId,
          investmentId: payment.investmentId,
          campaignId: payment.campaignId,
          endToEndId,
          txid: payment.txid,
          paidAt,
        });

        this.logger.log(
          `Payment ${payment.id} PAID via webhook (purpose=${payment.purpose}, txid=${txid})`,
        );

        // Caminho normal: publica no RabbitMQ e deixa o consumer aplicar os
        // efeitos de domínio de forma desacoplada, idempotente e com retry/DLQ.
        await this.dispatchOrApplyEffects(payment.id);

        const refreshed = await this.prisma.payment.findUnique({
          where: { id: payment.id },
        });
        updatedPayments.push(refreshed ?? payment);
      }

      // Log consolidado para auditoria de PIX com múltiplos itens.
      if (allPayments.length > 1) {
        this.logger.log(
          `Webhook consolidado: ${allPayments.length} Payments marcados PAID via txid=${txid} ` +
            `(${allPayments.map((p) => p.purpose).join(', ')})`,
        );
      }

      // Mantém compat com o shape anterior:
      //   - 1 Payment PAID + effectsAppliedAt → "Pagamento já processado"
      //   - 1 Payment PAID + effects reaplicados → "Efeitos reprocessados"
      //   - 1+ Payment que acabou de ser marcado PAID → "Pagamento(s) confirmado(s)"
      const allIdempotent =
        allPayments.length === 1 &&
        allPayments[0].status === 'PAID' &&
        allPayments[0].effectsAppliedAt != null;
      const singleReprocessed =
        allPayments.length === 1 &&
        allPayments[0].status === 'PAID' &&
        allPayments[0].effectsAppliedAt == null;
      const message = allIdempotent
        ? 'Pagamento já processado'
        : singleReprocessed
          ? 'Efeitos reprocessados'
          : 'Pagamento(s) confirmado(s)';

      return ResponseDto.success(message, 200, updatedPayments);
    } catch (error) {
      this.logger.error('Erro ao processar webhook', error);
      return ResponseDto.error('Erro ao processar webhook', 500, error);
    }
  }

  /**
   * Finaliza os efeitos de uma ordem liquidada integralmente por cupom.
   *
   * O estado PAID já foi gravado pela transação de cupom; este método nunca
   * cria identificadores EFI e apenas reutiliza o mesmo pipeline idempotente
   * de efeitos e mensageria empregado nas confirmações externas.
   */
  async finalizeCouponIntegralPayment(paymentId: number, userId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }
    if (payment.userId !== userId) {
      throw new ForbiddenException('Pagamento não pertence ao usuário');
    }

    const serviceDetails =
      payment.serviceDetails && typeof payment.serviceDetails === 'object'
        ? (payment.serviceDetails as Record<string, unknown>)
        : {};
    const couponSettlement = serviceDetails.couponSettlement;
    const isCouponIntegralSettlement =
      couponSettlement &&
      typeof couponSettlement === 'object' &&
      (couponSettlement as { type?: unknown }).type === 'COUPON_100';
    const readCouponId = (value: unknown): number | null =>
      typeof value === 'number' && Number.isInteger(value) && value > 0
        ? value
        : null;
    const settlementCouponId =
      couponSettlement && typeof couponSettlement === 'object'
        ? readCouponId((couponSettlement as { couponId?: unknown }).couponId)
        : null;
    const readCouponPercent = (value: unknown): number | null =>
      typeof value === 'number' && Number.isInteger(value) && value >= 0
        ? value
        : null;
    const settlementPercent =
      couponSettlement && typeof couponSettlement === 'object'
        ? readCouponPercent((couponSettlement as { percent?: unknown }).percent)
        : null;
    const couponId =
      settlementCouponId ?? readCouponId(serviceDetails.couponId);
    const appliedPercent =
      settlementPercent ?? readCouponPercent(serviceDetails.percent);
    const couponUsage = couponId
      ? await this.prisma.couponUsage.findUnique({
          where: { couponId_paymentId: { couponId, paymentId } },
        })
      : null;
    const hasValidCouponUsage =
      couponUsage !== null &&
      couponUsage.userId === userId &&
      appliedPercent === 100 &&
      normalizePaymentAmount(couponUsage.originalAmount).gt(0) &&
      normalizePaymentAmount(couponUsage.finalAmount).eq(0);

    if (
      payment.status !== 'PAID' ||
      payment.txid ||
      payment.efiChargeId ||
      payment.efiLocation ||
      !isCouponIntegralSettlement ||
      !hasValidCouponUsage ||
      !normalizePaymentAmount(payment.amount).eq(0)
    ) {
      throw new ConflictException({
        code: 'coupon_payment_not_settled',
        message:
          'O pagamento não está elegível para conclusão por cupom integral.',
      });
    }

    this.emitPaymentConfirmed(payment);

    try {
      await this.processPaymentEffects(payment.id);
    } catch (error) {
      // O pagamento já está confirmado. O consumer e o cron de reconciliação
      // reprocessarão o efeito sem permitir uma segunda liquidação.
      this.logger.error(
        `Falha ao aplicar efeitos do pagamento ${payment.id} por cupom integral`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    try {
      await this.paymentPublisher.publishPaymentConfirmed({
        paymentId: payment.id,
        userId: payment.userId,
        purpose: payment.purpose,
      });
    } catch (error) {
      this.logger.warn(
        `Publish RabbitMQ falhou para payment ${payment.id} por cupom integral: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const refreshed = await this.prisma.payment.findUnique({
      where: { id: payment.id },
    });

    return {
      payment: refreshed ?? payment,
      effectsPending: !refreshed?.effectsAppliedAt,
    };
  }

  /**
   * Despacha os efeitos de um pagamento confirmado.
   *
   * **Sempre aplica efeitos de forma síncrona** (inline) para garantir que
   * `effectsAppliedAt` seja preenchido ANTES do response ao caller. Isso
   * elimina o race condition onde o frontend redireciona antes do consumer
   * RabbitMQ processar os efeitos.
   *
   * A publicação no RabbitMQ é feita de forma paralela (fire-and-forget) para
   * manter observabilidade e retry via consumer, mas NÃO é usada como caminho
   * primário de aplicação de efeitos.
   */
  private async dispatchOrApplyEffects(paymentId: number): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, userId: true, purpose: true },
    });
    if (!payment) return;

    // Aplica efeitos de forma síncrona (garante effectsAppliedAt no response)
    await this.processPaymentEffects(payment.id);

    // Publica no RabbitMQ de forma paralela (fire-and-forget) para
    // observabilidade e retry via consumer. Se falhar, não importa —
    // os efeitos já foram aplicados acima.
    try {
      await this.paymentPublisher.publishPaymentConfirmed({
        paymentId: payment.id,
        userId: payment.userId,
        purpose: payment.purpose,
      });
    } catch (error) {
      this.logger.warn(
        `Publish RabbitMQ falhou para payment ${payment.id} (efeitos já aplicados inline): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Força a sincronização do status de pagamento consultando a EFI.
   *
   * Usado quando o webhook atrasa ou quando o frontend precisa confirmar o
   * status imediatamente após o pagamento. Se o gateway retornar PAID e o
   * nosso DB estiver PENDING, chama internamente `processWebhookPaymentReceived`
   * para manter o mesmo pipeline de ativação de subscription/investment.
   *
   * Regras de acesso:
   * - Dono do pagamento (userId) pode consultar
   * - ADMIN e FINANCEIRO podem consultar qualquer pagamento
   *
   * Retorna estado terminal (PAID/CANCELED) sem consultar gateway.
   *
   * @param paymentId ID do pagamento
   * @param userId ID do usuário requisitante
   * @param userRole Role do usuário requisitante
   */
  async syncPayment(
    paymentId: number,
    userId: number,
    userRole: string,
  ): Promise<{ paymentId: number; status: string; syncedAt: string }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    if (
      payment.userId !== userId &&
      userRole !== 'ADMIN' &&
      userRole !== 'FINANCEIRO'
    ) {
      throw new ForbiddenException('Acesso negado a este pagamento');
    }

    // Estado terminal — não precisa sincronizar
    if (payment.status === 'PAID' || payment.status === 'CANCELED') {
      return {
        paymentId,
        status: payment.status,
        syncedAt: new Date().toISOString(),
      };
    }

    // Consulta o status na EFI quando há txid
    if (payment.txid) {
      try {
        const efiStatus = await this.efiPixAdapter.getPix(payment.txid);
        // EFI PIX status: CONCLUIDA ou QUITADA = pago; ATIVA = pendente
        if (
          (efiStatus.status === 'CONCLUIDA' ||
            efiStatus.status === 'QUITADA') &&
          (payment.status === 'PENDING' || payment.status === 'REFUNDED')
        ) {
          // endToEndId vem no pix[] se houver pagamento
          const endToEndId =
            efiStatus.pix && efiStatus.pix.length > 0
              ? efiStatus.pix[0].horarios.operacao
              : `EFI-${payment.txid}`;
          await this.processWebhookPaymentReceived(payment.txid, endToEndId);
        }
      } catch (error) {
        this.logger.warn(
          `Falha ao consultar EFI para sync do payment ${paymentId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Re-busca após possível sincronização
    const updated = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    return {
      paymentId,
      status: updated!.status,
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * Gera cobrança de cartão de crédito pela EFI.
   * Retorna a URL de pagamento/cobrança para o frontend.
   */
  async generateCardCheckout(
    paymentId: number,
    userId: number,
    input: {
      paymentToken: string;
      installments: number;
      cardMask?: string;
      cardholderDocument?: string;
    },
  ) {
    const lockToken = `__issuing__:${paymentId}:${randomUUID()}`;
    let lockAcquired = false;
    let efiCallStarted = false;

    try {
      const initialPayment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: {
              nome: true,
              email: true,
              reg_documento: true,
              telefone: true,
              data_nascimento: true,
              endereco: true,
              numero: true,
              complemento: true,
              bairro: true,
              cidade: true,
              uf: true,
              cep: true,
            },
          },
        },
      });

      if (!initialPayment) {
        throw new HttpException(
          'Pagamento não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      if (initialPayment.userId !== userId) {
        throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
      }
      if (initialPayment.status !== 'PENDING') {
        throw new HttpException(
          `Pagamento já está com status ${initialPayment.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (normalizePaymentAmount(initialPayment.amount).lte(0)) {
        throw new UnprocessableEntityException({
          code: 'payment_amount_not_positive',
          message:
            'Pagamento sem valor a cobrar não pode gerar uma cobrança no cartão.',
        });
      }

      await this.acquirePaymentIssuanceLock(paymentId, userId, lockToken);
      lockAcquired = true;

      // Rebusca o pagamento depois do CAS para cobrar o valor que pode ter
      // sido atualizado por um cupom antes do lock de emissão.
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: {
              nome: true,
              email: true,
              reg_documento: true,
              telefone: true,
              data_nascimento: true,
              endereco: true,
              numero: true,
              complemento: true,
              bairro: true,
              cidade: true,
              uf: true,
              cep: true,
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('payment_not_found');
      }

      // Parcelamento: a config vigente é a fonte de verdade do backend
      // (CASE.md §Pagamento). O valor cobrado deve refletir o total COM juros
      // compostos quando installments > 1, calculado sobre o `payment.amount`
      // ATUAL — que, neste ponto (após a rebusca pós-lock), já está líquido do
      // cupom. Para 1x não há juros. O snapshot (principal líquido, juros,
      // parcelas, total) é persistido junto da cobrança.
      const principal = Number(normalizePaymentAmount(payment.amount));
      const installmentConfig =
        await this.installmentConfigService.getVigente();
      const interestRate = Number(installmentConfig?.interestRate ?? 0);
      const minInstallmentAmount = Number(
        installmentConfig?.minInstallmentAmount ?? 0,
      );

      const installmentSnapshot =
        this.installmentCalculator.calculateInstallments(
          principal,
          input.installments,
          interestRate,
        );

      // Valida a parcela mínima configurada (apenas quando parcelado).
      if (
        input.installments > 1 &&
        installmentSnapshot.installmentAmount < minInstallmentAmount
      ) {
        throw new UnprocessableEntityException({
          code: 'amount_below_minimum',
          message: `O valor de cada parcela não pode ser menor que R$ ${minInstallmentAmount.toFixed(2)}.`,
        });
      }

      // Valor efetivamente cobrado na EFI: total com juros quando parcelado,
      // principal puro quando à vista (1x).
      const amountToCharge =
        input.installments > 1
          ? new Prisma.Decimal(installmentSnapshot.totalWithInterest)
          : normalizePaymentAmount(payment.amount);

      // Valor em CENTAVOS (a API de cartão da EFI usa inteiros em centavos).
      const valueCents = Number(amountToCharge.mul(100).toFixed(0));

      // EFI exige `customer.cpf` em cobranças one-step (código 3500034
      // `validation_error` quando ausente). Fallback: documento do titular
      // do cartão (validado pela lib payment-token-efi no frontend).
      const cpfFromProfile = payment.user.reg_documento?.replace(/\D/g, '');
      const cpfFromCardholder = input.cardholderDocument?.replace(/\D/g, '');
      const cpf = cpfFromProfile || cpfFromCardholder || undefined;

      // A partir deste ponto a EFI pode ter criado uma cobrança mesmo em caso
      // de timeout de rede; o lock fica preservado para reconciliação segura.
      efiCallStarted = true;
      const result = await this.efiChargeAdapter.createOneStepCard({
        items: [
          {
            name: `Pagamento #${payment.id} - ${payment.purpose}`,
            value: valueCents,
            amount: 1,
          },
        ],
        paymentToken: input.paymentToken,
        installments: input.installments,
        customer: {
          name: payment.user.nome,
          email: payment.user.email,
          ...(cpf && { cpf }),
          // A EFI exige `birth` em cobranças one-step (formato YYYY-MM-DD).
          ...(payment.user.data_nascimento && {
            birth: payment.user.data_nascimento.toISOString().split('T')[0],
          }),
          // A EFI valida o telefone com `^[1-9]{2}9?[0-9]{8}$`. Normalizamos
          // (remove DDI/máscara) e só enviamos se casar; caso contrário o
          // campo opcional é omitido para não derrubar a cobrança.
          ...(() => {
            const phone = normalizeBrazilianPhone(payment.user.telefone);
            return phone ? { phone_number: phone } : {};
          })(),
        },
        // A EFI exige `billing_address` em cobranças one-step. Se o usuário
        // tem endereço completo no perfil, enviamos; senão usamos um fallback
        // mínimo (Efi rejeita com 3500010 "payment_token não existe" quando
        // QUALQUER campo obrigatório do nó payment.credit_card falha).
        ...(payment.user.endereco &&
          payment.user.numero &&
          payment.user.bairro &&
          payment.user.cidade &&
          payment.user.uf &&
          payment.user.cep && {
            billingAddress: {
              street: payment.user.endereco,
              number: payment.user.numero,
              neighborhood: payment.user.bairro,
              zipcode: payment.user.cep.replace(/\D/g, ''),
              city: payment.user.cidade,
              state: payment.user.uf,
              ...(payment.user.complemento && {
                complement: payment.user.complemento,
              }),
            },
          }),
        customId: String(payment.id),
      });

      // Persiste a cobrança apenas se esta requisição ainda possui o lock.
      // IMPORTANTE: o método de pagamento deve ser atualizado para CREDIT_CARD
      // aqui (não só no webhook). Sem isso, Payments criados via wizard com
      // default method='PIX' permaneciam com PIX no banco mesmo após liquidação
      // via cartão — bug que afetava /user/payments e /pending-payments-card.
      const finalized = await this.prisma.payment.updateMany({
        where: {
          id: paymentId,
          userId,
          status: 'PENDING',
          efiLocation: lockToken,
        },
        data: {
          method: 'CREDIT_CARD',
          txid: `EFI-CHARGE-${result.chargeId}`,
          efiChargeId: String(result.chargeId),
          efiLocation: null,
          serviceDetails: {
            ...((payment.serviceDetails as any) || {}),
            ...(input.cardMask && { cardMask: input.cardMask }),
            ...(input.installments > 1 && { installments: input.installments }),
            installmentSnapshot: {
              principal: installmentSnapshot.principal,
              installments: installmentSnapshot.installments,
              interestRate: installmentSnapshot.interestRate,
              installmentAmount: installmentSnapshot.installmentAmount,
              totalInterest: installmentSnapshot.totalInterest,
              totalWithInterest: installmentSnapshot.totalWithInterest,
            },
            cardStatus: result.status,
          },
        },
      });

      if (finalized.count !== 1) {
        throw new ConflictException({
          code: 'payment_issuance_in_progress',
          message: 'Não foi possível finalizar a cobrança no cartão.',
        });
      }

      // Aprovado → dispara o mesmo pipeline do webhook (PAID + payment.confirmed).
      if (result.approved) {
        await this.processWebhookPaymentReceived(
          `EFI-CHARGE-${result.chargeId}`,
          `EFI-CARD-${result.chargeId}`,
        );

        return ResponseDto.success('Pagamento com cartão aprovado', 200, {
          paymentId: payment.id,
          chargeId: result.chargeId,
          status: 'PAID' as const,
          installments: result.installments,
          amount: Number(amountToCharge.toFixed(2)),
        });
      }

      // Recusado → 422 com o motivo retornado pela EFI (sem dados sensíveis).
      throw new UnprocessableEntityException({
        code: 'card_declined',
        message: result.reason || 'Pagamento com cartão não autorizado',
        status: result.status,
      });
    } catch (error) {
      // Após uma tentativa de cartão o lock só é liberado para validações
      // locais conhecidas; a EFI pode ter registrado a cobrança antes de uma
      // falha de rede ou persistência local.
      if (
        lockAcquired &&
        (!efiCallStarted || isKnownEfiPreflightError(error))
      ) {
        await this.releasePaymentIssuanceLock(paymentId, lockToken);
      }

      if (error instanceof HttpException) throw error;
      this.logger.error('Erro ao processar pagamento com cartão', error);
      return ResponseDto.error(
        'Erro ao processar pagamento com cartão',
        500,
        buildErrorDetail(error),
      );
    }
  }

  /**
   * FONTE ÚNICA de efeitos de domínio após um Payment ser confirmado (PAID).
   *
   * Chamado por TODOS os caminhos de confirmação — webhook PIX, cartão,
   * aprovação manual, sync e cron de reconciliação — para eliminar a
   * divergência entre "ativação inline" e "ativação por evento" que existia
   * antes (e que deixava PIX/manual pago-sem-plano).
   *
   * Garantias:
   * - Idempotente: cada efeito verifica o estado atual antes de agir, então
   *   reprocessar (retry/reentrega) não duplica.
   * - Atômico por efeito: cada purpose roda dentro de uma `$transaction`,
   *   evitando estado parcial (ex.: investimento CONFIRMED sem tokensSold).
   * - Ao final, invalida a sessão Redis do usuário para que o gate de rota
   *   releia o plano do banco (sem isso o usuário rebate para /pricing mesmo
   *   com o plano ativo — cache de sessão stale).
   *
   * Nunca lança: erros são logados e engolidos aqui para não derrubar o
   * caller (o Payment já está PAID). A reprocessabilidade fica garantida
   * pela idempotência + reconciliação/retry.
   */
  async processPaymentEffects(paymentId: number): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        userId: true,
        purpose: true,
        status: true,
        campaignId: true,
        effectsAppliedAt: true,
      },
    });
    if (!payment) {
      this.logger.warn(
        `processPaymentEffects: payment ${paymentId} não existe`,
      );
      return;
    }

    if (payment.status !== 'PAID') {
      this.logger.warn(
        `processPaymentEffects: payment ${paymentId} ignorado porque status=${payment.status}`,
      );
      return;
    }

    // Mesmo quando os efeitos de domínio já foram aplicados, a liquidação
    // do cupom precisa ser idempotente para corrigir retries e dados legados.
    await this.couponSettlementService.settlePayment(payment.id);

    if (payment.effectsAppliedAt) {
      this.logger.debug(
        `Payment ${paymentId} já teve efeitos aplicados em ${payment.effectsAppliedAt.toISOString()} — idempotente`,
      );
      // Se a aplicação anterior concluiu os efeitos mas falhou ao atualizar
      // o Redis, uma reentrega do evento deve reparar a sessão sem repetir o
      // efeito de domínio nem exigir novo login do usuário.
      if (payment.purpose === 'SUBSCRIPTION') {
        await this.invalidateUserSession(payment.userId);
      }
      return;
    }

    // Aplica o efeito por purpose. Se lançar, NÃO marca effectsAppliedAt e
    // RELANÇA, para que o caller (consumer) faça retry/DLQ e a reconciliação
    // possa reaplicar — evita marcar como aplicado algo que falhou.
    switch (payment.purpose) {
      case 'SUBSCRIPTION':
        await this.activateSubscriptionForPayment(paymentId);
        break;
      case 'INVESTMENT':
        await this.confirmInvestmentForPayment(paymentId);
        break;
      case 'TOKEN_RESERVATION':
        await this.processTokenReservationPayment(paymentId);
        break;
      case 'TOKEN_RESERVATION_EXTENSION':
        await this.processReservationExtensionPayment(paymentId);
        break;
      case 'FAST_TRACK_REVIEW':
        // O efeito principal (Startup.fastTrackReview=true) é aplicado DENTRO
        // de processTokenReservationPayment — que conhece o StartupDraft
        // compartilhado e cria a Startup. Aqui só registramos auditoria para
        // o caso (raro) em que o FAST_TRACK_REVIEW é processado isoladamente.
        await this.auditFastTrackStandalonePayment(paymentId);
        break;
      case 'FAST_DEPLOY':
        // "Publicação Rápida" — marca a campanha para publicação imediata na
        // aprovação da Fase 3 (em vez do delay padrão de 24h). Idempotente.
        await this.processFastDeployPayment(paymentId, payment.campaignId);
        break;
      default:
        // EARLY_ACCESS / P2P_BUY / VERIFICATION_SEAL ainda não têm efeito
        // de domínio automático — apenas registramos para rastreabilidade.
        this.logger.log(
          `Payment ${paymentId} purpose=${payment.purpose} sem efeito de domínio automático`,
        );
    }

    // Marca os efeitos como aplicados (só chega aqui se nada lançou acima).
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { effectsAppliedAt: new Date() },
    });

    // Invalida a sessão do usuário para refletir o novo plano/estado no gate.
    // Best-effort: não pode derrubar o processamento (efeitos já persistidos).
    await this.invalidateUserSession(payment.userId);
  }

  /**
   * Auditoria standalone para um Payment FAST_TRACK_REVIEW que foi processado
   * sem o TOKEN_RESERVATION companheiro (caso raro — reentrega isolada).
   * O fluxo normal processa Fast Track DENTRO de processTokenReservationPayment,
   * mas este helper cobre a janela em que os 2 Payments já estão PAID e o
   * StartupDraft já está PROCESSED — o `effectsAppliedAt` ainda não foi
   * marcado para o Fast Track porque ele depende da criação da Startup.
   *
   * Apenas registra AuditLog para compliance/admin — o flag na Startup
   * continua sendo responsabilidade do processTokenReservationPayment.
   */
  private async auditFastTrackStandalonePayment(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        userId: true,
        amount: true,
        originalAmount: true,
        discountAmount: true,
        paidAmount: true,
        status: true,
        txid: true,
      },
    });
    if (!payment) return;
    await this.audit.log({
      userId: null,
      action: 'FAST_TRACK_REVIEW_CONFIRMED',
      entity: 'Payment',
      entityId: payment.id,
      oldValue: { status: 'PENDING' },
      newValue: {
        status: 'PAID',
        amount: Number(payment.amount),
        originalAmount: payment.originalAmount
          ? Number(payment.originalAmount)
          : null,
        discountAmount: payment.discountAmount
          ? Number(payment.discountAmount)
          : null,
        paidAmount: payment.paidAmount ? Number(payment.paidAmount) : null,
        txid: payment.txid,
      },
    });
  }

  /**
   * Efeito de "Publicação Rápida" (FAST_DEPLOY PAID): marca
   * `campaign.fastDeploy=true` para que `openCampaignOnApproval` publique a
   * startup imediatamente na aprovação da Fase 3 (sem o delay de 24h).
   * Idempotente: no-op se a campanha já estiver com `fastDeploy=true`.
   */
  private async processFastDeployPayment(
    paymentId: number,
    campaignId: number | null,
  ): Promise<void> {
    if (!campaignId) {
      this.logger.warn(
        `processFastDeployPayment: payment ${paymentId} sem campaignId — nada a aplicar`,
      );
      return;
    }
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, fastDeploy: true },
    });
    if (!campaign) {
      this.logger.warn(
        `processFastDeployPayment: campanha ${campaignId} não existe (payment ${paymentId})`,
      );
      return;
    }
    if (campaign.fastDeploy) {
      this.logger.debug(
        `processFastDeployPayment: campanha ${campaignId} já com fastDeploy=true — idempotente`,
      );
      return;
    }
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { fastDeploy: true },
    });
    await this.audit.log({
      userId: null,
      action: 'FAST_DEPLOY_CONFIRMED',
      entity: 'Campaign',
      entityId: campaignId,
      oldValue: { fastDeploy: false },
      newValue: { fastDeploy: true },
    });
    this.logger.log(
      `Campanha ${campaignId}: fastDeploy=true aplicado (payment FAST_DEPLOY ${paymentId}).`,
    );
  }

  /**
   * Efeitos de CANCELAMENTO de um Payment (ex.: expirou, admin cancelou).
   * Hoje: cancela a Subscription vinculada quando purpose=SUBSCRIPTION.
   * Idempotente: no-op se já CANCELED. Invalida a sessão ao final.
   */
  async processPaymentCancelledEffects(paymentId: number): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        userId: true,
        purpose: true,
        subscriptionId: true,
        investmentId: true,
        campaignId: true,
      },
    });
    if (!payment) {
      this.logger.warn(
        `processPaymentCancelledEffects: payment ${paymentId} não existe`,
      );
      return;
    }

    // Cancelamento não apaga CouponUsage. Apenas reconcilia o contador
    // confirmado para liberar qualquer reserva legada sem tocar no histórico.
    await this.couponSettlementService.reconcilePayment(paymentId);

    // "Publicação Rápida" cancelada/estornada: reverte a flag na campanha para
    // que a publicação volte ao delay padrão de 24h (idempotente). Não altera
    // campanha já publicada (OPEN) — a flag só é lida na aprovação da Fase 3.
    if (payment.purpose === 'FAST_DEPLOY' && payment.campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: payment.campaignId },
        select: { id: true, fastDeploy: true },
      });
      if (campaign?.fastDeploy) {
        await this.prisma.campaign.update({
          where: { id: payment.campaignId },
          data: { fastDeploy: false },
        });
        await this.audit.log({
          userId: null,
          action: 'FAST_DEPLOY_REVERTED',
          entity: 'Campaign',
          entityId: payment.campaignId,
          oldValue: { fastDeploy: true },
          newValue: { fastDeploy: false },
        });
        this.logger.log(
          `Campanha ${payment.campaignId}: fastDeploy revertido para false (payment ${paymentId} cancelado/estornado).`,
        );
      }
    }

    if (payment.purpose === 'SUBSCRIPTION' && payment.subscriptionId) {
      await this.prisma.$transaction(async (tx) => {
        const sub = await tx.subscription.findUnique({
          where: { id: payment.subscriptionId! },
          select: { status: true },
        });
        if (!sub || sub.status === 'CANCELED') return;
        await tx.subscription.update({
          where: { id: payment.subscriptionId! },
          data: { status: 'CANCELED' },
        });
        this.logger.log(
          `Subscription ${payment.subscriptionId} cancelada (payment ${paymentId})`,
        );
      });
    }

    if (payment.purpose === 'INVESTMENT' && payment.investmentId) {
      await this.investmentsService.cancelInvestment(
        payment.investmentId,
        payment.userId,
        'Pagamento expirado ou cancelado',
      );
    }

    await this.invalidateUserSession(payment.userId);
  }

  /**
   * Emite `payment.confirmed` no shape aninhado exigido por
   * `PaymentConfirmedEvent`. É apenas notificação (best-effort) — os efeitos
   * de domínio são aplicados por `processPaymentEffects`, não por este evento.
   */
  emitPaymentConfirmed(payment: {
    id: number;
    userId: number;
    purpose: string;
    status: string;
    amount: unknown;
    subscriptionId: number | null;
    investmentId: number | null;
    campaignId: number | null;
    endToEndId: string | null;
    txid: string | null;
    paidAt: Date | null;
  }): void {
    const event: PaymentConfirmedEvent = {
      paymentId: payment.id,
      payment: {
        id: payment.id,
        userId: payment.userId,
        purpose: payment.purpose,
        status: payment.status,
        amount: payment.amount,
        subscriptionId: payment.subscriptionId,
        investmentId: payment.investmentId,
        campaignId: payment.campaignId,
        endToEndId: payment.endToEndId,
        txid: payment.txid,
        paidAt: payment.paidAt,
      },
    };
    this.eventEmitter.emit(PaymentEvents.CONFIRMED, event);
  }

  /**
   * Emite `payment.cancelled` no shape aninhado. Usado pelo cron de
   * expiração para que a Subscription vinculada a um Payment cancelado
   * seja revertida (listener em SubscriptionsService).
   */
  emitPaymentCancelled(
    payment: {
      id: number;
      userId: number;
      purpose: string;
      status: string;
      amount: unknown;
      subscriptionId: number | null;
      investmentId: number | null;
      campaignId: number | null;
      endToEndId: string | null;
      txid: string | null;
      paidAt: Date | null;
    },
    reason?: string,
  ): void {
    const event: PaymentCancelledEvent = {
      paymentId: payment.id,
      payment: {
        id: payment.id,
        userId: payment.userId,
        purpose: payment.purpose,
        status: payment.status,
        amount: payment.amount,
        subscriptionId: payment.subscriptionId,
        investmentId: payment.investmentId,
        campaignId: payment.campaignId,
        endToEndId: payment.endToEndId,
        txid: payment.txid,
        paidAt: payment.paidAt,
      },
      reason,
    };
    this.eventEmitter.emit(PaymentEvents.CANCELLED, event);
  }

  /**
   * Invalida as sessões Redis do usuário para forçar o gate de rota a reler
   * o plano/estado do banco no próximo request. Best-effort: falha aqui não
   * pode derrubar a confirmação do pagamento.
   *
   * IMPORTANTE (Sprint S34-b — bug "paguei mas continua informando que
   * não comprei"): o shape enviado ao Redis DEVE casar com o que
   * `normalizeSubscription()` em `src/auth/session/public-payload.ts`
   * produz — caso contrário, campos como `preco` ficam `'0'` no payload
   * da sessão e o frontend renderiza valores quebrados.
   */
  private async invalidateUserSession(userId: number): Promise<void> {
    try {
      // Busca as assinaturas frescas do banco e as projeta no MESMO shape do
      // payload de sessão (public-payload.normalizeSubscription), para que o
      // gate (applySessionFilters) veja o plano recém-ativado.
      // NOTA: select inclui TODOS os campos que normalizeSubscription espera.
      const subs = await this.prisma.subscription.findMany({
        where: { userId },
        include: {
          plan: {
            select: {
              id: true,
              nome: true,
              slug: true,
              descricao: true,
              preco: true,
              periodoMeses: true,
              periodo: true,
            },
          },
        },
      });
      const projected = subs.map((s) => ({
        id: s.id,
        userId: s.userId,
        planId: s.planId,
        status: s.status,
        startedAt: s.startedAt ?? null,
        expiresAt: s.expiresAt ?? null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        plan: s.plan
          ? {
              id: s.plan.id,
              nome: s.plan.nome,
              slug: s.plan.slug,
              descricao: s.plan.descricao ?? null,
              preco: s.plan.preco == null ? '0' : String(s.plan.preco),
              periodoMeses: s.plan.periodoMeses ?? 1,
              periodo: s.plan.periodo ?? '',
            }
          : {
              id: s.planId,
              nome: '',
              slug: '',
              descricao: null,
              preco: '0',
              periodoMeses: 1,
              periodo: '',
            },
      }));

      const count = await this.sessionService.refreshUserSubscriptions(
        userId,
        projected,
      );
      this.logger.log(
        `Sessões atualizadas para user ${userId} pós-pagamento (count=${count}, subs=${projected.length})`,
      );
    } catch (error) {
      // Log estruturado (não warn genérico) para facilitar triagem de
      // cache stale em produção. Falha aqui significa que o próximo
      // request do user verá subscriptions desatualizadas até o TTL do
      // Redis expirar (7d) ou o user refazer login.
      this.logger.error({
        msg: 'Falha ao atualizar sessão do user pós-pagamento',
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Ativa a Subscription linkada quando o Payment é confirmado.
   * - Só age quando `payment.purpose === "SUBSCRIPTION"` e há `subscriptionId`.
   * - Idempotente: se a Subscription já está ACTIVE, registra log e segue.
   * - Calcula `expiresAt` a partir de `plan.periodoMeses`.
   * - Transacional: relê o status DENTRO da transação e só ativa se ainda
   *   não estiver ACTIVE (evita corrida entre caminhos concorrentes).
   */
  private async activateSubscriptionForPayment(
    paymentId: number,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!payment || payment.purpose !== 'SUBSCRIPTION') return;
    if (!payment.subscription) {
      this.logger.warn(
        `Payment ${paymentId} é SUBSCRIPTION mas não tem subscription linkada`,
      );
      return;
    }

    const subscriptionId = payment.subscription.id;
    const periodoMeses = payment.subscription.plan.periodoMeses;

    await this.prisma.$transaction(async (tx) => {
      // Relê dentro da transação para idempotência sob concorrência.
      const current = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        select: { status: true },
      });
      if (!current || current.status === 'ACTIVE') {
        return;
      }

      const startedAt = new Date();
      const expiresAt = new Date(startedAt);
      expiresAt.setMonth(expiresAt.getMonth() + periodoMeses);

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'ACTIVE', startedAt, expiresAt },
      });

      this.logger.log(
        `Subscription ${subscriptionId} ativada (válida até ${expiresAt.toISOString()})`,
      );
    });
  }

  /**
   * Efetiva o investimento linkado quando o Payment é confirmado.
   * - Só age quando `payment.purpose === "INVESTMENT"` e há `investmentId`.
   * - Delega ao InvestmentsService, que marca CONFIRMED, incrementa
   *   tokensSold e emite os tokens dentro de uma transação.
   * - Idempotente: reprocessar um investimento já CONFIRMED é no-op.
   */
  private async confirmInvestmentForPayment(paymentId: number): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { purpose: true, investmentId: true, userId: true },
    });
    if (!payment || payment.purpose !== 'INVESTMENT' || !payment.investmentId) {
      return;
    }

    await this.investmentsService.confirmInvestment(
      payment.investmentId,
      payment.userId,
    );
  }

  /**
   * Processa pagamento TOKEN_RESERVATION: busca StartupDraft e cria Startup.
   * Se o payment tem campaignId (fluxo legado), confirma reserva.
   * Se tem StartupDraft associado, cria a Startup a partir do payload.
   */
  private async processTokenReservationPayment(
    paymentId: number,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { purpose: true, campaignId: true, id: true },
    });
    if (!payment || payment.purpose !== 'TOKEN_RESERVATION') {
      return;
    }

    // Fluxo legado: campaignId vinculado diretamente
    if (payment.campaignId) {
      await this.prisma.campaign.update({
        where: { id: payment.campaignId },
        data: { reservationFeePaid: true, status: 'OPEN' },
      });
      return;
    }

    // Novo fluxo: busca StartupDraft pelo paymentId. O select traz também
    // `fastTrackPaymentId` para que possamos marcar Startup.fastTrackReview
    // quando o founder contratou o serviço adicional (S18.6).
    const draft = await this.prisma.startupDraft.findUnique({
      where: { paymentId },
      select: {
        id: true,
        founderId: true,
        status: true,
        payload: true,
        fastTrackPaymentId: true,
      },
    });

    if (!draft || draft.status !== 'PENDING_PAYMENT') {
      return;
    }

    // Marcar como PROCESSING
    try {
      await this.prisma.startupDraft.update({
        where: { id: draft.id, status: 'PENDING_PAYMENT' },
        data: { status: 'PROCESSING' },
      });
    } catch {
      return; // Outro processo já pegou
    }

    try {
      const payload = draft.payload as Record<string, any>;
      const cnpjLimpo = String(payload.cnpj || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      const uniqueSlug = await this.generateUniqueStartupSlug(
        payload.nomeFantasia,
      );

      // Leitura do upload FORA da transação (não muda estado).
      let uploadData: {
        originalName: string;
        size: number;
        mimeType: string;
        extension: string;
        url: string;
        url_sm: string | null;
        url_md: string | null;
        url_lg: string | null;
      } | null = null;
      if (payload.logoFileId) {
        const upload = await this.prisma.upload.findFirst({
          where: {
            id: payload.logoFileId,
            userId: draft.founderId,
            type: 'image',
          },
        });
        if (upload) {
          const variants = (upload.variants as any) || {};
          const publicUrl = upload.url || '';
          uploadData = {
            originalName: upload.originalName || 'logo',
            size: upload.size || 0,
            mimeType: upload.mimeType || 'image/png',
            extension: upload.extension || 'png',
            url: publicUrl,
            url_sm: variants.sm?.url || publicUrl || null,
            url_md: variants.md?.url || publicUrl || null,
            url_lg: variants.lg?.url || publicUrl || null,
          };
        }
      }

      const pitchDeckUpload = payload.pitchDeckFileId
        ? await this.prisma.upload.findFirst({
            where: {
              id: payload.pitchDeckFileId,
              userId: draft.founderId,
              type: 'document',
              bucket: 'document',
            },
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              size: true,
              key: true,
            },
          })
        : null;

      if (payload.pitchDeckFileId && !pitchDeckUpload?.key) {
        throw new Error(
          'Pitch Deck não encontrado ou não pertence ao fundador.',
        );
      }

      // ----- Cálculos financeiros para a Campaign DRAFT (S01.2b/ADR-008) -----
      // `metaCaptacao`/`equityOferecido` vieram do wizard e já foram validados
      // em `createStartupCheckout` (equity entre fundraising.equityMin/Max,
      // meta entre fundraising.minCampaign/Max). Aqui derivamos o restante
      // a partir de fundraising.tokenPrice (preço BASE) — espelha a fórmula do
      // `computeRoundMetrics` no frontend (new-startup-wizard.metrics.ts).
      //
      // Modelo B (split venda/base):
      //   tokenBaseValue  = metaCaptacao / totalTokens (~ fundraising.tokenPrice)
      //                     → quanto a startup recebe por token no repasse
      //   tokenSellPrice  = fundraising.tokenSalePrice → preço cobrado do
      //                     investidor no checkout
      //   platformFee     = fundraising.platformFee → alíquota cobrada por
      //                     cima do subtotal de tokens no checkout
      const financialConfigs =
        await this.systemConfigService.getFinancialConfigs();
      const [tokenBaseValueCfg, tokenSellPriceCfg, platformFeePct] =
        await Promise.all([
          this.configService.getEffective('fundraising.tokenPrice'),
          this.configService.getEffective('fundraising.tokenSalePrice'),
          this.configService.getEffective('fundraising.platformFee'),
        ]);
      const metaCaptacao = payload.metaCaptacao;
      const equityOferecido = payload.equityOferecido;
      // valuation (pré-money) = metaCaptacao * 100 / equityPercent.
      const valuationCalc =
        equityOferecido > 0
          ? Math.round((metaCaptacao * 100 * 100) / equityOferecido) / 100
          : 0;
      // tokens = ceil(metaCaptacao / preço base). Se config inválida
      // (<=0) caímos em 1 token mínimo para não quebrar a criação.
      const totalTokens =
        tokenBaseValueCfg > 0 ? Math.ceil(metaCaptacao / tokenBaseValueCfg) : 1;
      // Snapshots financeiros — o preço de venda vem do config vigente
      // (definido pelo admin em /admin/config); o valor base é derivado
      // da meta/tokens para preservar repasse total = meta captada.
      const snapshots = CampaignFinancialHelper.computeFinancialSnapshots(
        { targetAmount: metaCaptacao, totalTokens },
        financialConfigs,
        {
          tokenSellPrice:
            tokenSellPriceCfg > 0
              ? tokenSellPriceCfg
              : metaCaptacao / totalTokens,
          platformFeePct:
            Number.isFinite(platformFeePct) && platformFeePct >= 0
              ? platformFeePct
              : 0,
        },
      );
      const minInvestment =
        Math.max(100, Math.round(metaCaptacao * 0.001 * 100) / 100) || 100;
      // Deadline padrão: 90 dias (replicável via prorrogação).
      const deadlineDefault = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      // Escritas ATÔMICAS: KYCProfile (logo) + Startup + Campaign (DRAFT) +
      // StartupDocument (pitch deck) + draft PROCESSED. Se qualquer passo
      // falhar, rollback total — sem Startup/Campaign/KYC órfãos.
      const createdStartupId = await this.prisma.$transaction(async (tx) => {
        let logoKycId: number | null = null;
        if (uploadData) {
          const kycProfile = await tx.kYCProfile.create({
            data: {
              originalName: uploadData.originalName,
              size: uploadData.size,
              mineType: uploadData.mimeType,
              extension: uploadData.extension,
              url: uploadData.url,
              url_sm: uploadData.url_sm,
              url_md: uploadData.url_md,
              url_lg: uploadData.url_lg,
              status: 'APPROVED',
            },
          });
          logoKycId = kycProfile.id;
        }

        // S18.6 — se o draft tem fastTrackPaymentId vinculado, o founder contratou
        // o Fast Track Review. Marca a Startup para priorização na fila do
        // compliance (e exibe na listagem admin).
        const fastTrackContracted = Boolean(draft.fastTrackPaymentId);
        const fastTrackReviewedAt = fastTrackContracted ? new Date() : null;

        // CASE.md §[Taxonomia] — multi-área: aceita `areaAtuacaoIds`
        // (plural, contrato vigente) com fallback para `areaAtuacaoId`
        // (singular, legado). Persiste a lista completa na coluna JSON
        // `areas_atuacao` e a primeira área na coluna legacy `areaAtuacaoId`
        // (mantida para consumidores que ainda não migraram).
        const resolvedAreaIdsForCreate: number[] = Array.isArray(
          payload.areaAtuacaoIds,
        )
          ? (payload.areaAtuacaoIds as unknown[]).filter(
              (id): id is number =>
                typeof id === 'number' &&
                Number.isInteger(id) &&
                (id as number) >= 1,
            )
          : typeof payload.areaAtuacaoId === 'number' &&
              Number.isInteger(payload.areaAtuacaoId) &&
              (payload.areaAtuacaoId as number) >= 1
            ? [payload.areaAtuacaoId]
            : [];
        const primaryAreaId = resolvedAreaIdsForCreate[0] ?? null;

        const startup = await tx.startup.create({
          data: {
            founderId: draft.founderId,
            nome: payload.nomeFantasia || payload.razaoSocial,
            razao_social: payload.razaoSocial,
            cnpj: cnpjLimpo,
            slug: uniqueSlug,
            categoryId: payload.categoryId || undefined,
            areaAtuacaoId: primaryAreaId ?? undefined,
            areas_atuacao:
              resolvedAreaIdsForCreate.length > 0
                ? resolvedAreaIdsForCreate
                : undefined,
            // S18.6 — fallback defensivo: se por algum motivo o wizard
            // enviou sem estagio (ex.: rascunho legado, bug de UI), grava
            // 'ideacao' como padrão inicial em vez de persistir null/''.
            // O frontend sempre envia o valor (validado por zod.enum), mas
            // este fallback cobre o caso de dados antigos/legados que ainda
            // possam estar em StartupDraft.payload sem o campo.
            estagio: payload.estagio || 'ideacao',
            descricao: payload.descricao || '',
            youtube_url: payload.videoPitch || null,
            redes_sociais: {
              website: payload.website || null,
              linkedin: payload.linkedin || null,
              instagram: null,
              twitter: null,
            },
            banco: payload.banco || null,
            agencia: payload.agencia || null,
            conta: payload.conta || null,
            digito: payload.digito || null,
            titular: payload.titular || null,
            tipo_conta: payload.tipoConta || null,
            pix_key: payload.chavePix || null,
            documento_titular: payload.documentoTitular || null,
            site: payload.website || null,
            telefone: null,
            email: null,
            descritivo_basico: payload.descricao || '',
            data_fundacao: payload.dataAbertura
              ? payload.dataAbertura.length === 4
                ? new Date(`${payload.dataAbertura}-01-01`)
                : new Date(payload.dataAbertura)
              : null,
            pais: payload.paisIso3 ? { iso3: payload.paisIso3 } : undefined,
            logo_id: logoKycId,
            status: 'PENDING_CURATOR_REVIEW',
            fastTrackReview: fastTrackContracted,
            fastTrackReviewedAt,
          },
        });

        // Campaign DRAFT (reserva já paga). Fica em rascunho até o founder
        // preencher as abas de captação (recursos/tese/governança/retornos) e
        // o admin promover para OPEN. Sem essa Campaign, o loader
        // /founder/startups/:id/captacao não tem dados para exibir.
        const campaign = await tx.campaign.create({
          data: {
            startupId: startup.id,
            title: payload.nomeFantasia || payload.razaoSocial || 'Rodada 1',
            targetAmount: metaCaptacao as any,
            minInvestment: minInvestment as any,
            valuation: valuationCalc as any,
            tokenPrice: snapshots.tokenSellPrice as any,
            totalTokens,
            tokensSold: 0,
            deadline: deadlineDefault,
            status: 'DRAFT',
            reservationFeePaid: true,
            // Snapshots financeiros (ADR-008)
            adminFeeValue: snapshots.adminFeeValue as any,
            tokenBaseValue: snapshots.tokenBaseValue as any,
            tokenSellPrice: snapshots.tokenSellPrice as any,
            tokenMintingCost: snapshots.tokenMintingCost as any,
          },
        });

        // S18.6 — vincula a Campaign aos Payments do checkout consolidado
        // (TOKEN_RESERVATION + FAST_TRACK_REVIEW) para que a tela
        // /founder/startups/:id/captacao exiba o breakdown dos pagamentos
        // cobrados. Sem isso, o include via Campaign.payments retornaria
        // vazio e o fundador/admin não veriam nada.
        await tx.payment.updateMany({
          where: {
            id: {
              in: [paymentId, draft.fastTrackPaymentId].filter(
                Boolean,
              ) as number[],
            },
          },
          data: { campaignId: campaign.id },
        });

        if (pitchDeckUpload?.key) {
          await tx.startupDocument.create({
            data: {
              startupId: startup.id,
              categoria: 'PITCH_DECK',
              nome: pitchDeckUpload.originalName || 'pitch-deck.pdf',
              s3Key: pitchDeckUpload.key,
              mimetype: pitchDeckUpload.mimeType || 'application/pdf',
              sizeBytes: pitchDeckUpload.size || 0,
              uploadedById: draft.founderId,
            },
          });
        }

        await tx.startupDraft.update({
          where: { id: draft.id },
          data: { status: 'PROCESSED' },
        });

        return startup.id;
      });

      this.logger.log(
        `StartupDraft ${draft.id} processado com sucesso (payment ${paymentId})`,
      );

      // S1-T09/alinhamento — dispara notificações do fluxo:
      // (1) pagamento da reserva confirmado; (2) Etapa 1 concluída.
      // Best-effort: emissão de evento não deve quebrar o processamento.
      if (createdStartupId) {
        this.eventEmitter.emit('startup.payment.confirmed', {
          startupId: createdStartupId,
          purpose: 'TOKEN_RESERVATION',
        });
        this.eventEmitter.emit('startup.stage1.completed', {
          startupId: createdStartupId,
        });
      }
    } catch (error) {
      await this.prisma.startupDraft.update({
        where: { id: draft.id },
        data: { status: 'FAILED' },
      });
      this.logger.error(`Falha ao processar StartupDraft ${draft.id}:`, error);
    }
  }

  /**
   * Efeito do pagamento da reserva ADICIONAL (prorrogação — PRD_RECEBIMENTO
   * §6.3). Quando o Payment TOKEN_RESERVATION_EXTENSION é confirmado (PAID):
   *  - soma o adicional à meta da campanha (targetAmount) e os tokens da
   *    reserva (totalTokens += tokenReserve);
   *  - REATIVA a campanha (status OPEN) pelo novo período;
   *  - marca a CampaignExtension como REACTIVATED.
   * Idempotente: se a extensão já estiver REACTIVATED, é no-op.
   */
  private async processReservationExtensionPayment(
    paymentId: number,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, purpose: true, campaignId: true },
    });
    if (!payment || payment.purpose !== 'TOKEN_RESERVATION_EXTENSION') {
      return;
    }

    const ext = await this.prisma.campaignExtension.findUnique({
      where: { paymentId },
      select: {
        id: true,
        campaignId: true,
        additionalAmount: true,
        tokenReserve: true,
        periodDays: true,
        status: true,
      },
    });
    if (!ext) {
      this.logger.warn(
        `processReservationExtensionPayment: sem CampaignExtension para payment ${paymentId}`,
      );
      return;
    }
    if (ext.status === 'REACTIVATED') {
      return; // idempotente
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: ext.campaignId },
      select: { targetAmount: true, totalTokens: true },
    });
    if (!campaign) {
      this.logger.error(
        `processReservationExtensionPayment: campanha ${ext.campaignId} não existe`,
      );
      return;
    }

    const novaMeta =
      Number(campaign.targetAmount) + Number(ext.additionalAmount);
    const novoTotalTokens = campaign.totalTokens + ext.tokenReserve;
    // Novo prazo de captação definido pelo período da prorrogação
    // (periodDays — definido pelo Compliance). deadline = agora + N dias.
    const novoDeadline = new Date(
      Date.now() + ext.periodDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      // Reativa a campanha somando meta + tokens da reserva adicional e
      // aplicando o novo prazo (deadline) do período de prorrogação.
      await tx.campaign.update({
        where: { id: ext.campaignId },
        data: {
          targetAmount: novaMeta,
          totalTokens: novoTotalTokens,
          deadline: novoDeadline,
          status: 'OPEN',
        },
      });
      await tx.campaignExtension.update({
        where: { id: ext.id },
        data: { status: 'REACTIVATED' },
      });
    });

    this.logger.log(
      `Prorrogação aplicada: campanha ${ext.campaignId} reativada (OPEN), meta=${novaMeta}, +${ext.tokenReserve} tokens, novo prazo=${novoDeadline.toISOString()} (+${ext.periodDays}d) (payment ${paymentId})`,
    );
  }

  /**
   * Dev-only: marca um Payment como PAID disparando o mesmo path do webhook
   * (`processWebhookPaymentReceived`), o que inclui ativar a Subscription
   * linkada quando `purpose === 'SUBSCRIPTION'`. Útil pra testar fluxo
   * fim-a-fim em local/staging sem precisar do C6 real.
   *
   * Gate: retorna 403 se `NODE_ENV === 'production'`.
   * Ownership: só o dono do Payment pode simular.
   * Idempotente: se já estiver PAID, retorna o estado atual sem alterar nada.
   */
  async simulatePaid(paymentId: number, userId: number) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException(
        'Simulação de pagamento desabilitada em produção',
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new HttpException(
          'Pagamento não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      if (payment.userId !== userId) {
        throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
      }
      if (payment.status === 'PAID') {
        return ResponseDto.success('Pagamento já estava PAID', 200, payment);
      }
      if (payment.status !== 'PENDING') {
        throw new HttpException(
          `Pagamento está com status ${payment.status} (esperado PENDING)`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Reusa o mesmo pipeline do webhook (lookup por txid). Se o Payment
      // ainda não passou pelo /pix ou /card, não tem txid — preenche um synth.
      let txid = payment.txid;
      if (!txid) {
        txid = `DEV-SIM-${payment.id}-${Date.now()}`;
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { txid },
        });
      }

      const endToEndId = `DEV-SIM-${randomUUID()}`;
      this.logger.warn(
        `Simulando PAID para Payment ${paymentId} (txid=${txid}) — NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}`,
      );

      return await this.processWebhookPaymentReceived(txid, endToEndId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Erro ao simular pagamento PAID', error);
      return ResponseDto.error('Erro ao simular pagamento', 500, error);
    }
  }

  /**
   * Aprovação manual pelo painel financeiro (FINANCEIRO/ADMIN). Marca o
   * Payment como PAID com justificativa e referência ao comprovante já
   * uploadado para o bucket `comprovante` do AWS S3. Reusa o pipeline do
   * webhook (`processWebhookPaymentReceived`) pra que a ativação da
   * Subscription siga as mesmas regras.
   *
   * Regras:
   * - Só atua em Payments status PENDING (idempotente: PAID → no-op).
   * - Gera txid synth (`MANUAL-<id>-<ts>`) quando o Payment ainda não
   *   passou por PIX/cartão.
   * - Grava `manualApprovedBy/At/Justification/ComprovanteKey` antes de
   *   chamar o pipeline pra que esses campos fiquem persistidos junto.
   * - Audit log com `action: 'PAYMENT_APPROVE_MANUAL'`, snapshot do
   *   estado antes/depois.
   */
  async approveManually(
    paymentId: number,
    actorUserId: number,
    justification: string,
    comprovanteKey: string,
    request?: Request,
  ) {
    if (!justification || justification.trim().length < 10) {
      throw new HttpException(
        'Justificativa é obrigatória e deve ter ao menos 10 caracteres',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!comprovanteKey) {
      throw new HttpException(
        'Comprovante é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new HttpException('Pagamento não encontrado', HttpStatus.NOT_FOUND);
    }
    if (payment.status === 'PAID') {
      return ResponseDto.success('Pagamento já estava PAID', 200, payment);
    }
    if (payment.status !== 'PENDING') {
      throw new HttpException(
        `Pagamento está com status ${payment.status} (esperado PENDING)`,
        HttpStatus.BAD_REQUEST,
      );
    }

    let txid = payment.txid;
    if (!txid) {
      txid = `MANUAL-${payment.id}-${Date.now()}`;
    }

    const oldValue = {
      status: payment.status,
      txid: payment.txid,
      paidAt: payment.paidAt,
      manualApprovedById: payment.manualApprovedById,
    };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        txid,
        manualApprovedById: actorUserId,
        manualApprovedAt: new Date(),
        manualJustification: justification.trim(),
        manualComprovanteKey: comprovanteKey,
      },
    });

    this.logger.warn(
      `Aprovação manual de Payment ${paymentId} por user ${actorUserId} (txid=${txid})`,
    );

    const endToEndId = `MANUAL-${randomUUID()}`;
    const result = await this.processWebhookPaymentReceived(txid, endToEndId);

    await this.audit.log({
      userId: actorUserId,
      action: 'PAYMENT_APPROVE_MANUAL',
      entity: 'Payment',
      entityId: payment.id,
      oldValue,
      newValue: {
        status: 'PAID',
        txid,
        manualJustification: justification.trim(),
        manualComprovanteKey: comprovanteKey,
        endToEndId,
      },
      request,
    });

    return result;
  }

  /**
   * Cancelamento manual pelo painel financeiro. Aceita Payments com status
   * PENDING (não pago ainda) ou PAID (revogação retroativa). Para PAID,
   * a operação não toca em Subscription — o cancelamento de assinatura
   * fica em `subscriptionsService.cancelByAdmin` (endpoint separado).
   *
   * Idempotente: CANCELED → no-op.
   */
  async cancelByAdmin(
    paymentId: number,
    actorUserId: number,
    justification: string,
    request?: Request,
  ) {
    if (!justification || justification.trim().length < 10) {
      throw new HttpException(
        'Justificativa é obrigatória e deve ter ao menos 10 caracteres',
        HttpStatus.BAD_REQUEST,
      );
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new HttpException('Pagamento não encontrado', HttpStatus.NOT_FOUND);
    }
    if (payment.status === 'CANCELED') {
      return ResponseDto.success('Pagamento já estava CANCELED', 200, payment);
    }
    if (payment.status === 'REFUNDED') {
      throw new HttpException(
        'Pagamento já está REFUNDED — não pode ser cancelado',
        HttpStatus.BAD_REQUEST,
      );
    }

    const oldValue = {
      status: payment.status,
      paidAt: payment.paidAt,
      manualJustification: payment.manualJustification,
    };

    // INVESTMENT pago = estorno TOTAL (regra: não existe estorno parcial).
    // refundInvestment reverte investment (REFUNDED), devolve tokens ao
    // estoque, remove tokens emitidos e cancela a comissão de afiliado —
    // tudo dentro de transação idempotente.
    if (payment.purpose === 'INVESTMENT' && payment.status === 'PAID') {
      if (payment.investmentId) {
        await this.investmentsService.refundInvestment(
          payment.investmentId,
          actorUserId,
          justification.trim(),
        );
      }
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          manualJustification: justification.trim(),
        },
      });

      await this.audit.log({
        userId: actorUserId,
        action: 'PAYMENT_REFUND',
        entity: 'Payment',
        entityId: payment.id,
        oldValue,
        newValue: {
          status: 'REFUNDED',
          manualJustification: justification.trim(),
        },
        request,
      });

      this.logger.warn(
        `Payment ${paymentId} (INVESTMENT) estornado por user ${actorUserId}`,
      );

      return ResponseDto.success(
        'Pagamento estornado (investimento revertido integralmente)',
        200,
        updated,
      );
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CANCELED',
        manualJustification: justification.trim(),
      },
    });

    await this.audit.log({
      userId: actorUserId,
      action: 'PAYMENT_CANCEL',
      entity: 'Payment',
      entityId: payment.id,
      oldValue,
      newValue: {
        status: 'CANCELED',
        manualJustification: justification.trim(),
      },
      request,
    });

    this.logger.warn(
      `Payment ${paymentId} cancelado por user ${actorUserId} (status anterior: ${payment.status})`,
    );

    if (payment.status === 'PENDING') {
      await this.processPaymentCancelledEffects(payment.id);
    }

    return ResponseDto.success('Pagamento cancelado', 200, updated);
  }

  /**
   * P3.1 — método `remove` removido (era stub — retornava string).
   * Para cancelar pagamento, usar `update(id, { status: 'CANCELED' }, ...)`
   * ou o endpoint admin-financeiro de cancelamento explícito.
   *
   * Checkout unificado: cria Payment PENDING + gera PIX ou checkout de cartão
   * em uma única chamada.
   *
   * Validações:
   * - purpose=VERIFICATION_SEAL só pode ser criado por ADMIN/COMPLIANCE
   * - purpose=SUBSCRIPTION requer subscriptionId
   * - purpose=INVESTMENT requer investmentId
   * - purpose=TOKEN_RESERVATION requer campaignId
   * - installments (1..18) é obrigatório para CREDIT_CARD e proibido para PIX
   */
  async createCheckout(
    dto: CreateCheckoutDto,
    userId: number,
    userRole: string,
  ): Promise<{
    paymentId: number;
    method: 'PIX' | 'CREDIT_CARD';
    qrCodeBase64?: string;
    copyPastePix?: string;
    expiresAt?: string;
    txid?: string;
    checkoutUrl?: string;
    checkoutId?: string;
  }> {
    // 1. purpose + role: VERIFICATION_SEAL só ADMIN/COMPLIANCE
    if (
      dto.purpose === 'VERIFICATION_SEAL' &&
      userRole !== 'ADMIN' &&
      userRole !== 'COMPLIANCE'
    ) {
      throw new ForbiddenException('purpose_not_allowed');
    }

    // 2. purpose + metadata obrigatórios
    if (dto.purpose === 'SUBSCRIPTION' && !dto.subscriptionId) {
      throw new UnprocessableEntityException({
        code: 'invalid_purpose_combination',
        message: 'SUBSCRIPTION requires subscriptionId',
      });
    }
    if (dto.purpose === 'INVESTMENT' && !dto.investmentId) {
      throw new UnprocessableEntityException({
        code: 'invalid_purpose_combination',
        message: 'INVESTMENT requires investmentId',
      });
    }
    if (dto.purpose === 'TOKEN_RESERVATION' && !dto.campaignId) {
      throw new UnprocessableEntityException({
        code: 'invalid_purpose_combination',
        message: 'TOKEN_RESERVATION requires campaignId',
      });
    }

    await this.validatePaymentReferences(dto, userId);

    // 3. installments: obrigatório para CREDIT_CARD, proibido para PIX
    if (dto.method === 'CREDIT_CARD') {
      if (!dto.installments || dto.installments < 1) {
        throw new UnprocessableEntityException({
          code: 'installments_out_of_range',
          message: 'installments must be >= 1',
        });
      }
      if (dto.installments > 18) {
        throw new UnprocessableEntityException({
          code: 'installments_out_of_range',
          message: 'installments must be <= 18',
        });
      }
    } else if (dto.installments) {
      throw new BadRequestException(
        'installments only allowed for CREDIT_CARD',
      );
    }

    // 4. INSERT Payment (status=PENDING)
    //
    // INVESTMENT: o valor cobrado NÃO vem do cliente — é o totalCharged do
    // split persistido no Investment (subtotal de tokens + taxa da
    // plataforma). dto.amount é ignorado para evitar divergência/tampering.
    let amount = dto.amount;
    if (dto.purpose === 'INVESTMENT' && dto.investmentId) {
      const investment = await this.prisma.investment.findUnique({
        where: { id: dto.investmentId },
        select: {
          tokenSubtotal: true,
          platformFeeAmount: true,
          amount: true,
        },
      });
      if (!investment) {
        throw new UnprocessableEntityException({
          code: 'invalid_purpose_combination',
          message: 'INVESTMENT requires an existing investmentId',
        });
      }
      amount =
        investment.tokenSubtotal != null
          ? Number(investment.tokenSubtotal) +
            Number(investment.platformFeeAmount ?? 0)
          : Number(investment.amount);
    }

    const expiresIn = dto.expiresIn ?? 1800;
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        purpose: dto.purpose,
        method: dto.method,
        amount,
        status: 'PENDING',
        subscriptionId: dto.subscriptionId ?? null,
        investmentId: dto.investmentId ?? null,
        campaignId: dto.campaignId ?? null,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    // 5. Gera QR PIX ou checkout de cartão
    if (dto.method === 'PIX') {
      return this.generateCheckoutPix(payment.id, userId, expiresIn);
    } else {
      return this.generateCheckoutCard(payment.id, userId, dto.installments!);
    }
  }

  /**
   * Helper: envolve generatePix e reordena o retorno para o shape do checkout.
   */
  private async generateCheckoutPix(
    paymentId: number,
    userId: number,
    expiresIn: number,
  ) {
    const result = await this.generatePix(paymentId, userId);
    const data = (result as any).data;
    return {
      paymentId,
      method: 'PIX' as const,
      qrCodeBase64: data.qrCodeBase64,
      copyPastePix: data.copyPastePix ?? data.pixCopiaECola,
      expiresAt:
        data.expiresAt?.toString?.() ??
        new Date(Date.now() + expiresIn * 1000).toISOString(),
      txid: data.txid,
    };
  }

  /**
   * Helper: envolve generateCardCheckout e reordena o retorno para o shape do checkout.
   * Calcula parcelamento e persiste snapshot em serviceDetails.
   */
  private async generateCheckoutCard(
    paymentId: number,
    userId: number,
    installments: number,
  ) {
    // Buscar config vigente
    const config = await this.installmentConfigService.getVigente();
    const interestRate = config?.interestRate ?? 0;
    const minInstallment = config?.minInstallmentAmount ?? 0;

    // Buscar Payment atual para ter o amount
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Calcular parcelamento
    const snapshot = this.installmentCalculator.calculateInstallments(
      Number(payment.amount),
      installments,
      Number(interestRate),
    );

    // Validar parcela minima
    if (
      snapshot.installmentAmount < Number(minInstallment) &&
      installments > 1
    ) {
      throw new UnprocessableEntityException({
        code: 'amount_below_minimum',
        message: `Parcela minima e R$ ${minInstallment}`,
      });
    }

    // Persistir snapshot em Payment.serviceDetails
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        serviceDetails: {
          ...((payment.serviceDetails as any) || {}),
          installmentSnapshot: snapshot,
        },
      },
    });

    // A cobrança de cartão só é criada quando o frontend envia o payment_token
    // (via POST /payment/:id/card). Aqui apenas retornamos o Payment PENDING
    // com o snapshot de parcelamento; o frontend tokeniza e confirma em seguida.
    return {
      paymentId,
      method: 'CREDIT_CARD' as const,
      installments,
      totalWithInterest: snapshot.totalWithInterest,
      installmentAmount: snapshot.installmentAmount,
    };
  }

  /**
   * Simula as opções de parcelamento de cartão para um Payment PENDING.
   *
   * Fonte de verdade do backend (CASE.md §Pagamento): calcula sobre o
   * `payment.amount` ATUAL (já líquido de cupom) usando a config vigente
   * (taxa mensal de juros compostos, máximo de parcelas e valor mínimo da
   * parcela). O checkout apenas apresenta estes valores — nunca recalcula
   * juros localmente.
   *
   * Cada opção devolve o valor da parcela, o total com juros, o total de
   * juros, a taxa aplicada e `belowMinimum` (true quando a parcela fica
   * abaixo do mínimo configurado e `n > 1`), para o frontend desabilitar a
   * opção.
   */
  async simulateInstallments(paymentId: number, userId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, userId: true, status: true, amount: true },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }
    if (payment.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }
    if (payment.status !== 'PENDING') {
      throw new UnprocessableEntityException({
        code: 'payment_not_pending',
        message:
          'O parcelamento só pode ser simulado enquanto o pagamento estiver pendente.',
      });
    }

    const principal = Number(normalizePaymentAmount(payment.amount));
    if (principal <= 0) {
      throw new UnprocessableEntityException({
        code: 'payment_amount_not_positive',
        message: 'Pagamento sem valor a cobrar não pode ser parcelado.',
      });
    }

    const config = await this.installmentConfigService.getVigente();
    const interestRate = Number(config?.interestRate ?? 0);
    const maxInstallments = Number(config?.maxInstallments ?? 1);
    const minInstallmentAmount = Number(config?.minInstallmentAmount ?? 0);

    const options: Array<{
      installments: number;
      installmentAmount: number;
      totalWithInterest: number;
      totalInterest: number;
      interestRate: number;
      belowMinimum: boolean;
    }> = [];
    for (let n = 1; n <= maxInstallments; n += 1) {
      const snapshot = this.installmentCalculator.calculateInstallments(
        principal,
        n,
        interestRate,
      );
      const belowMinimum =
        n > 1 && snapshot.installmentAmount < minInstallmentAmount;
      options.push({
        installments: n,
        installmentAmount: snapshot.installmentAmount,
        totalWithInterest: snapshot.totalWithInterest,
        totalInterest: snapshot.totalInterest,
        interestRate: snapshot.interestRate,
        belowMinimum,
      });
    }

    return ResponseDto.success('Simulação de parcelamento', 200, {
      paymentId: payment.id,
      principal,
      interestRate,
      maxInstallments,
      minInstallmentAmount,
      options,
    });
  }
}
