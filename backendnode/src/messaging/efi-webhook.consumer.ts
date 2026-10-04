import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { PaymentService } from 'src/api/payment/payment.service';
import { AuditService } from 'src/common/audit/audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  EFI_WEBHOOK_QUEUE,
  EfiWebhookMessage,
  MAX_DELIVERY_ATTEMPTS,
  PAYMENTS_EXCHANGE,
  RETRY_COUNT_HEADER,
  RoutingKeys,
} from './messaging.constants';
import { PaymentPublisher } from './payment.publisher';

/**
 * Consumer do webhook PIX bruto da EFI (migrado do BullMQ para RabbitMQ).
 *
 * Responsabilidades (portadas do antigo WebhookProcessor):
 * 1. Idempotência via `WebhookLog.idempotencyKey` (UNIQUE) — pula reprocesso.
 * 2. Log de auditoria do recebimento.
 * 3. Roteamento por evento PIX → delega a
 *    `PaymentService.processWebhookPaymentReceived`, que marca PAID e publica
 *    `payment.confirmed` (processado pelo PaymentEffectsConsumer).
 *
 * Confiabilidade: ACK manual (Nack em falha), retry limitado + DLQ. A
 * idempotência garante que reentrega não duplica efeito.
 */
@Injectable()
export class EfiWebhookConsumer {
  private readonly logger = new Logger(EfiWebhookConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly paymentService: PaymentService,
    private readonly publisher: PaymentPublisher,
  ) {}

  @RabbitSubscribe({
    exchange: PAYMENTS_EXCHANGE,
    routingKey: RoutingKeys.EFI_WEBHOOK_RECEIVED,
    queue: EFI_WEBHOOK_QUEUE,
    // Topologia declarada no MessagingModule; aqui só consumimos.
    createQueueIfNotExists: false,
    allowNonJsonMessages: false,
  })
  async handleEfiWebhook(
    msg: EfiWebhookMessage,
    amqpMsg: any,
  ): Promise<void | Nack> {
    const { body, idempotencyKey } = msg ?? ({} as EfiWebhookMessage);

    try {
      // 1. Idempotência
      if (idempotencyKey && (await this.alreadyProcessed(idempotencyKey))) {
        this.logger.log(`Webhook idempotente ignorado: ${idempotencyKey}`);
        return; // ack
      }

      // 2. Auditoria (best-effort)
      await this.logWebhook(idempotencyKey);

      // 3. Roteamento PIX
      const pixEvents = (body as any)?.pix;
      if (Array.isArray(pixEvents)) {
        for (const pix of pixEvents) {
          await this.handlePixEvent(pix);
        }
      }

      return; // ack
    } catch (error) {
      return this.scheduleRetryOrDlq(msg, amqpMsg, error);
    }
  }

  /**
   * Falha com BACKOFF: republica na fila de espera (TTL) até MAX; depois DLQ.
   * Evita o hot-loop do `Nack(requeue=true)`.
   */
  private async scheduleRetryOrDlq(
    payload: unknown,
    amqpMsg: any,
    error: unknown,
  ): Promise<void | Nack> {
    const retryCount = this.retryCount(amqpMsg);
    this.logger.error(
      `Falha ao processar webhook EFI (retry ${retryCount}/${MAX_DELIVERY_ATTEMPTS}): ${error instanceof Error ? error.message : String(error)}`,
    );

    if (retryCount >= MAX_DELIVERY_ATTEMPTS) {
      this.logger.error('Webhook EFI enviado para a DLQ após esgotar retries');
      return new Nack(false);
    }

    const republished = await this.publisher.republishForRetry(
      RoutingKeys.EFI_WEBHOOK_RECEIVED,
      payload,
      retryCount + 1,
    );
    if (!republished) {
      this.logger.error(
        'Webhook EFI: falha ao agendar retry — enviando para a DLQ',
      );
      return new Nack(false);
    }
    this.logger.warn(
      `Webhook EFI reagendado para retry em backoff (tentativa ${retryCount + 1})`,
    );
    return; // ack
  }

  private retryCount(amqpMsg: any): number {
    const headers = (amqpMsg?.properties?.headers ?? {}) as Record<
      string,
      unknown
    >;
    const raw = headers[RETRY_COUNT_HEADER];
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private async handlePixEvent(pix: any): Promise<void> {
    const tipo = String(pix?.tipoOperacao ?? '').toUpperCase();
    const txid = pix?.txid as string | undefined;

    if (!txid) {
      this.logger.warn(`Evento PIX sem txid (tipo=${tipo}) — ignorado`);
      return;
    }

    if (tipo === 'PIX_RECEBIDO' || tipo === 'RECEBIMENTO') {
      const endToEndId = pix?.endToEndId ?? pix?.horario ?? `EFI-PIX-${txid}`;
      const result = await this.paymentService.processWebhookPaymentReceived(
        txid,
        endToEndId,
      );
      if (result?.error) {
        // Propaga para retry/DLQ — não podemos perder a confirmação.
        throw new Error(
          `processWebhookPaymentReceived falhou para txid=${txid}: ${result.message}`,
        );
      }
      return;
    }

    // Devoluções/estornos e demais tipos: apenas registramos por ora.
    this.logger.log(`Evento PIX tipo=${tipo} (txid=${txid}) sem ação dedicada`);
  }

  private async alreadyProcessed(idempotencyKey: string): Promise<boolean> {
    try {
      const existing = await this.prisma.webhookLog.findUnique({
        where: { idempotencyKey },
      });
      return !!existing;
    } catch {
      // Se a tabela/campo não existir, não bloqueia (processa).
      return false;
    }
  }

  private async logWebhook(idempotencyKey: string): Promise<void> {
    try {
      await this.audit.log({
        userId: null,
        action: 'EFI_WEBHOOK_RECEIVED',
        entity: 'WebhookLog',
        entityId: idempotencyKey,
        oldValue: undefined,
        newValue: { receivedAt: new Date() } as any,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao logar webhook: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
