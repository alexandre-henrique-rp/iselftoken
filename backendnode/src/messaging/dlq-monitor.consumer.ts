import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from 'src/common/audit/audit.service';
import {
  EFI_WEBHOOK_DLQ,
  PAYMENTS_DLX,
  PAYMENT_EFFECTS_DLQ,
} from './messaging.constants';

/**
 * Monitor das Dead-Letter Queues de pagamento.
 *
 * Uma mensagem numa DLQ é um evento de pagamento que falhou em todas as
 * tentativas de processamento — potencialmente um PAGAMENTO CONFIRMADO cujo
 * efeito (ativar plano/investimento) não foi aplicado. Não pode ficar
 * invisível. Este consumer:
 *  - registra um AuditLog com ação `PAYMENT_DLQ` (rastreável, retenção);
 *  - loga em nível ERROR (para disparar alerta no Sentry/observabilidade);
 *  - dá ACK (retorna void) para RETER a mensagem apenas no AuditLog, evitando
 *    acúmulo infinito na DLQ. O payload fica no AuditLog para replay manual.
 *
 * RUNBOOK de replay (manual):
 *  1. Localizar o AuditLog `PAYMENT_DLQ` com o `paymentId`.
 *  2. Verificar o estado do Payment (status/effectsAppliedAt) no banco.
 *  3. Reprocessar via `PaymentService.processPaymentEffects(paymentId)`
 *     (idempotente) — ex.: através de um endpoint admin ou script.
 *  O cron `reconcilePaidWithoutEffects` também recupera automaticamente
 *  Payments PAID sem efeito, então na maioria dos casos a DLQ é só sinal.
 */
@Injectable()
export class DlqMonitorConsumer {
  private readonly logger = new Logger(DlqMonitorConsumer.name);

  constructor(private readonly audit: AuditService) {}

  @RabbitSubscribe({
    exchange: PAYMENTS_DLX,
    routingKey: PAYMENT_EFFECTS_DLQ,
    queue: PAYMENT_EFFECTS_DLQ,
    createQueueIfNotExists: false,
    allowNonJsonMessages: true,
  })
  async onEffectsDlq(msg: any): Promise<void> {
    await this.alert('payments.effects.dlq', msg);
  }

  @RabbitSubscribe({
    exchange: PAYMENTS_DLX,
    routingKey: EFI_WEBHOOK_DLQ,
    queue: EFI_WEBHOOK_DLQ,
    createQueueIfNotExists: false,
    allowNonJsonMessages: true,
  })
  async onWebhookDlq(msg: any): Promise<void> {
    await this.alert('payments.efi-webhook.dlq', msg);
  }

  private async alert(queue: string, msg: any): Promise<void> {
    const paymentId = msg?.paymentId ?? null;
    this.logger.error(
      `🔴 DLQ ${queue}: mensagem de pagamento sem efeito aplicado (paymentId=${paymentId}). Requer inspeção/replay.`,
    );
    try {
      await this.audit.log({
        userId: null,
        action: 'PAYMENT_DLQ',
        entity: 'Payment',
        entityId: paymentId ? String(paymentId) : queue,
        oldValue: undefined,
        newValue: { queue, message: msg } as any,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao auditar DLQ ${queue}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
