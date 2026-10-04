import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/api/notifications/notifications.service';
import { NotificationType } from 'src/api/notifications/dto/query-notifications.dto';
import { buildMultilineDescription } from 'src/api/notifications/description.helpers';
import { EmailQueuePublisher } from 'src/messaging/email-queue.publisher';
import { EmailQueueMessage } from 'src/messaging/email-queue.constants';

/**
 * UserNotificationService — central de notificações do usuário (Sprint 2026-10-04).
 *
 * Complementa o `StartupNotificationService` cobrindo eventos do fluxo do
 * USUÁRIO (não da startup):
 *
 *  - `payment.confirmed` (purpose=INVESTMENT)   → in-app + e-mail de compra de tokens
 *  - `payment.confirmed` (purpose=SUBSCRIPTION) → in-app + e-mail (1ª compra vs adicional)
 *  - `user.activated`   (admin ativa)           → in-app + e-mail
 *  - `user.suspended`   (admin desativa)        → in-app + e-mail
 *  - `kyc.user.decided` (decision=APPROVED)     → in-app + e-mail
 *
 * Regra (CASE.md [Notificações] — central de notificações):
 *  - Toda notificação disparada é acompanhada por e-mail.
 *  - In-app PRIMEIRO (await), e-mail DEPOIS (entra na fila RabbitMQ `emails`).
 *  - Descrições com múltiplas linhas via `buildMultilineDescription`.
 *  - LGPD: nunca loga CPF, e-mail ou telefone em texto livre.
 */
@Injectable()
export class UserNotificationService {
  private readonly logger = new Logger(UserNotificationService.name);

  /** Fallback usado quando o nome do user não está disponível. */
  private static readonly USER_NAME_FALLBACK = 'usuário(a)';

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailQueue: EmailQueuePublisher,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────

  /**
   * Cria in-app + enfileira e-mail na fila. Helper central para garantir a
   * ordem: `in-app` (sync, persistido) ANTES do `dispatch` (async, fila).
   */
  private async emit(
    userId: number,
    userEmail: string | null,
    title: string,
    description: string,
    type: NotificationType,
    emailSlug: string,
    emailCtx: Record<string, unknown>,
    origin: string,
  ): Promise<void> {
    await this.notifications.create(userId, title, description, type);
    if (userEmail) {
      const msg: Omit<EmailQueueMessage, 'publishedAt'> = {
        to: userEmail,
        slug: emailSlug,
        ctx: emailCtx,
        origin,
      };
      // Não propagamos falha da fila: o publisher já tem fallback SMTP inline.
      void this.emailQueue.publishSend(msg).catch((err) => {
        this.logger.error(
          `Falha inesperada no dispatch de e-mail slug=${emailSlug}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
    }
  }

  // ─── Compra de tokens (purpose=INVESTMENT) ──────────────────────

  /**
   * payment.confirmed → purpose=INVESTMENT
   *
   * Notifica o investidor sobre a compra confirmada, incluindo o nome da
   * startup alvo.
   */
  @OnEvent('payment.confirmed')
  async onTokenPurchaseConfirmed(payload: {
    paymentId: number;
    payment: {
      id: number;
      userId: number;
      purpose: string;
      amount: unknown;
      investmentId: number | null;
      campaignId: number | null;
    };
  }): Promise<void> {
    const p = payload?.payment;
    if (!p || p.purpose !== 'INVESTMENT' || !p.investmentId) return;

    try {
      const [user, investment] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: p.userId },
          select: { id: true, nome: true, email: true },
        }),
        this.prisma.investment.findUnique({
          where: { id: p.investmentId },
          select: {
            tokensQty: true,
            amount: true,
            campaign: {
              select: {
                id: true,
                title: true,
                startup: { select: { id: true, nome: true } },
              },
            },
          },
        }),
      ]);

      if (!user || !investment) {
        this.logger.warn(
          `[user-notification] token purchase: user=${p.userId} ou investment=${p.investmentId} não encontrado`,
        );
        return;
      }

      const startupName =
        investment.campaign?.startup?.nome ??
        investment.campaign?.title ??
        'startup';
      const tokensQty = Math.max(0, Number(investment.tokensQty));
      const totalAmount = `R$ ${Number(investment.amount).toLocaleString(
        'pt-BR',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      )}`;

      await this.emit(
        user.id,
        user.email,
        'Compra de tokens confirmada',
        buildMultilineDescription(
          `Sua compra de ${tokensQty} tokens da startup ${startupName} foi confirmada com sucesso.`,
          `Valor total: ${totalAmount}.`,
          'Os tokens já estão disponíveis na sua carteira.',
        ),
        NotificationType.TOKEN_PURCHASED,
        'compra-tokens',
        {
          userName: user.nome ?? UserNotificationService.USER_NAME_FALLBACK,
          startupName,
          quantity: tokensQty,
          totalAmount,
          campaignTitle: investment.campaign?.title ?? null,
        },
        `investment:${p.id}`,
      );
    } catch (err) {
      this.logger.error(
        `[user-notification] onTokenPurchaseConfirmed falhou paymentId=${p.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ─── Compra de perfil (purpose=SUBSCRIPTION) ───────────────────

  /**
   * payment.confirmed → purpose=SUBSCRIPTION
   *
   * Detecta se o user já tinha outra assinatura ACTIVE antes desta nova
   * entrar em vigor. Se sim, é um "perfil adicional" (label de UX para
   * "perfil a adquirir") — o e-mail reforça que o perfil anterior continua
   * ativo. Caso contrário, é a 1ª assinatura.
   *
   * Idempotência: usa o `subscriptionId` do payload (Payment.subscriptionId)
   * para excluir a si próprio da contagem.
   */
  @OnEvent('payment.confirmed')
  async onPlanPaymentConfirmed(payload: {
    paymentId: number;
    payment: {
      id: number;
      userId: number;
      purpose: string;
      subscriptionId: number | null;
    };
  }): Promise<void> {
    const p = payload?.payment;
    if (!p || p.purpose !== 'SUBSCRIPTION' || !p.subscriptionId) return;

    try {
      const [user, subscription] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: p.userId },
          select: { id: true, nome: true, email: true },
        }),
        this.prisma.subscription.findUnique({
          where: { id: p.subscriptionId },
          select: {
            id: true,
            status: true,
            plan: { select: { id: true, nome: true, slug: true } },
          },
        }),
      ]);

      if (!user || !subscription) {
        this.logger.warn(
          `[user-notification] plan purchase: user=${p.userId} ou subscription=${p.subscriptionId} não encontrado`,
        );
        return;
      }

      // Conta quantas outras subscriptions ACTIVE o user tem (excluindo esta).
      const otherActiveCount = await this.prisma.subscription.count({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          NOT: { id: subscription.id },
        },
      });

      const isAdditional = otherActiveCount > 0;
      const planName = subscription.plan?.nome ?? 'seu plano';

      if (isAdditional) {
        // Descobre o nome do plano anterior (a primeira ACTIVE que não é esta).
        const previousSub = await this.prisma.subscription.findFirst({
          where: {
            userId: user.id,
            status: 'ACTIVE',
            NOT: { id: subscription.id },
          },
          orderBy: { createdAt: 'asc' },
          select: { plan: { select: { nome: true } } },
        });
        const previousPlanName =
          previousSub?.plan?.nome ?? 'seu plano anterior';
        const totalActiveProfiles = otherActiveCount + 1;

        await this.emit(
          user.id,
          user.email,
          'Perfil adicional ativado',
          buildMultilineDescription(
            `Você adicionou o perfil ${planName} à sua conta.`,
            `Seu perfil anterior (${previousPlanName}) continua ativo normalmente.`,
            `Agora você tem ${totalActiveProfiles} perfis ativos.`,
          ),
          NotificationType.PLAN_ADDED,
          'plan-added',
          {
            userName: user.nome ?? UserNotificationService.USER_NAME_FALLBACK,
            planName,
            previousPlanName,
            totalActiveProfiles,
          },
          `subscription:${p.id}:additional`,
        );
      } else {
        await this.emit(
          user.id,
          user.email,
          'Novo perfil ativado',
          buildMultilineDescription(
            `Bem-vindo ao perfil ${planName}!`,
            'Agora você tem acesso aos recursos do plano na plataforma.',
            'Explore o dashboard para começar.',
          ),
          NotificationType.PLAN_PURCHASED,
          'plan-purchased',
          {
            userName: user.nome ?? UserNotificationService.USER_NAME_FALLBACK,
            planName,
          },
          `subscription:${p.id}:first`,
        );
      }
    } catch (err) {
      this.logger.error(
        `[user-notification] onPlanPaymentConfirmed falhou paymentId=${p.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ─── Admin ativa / desativa usuário ─────────────────────────────

  @OnEvent('user.activated')
  async onUserActivated(payload: {
    userId: number;
    email?: string;
    nome?: string;
  }): Promise<void> {
    if (!payload?.userId) return;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, nome: true, email: true },
      });
      if (!user) return;
      await this.emit(
        user.id,
        user.email,
        'Conta aprovada',
        buildMultilineDescription(
          'Sua conta na iSelfToken foi aprovada pelo nosso time administrativo.',
          'Você já pode acessar todos os recursos da plataforma.',
        ),
        NotificationType.USER_APPROVED,
        'user-approved',
        { userName: user.nome ?? UserNotificationService.USER_NAME_FALLBACK },
        `user:${user.id}:activated`,
      );
    } catch (err) {
      this.logger.error(
        `[user-notification] onUserActivated falhou userId=${payload.userId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  @OnEvent('user.suspended')
  async onUserSuspended(payload: {
    userId: number;
    email?: string;
    nome?: string;
    reason?: string;
  }): Promise<void> {
    if (!payload?.userId) return;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, nome: true, email: true },
      });
      if (!user) return;
      const reason =
        payload.reason?.trim() || 'Contate o suporte para mais detalhes.';
      await this.emit(
        user.id,
        user.email,
        'Conta suspensa',
        buildMultilineDescription(
          'Sua conta na iSelfToken foi suspensa pelo time administrativo.',
          `Motivo: ${reason}`,
          'Caso acredite que houve um engano, entre em contato com o suporte.',
        ),
        NotificationType.USER_SUSPENDED,
        'user-suspended',
        {
          userName: user.nome ?? UserNotificationService.USER_NAME_FALLBACK,
          reason,
        },
        `user:${user.id}:suspended`,
      );
    } catch (err) {
      this.logger.error(
        `[user-notification] onUserSuspended falhou userId=${payload.userId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ─── KYC aprovado ──────────────────────────────────────────────

  /**
   * kyc.user.decided → decision=APPROVED
   *
   * Antes o `KycEvents.USER_DECIDED` apenas fazia relay WebSocket (sem
   * persistir notificação in-app nem e-mail). Agora criamos ambos via
   * `UserNotificationService`.
   *
   * REJECTED e NEEDS_RESUBMISSION continuam tratados pelo AdminService
   * (que cria notification + e-mail `kyc-resubmission-requested`).
   */
  @OnEvent('kyc.user.decided')
  async onKycApproved(payload: {
    userId: number;
    decision: string;
    kycStatus: string;
  }): Promise<void> {
    if (!payload?.userId) return;
    if (payload.decision !== 'APPROVED') return;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, nome: true, email: true },
      });
      if (!user) return;
      await this.emit(
        user.id,
        user.email,
        'KYC aprovado',
        buildMultilineDescription(
          'Seu processo de KYC (Know Your Customer) foi aprovado.',
          'Agora você já pode investir em startups e comprar tokens.',
        ),
        NotificationType.KYC_APPROVED,
        'kyc-approved',
        { userName: user.nome ?? UserNotificationService.USER_NAME_FALLBACK },
        `kyc:${user.id}:approved`,
      );
    } catch (err) {
      this.logger.error(
        `[user-notification] onKycApproved falhou userId=${payload.userId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
