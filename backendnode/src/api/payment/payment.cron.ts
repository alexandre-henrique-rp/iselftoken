import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuditService } from 'src/common/audit/audit.service';
import { FeatureFlagsService } from 'src/common/feature-flags/feature-flags.service';
import { PaymentPublisher } from 'src/messaging/payment.publisher';
import { PrismaService } from 'src/prisma/prisma.service';
import { EfiPixAdapter } from './efi/adapters/efi-pix.adapter';
import { PaymentService } from './payment.service';

// Folga antes de a reconciliação de PAID-sem-efeito agir, para não competir
// com o processamento normal (publish→consumer) que acabou de marcar PAID.
const EFFECTS_GRACE_MS = 2 * 60 * 1000; // 2 minutos
const STARTUP_CHECKOUT_EXPIRATION_MS = 60 * 60 * 1000; // 1 hora

/**
 * Cron de reconciliação de Payments — expira o que alcançou `Payment.expiresAt`.
 * Antes de cancelar, consulta o EFI (se flag EFI_ENABLED=true). Se confirmado,
 * reconcilia via `processWebhookPaymentReceived`; se a consulta falhar, mantém
 * PENDING para uma nova tentativa. Cada cancelamento gera AuditLog e libera
 * a reserva vinculada ao investimento.
 *
 * Frequência: a cada 15 minutos (cron expression).
 */
@Injectable()
export class PaymentCronService {
  private readonly logger = new Logger(PaymentCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly paymentService: PaymentService,
    private readonly efiPixAdapter: EfiPixAdapter,
    private readonly auditLog: AuditService,
    private readonly paymentPublisher: PaymentPublisher,
  ) {}

  /**
   * Expira payments PENDING cujo `expiresAt` já foi atingido, com
   * reconciliação smart via EFI. A transição é condicional para blindar
   * corrida com webhook.
   */
  @Cron('*/15 * * * *', { name: 'expire-pending-payments' })
  async expirePendingPayments(): Promise<{
    expired: number;
    reconciled: number;
  }> {
    const now = new Date();
    const legacyExpirationCutoff = new Date(
      now.getTime() - STARTUP_CHECKOUT_EXPIRATION_MS,
    );
    const expirationFilter = {
      OR: [
        { expiresAt: { lte: now } },
        {
          purpose: 'TOKEN_RESERVATION' as const,
          expiresAt: null,
          createdAt: { lte: legacyExpirationCutoff },
        },
      ],
    };

    const candidates = await this.prisma.payment.findMany({
      where: {
        status: 'PENDING',
        ...expirationFilter,
      },
      take: 100,
    });

    let expired = 0;
    let reconciled = 0;

    const results = await Promise.allSettled(
      candidates.map((payment) =>
        this.processPaymentCandidate(payment, expirationFilter, now),
      ),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        expired += result.value.expired;
        reconciled += result.value.reconciled;
      }
    }

    this.logger.log(
      `Cron expirePendingPayments: expired=${expired} reconciled=${reconciled}`,
    );
    return { expired, reconciled };
  }

  /**
   * Processa 1 candidato a expiração. Extraído do loop sequencial original
   * para permitir paralelização via Promise.allSettled (Fase 4 — Performance).
   *
   * Cada candidato é independente (chamada EFI + updateMany condicional).
   * Falha em um candidato não afeta os outros — erro é logado e descartado.
   */
  private async processPaymentCandidate(
    payment: {
      id: number;
      txid: string | null;
      purpose: string;
      userId: number;
      amount: { toString(): string };
      subscriptionId: number | null;
      investmentId: number | null;
      campaignId: number | null;
      endToEndId: string | null;
      paidAt: Date | null;
      [key: string]: unknown;
    },
    expirationFilter: Record<string, unknown>,
    now: Date,
  ): Promise<{ expired: number; reconciled: number }> {
    try {
      let efiCheckFailed = false;
      // Smart reconciliation: consultar EFI antes de cancelar
      if (payment.txid && this.featureFlags.efiEnabled) {
        try {
          const efiStatus = await this.efiPixAdapter.getPix(payment.txid);
          if (
            efiStatus.status === 'QUITADA' ||
            efiStatus.status === 'CONCLUIDA'
          ) {
            const endToEndId =
              efiStatus.pix?.[0]?.horarios?.operacao ?? `EFI-${payment.txid}`;
            await this.paymentService.processWebhookPaymentReceived(
              payment.txid,
              endToEndId,
            );
            this.logger.log(
              `Cron: Payment ${payment.id} reconciliado via EFI (txid=${payment.txid})`,
            );
            return { expired: 0, reconciled: 1 };
          }
        } catch (efiErr) {
          this.logger.warn(
            `Cron: EFI.getPix falhou para txid=${payment.txid}; mantendo PENDING para nova reconciliação: ${efiErr instanceof Error ? efiErr.message : String(efiErr)}`,
          );
          efiCheckFailed = true;
        }
      }

      if (efiCheckFailed) {
        return { expired: 0, reconciled: 0 };
      }

      // Distinção de status na expiração (fluxo_startup §1 / SPEC §16.2):
      //  - Checkout de startup (TOKEN_RESERVATION): vai para EXPIRED e o
      //    rascunho é PRESERVADO (founder retoma via "Gerar Novo Pagamento").
      //  - Demais fluxos (SUBSCRIPTION/INVESTMENT/...): mantêm CANCELED +
      //    efeitos de cancelamento (comportamento existente, sem regressão).
      const isStartupCheckout = payment.purpose === 'TOKEN_RESERVATION';
      const targetStatus: 'EXPIRED' | 'CANCELED' = isStartupCheckout
        ? 'EXPIRED'
        : 'CANCELED';

      // Transição condicional (blinda corrida com webhook).
      const transition = await this.prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: 'PENDING',
          ...expirationFilter,
        },
        data: { status: targetStatus, updatedAt: now },
      });
      if (transition.count === 0) {
        // Webhook ou outro worker ganhou a corrida.
        return { expired: 0, reconciled: 0 };
      }
      const canceled = {
        ...payment,
        status: targetStatus,
        updatedAt: now,
      };

      // Rascunho: só é removido no CANCELED de fluxos não-startup. No EXPIRED
      // de TOKEN_RESERVATION, o rascunho/startup é PRESERVADO para retomada.
      if (!isStartupCheckout) {
        const removedDraft = await this.prisma.startupDraft.deleteMany({
          where: { paymentId: canceled.id as number },
        });
        if (removedDraft.count > 0) {
          this.logger.log(
            `Cron: StartupDraft temporário removido para payment ${canceled.id}`,
          );
        }
      }

      await this.auditLog.log({
        userId: null,
        action: isStartupCheckout ? 'PAYMENT_EXPIRED' : 'PAYMENT_CANCELED',
        entity: 'Payment',
        entityId: canceled.id as number,
        oldValue: { status: 'PENDING' },
        newValue: { status: targetStatus },
      });

      // Efeitos de cancelamento (reverter Subscription, etc.) só se aplicam
      // ao caminho CANCELED. TOKEN_RESERVATION expirado não tem
      // subscription/investment vinculados — nada a reverter.
      if (!isStartupCheckout) {
        this.paymentService.emitPaymentCancelled(
          {
            id: canceled.id as number,
            userId: canceled.userId as number,
            purpose: canceled.purpose as
              | 'TOKEN_RESERVATION'
              | 'SUBSCRIPTION'
              | 'INVESTMENT'
              | 'EARLY_ACCESS'
              | 'P2P_BUY'
              | 'VERIFICATION_SEAL',
            status: canceled.status as 'EXPIRED' | 'CANCELED',
            amount: canceled.amount as unknown as string,
            subscriptionId: canceled.subscriptionId as number | null,
            investmentId: canceled.investmentId as number | null,
            campaignId: canceled.campaignId as number | null,
            endToEndId: canceled.endToEndId as string | null,
            txid: canceled.txid as string | null,
            paidAt: canceled.paidAt as Date | null,
          },
          'Pagamento expirado (Payment.expiresAt atingido)',
        );

        const publishedCancel =
          await this.paymentPublisher.publishPaymentCancelled({
            paymentId: canceled.id as number,
            userId: canceled.userId as number,
            purpose: canceled.purpose as
              | 'TOKEN_RESERVATION'
              | 'SUBSCRIPTION'
              | 'INVESTMENT'
              | 'EARLY_ACCESS'
              | 'P2P_BUY'
              | 'VERIFICATION_SEAL',
            reason: 'Pagamento expirado (Payment.expiresAt atingido)',
          });
        if (!publishedCancel) {
          await this.paymentService.processPaymentCancelledEffects(
            canceled.id as number,
          );
        }
      }

      this.logger.warn(
        `Cron: Payment ${canceled.id} ${targetStatus} (expiresAt atingido, purpose=${canceled.purpose})`,
      );
      return { expired: 1, reconciled: 0 };
    } catch (err) {
      this.logger.error(
        `Cron: Erro processando payment ${payment.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { expired: 0, reconciled: 0 };
    }
  }

  /**
   * Reconciliação de PAGO-SEM-EFEITO: recupera Payments que estão PAID mas
   * cujos efeitos de domínio (ativar plano/investimento/reserva) NUNCA foram
   * aplicados — situação possível se o processo cair entre marcar PAID e
   * processar, ou se publish + fallback falharem.
   *
   * Ancorado em `effectsAppliedAt = null` (não em status), com uma folga de
   * tempo (`EFFECTS_GRACE_MS`) para não competir com o processamento normal
   * que acabou de marcar PAID. `processPaymentEffects` é idempotente.
   *
   * Roda a cada 5 minutos — este é o backstop que garante que nenhum
   * pagamento confirmado fique sem efeito.
   */
  @Cron('*/5 * * * *', { name: 'reconcile-paid-without-effects' })
  async reconcilePaidWithoutEffects(): Promise<{ recovered: number }> {
    const grace = new Date(Date.now() - EFFECTS_GRACE_MS);

    const candidates = await this.prisma.payment.findMany({
      where: {
        status: 'PAID',
        effectsAppliedAt: null,
        paidAt: { lt: grace },
      },
      take: 100,
      orderBy: { paidAt: 'asc' },
    });

    let recovered = 0;
    for (const payment of candidates) {
      try {
        await this.paymentService.processPaymentEffects(payment.id);
        recovered++;
        this.logger.warn(
          `Cron: efeitos reaplicados para payment ${payment.id} (PAID sem efeito)`,
        );
      } catch (err) {
        this.logger.error(
          `Cron: falha ao reaplicar efeitos do payment ${payment.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (recovered > 0) {
      this.logger.log(
        `Cron reconcilePaidWithoutEffects: recovered=${recovered}`,
      );
    }
    return { recovered };
  }
}
