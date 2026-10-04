import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { PaymentService } from 'src/api/payment/payment.service';
import {
  MAX_DELIVERY_ATTEMPTS,
  PAYMENTS_EXCHANGE,
  PAYMENT_EFFECTS_QUEUE,
  PaymentConfirmedMessage,
  RETRY_COUNT_HEADER,
  RoutingKeys,
} from './messaging.constants';
import { PaymentPublisher } from './payment.publisher';

/**
 * Consumer dos efeitos de domínio de um pagamento confirmado.
 *
 * Garantias para "não perder pagamento":
 * - ACK manual: a mensagem só é confirmada (removida da fila) quando
 *   `processPaymentEffects` conclui sem lançar. Se o processo cair no meio,
 *   o broker reentrega a mensagem (nada some).
 * - Idempotência: `processPaymentEffects` relê o estado e não duplica efeito,
 *   então reentrega/retry é seguro.
 * - Retry limitado + DLQ: em erro, reentrega até MAX_DELIVERY_ATTEMPTS; depois
 *   manda para a Dead-Letter Queue (`payments.effects.dlq`) para inspeção,
 *   em vez de descartar.
 */
@Injectable()
export class PaymentEffectsConsumer {
  private readonly logger = new Logger(PaymentEffectsConsumer.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly publisher: PaymentPublisher,
  ) {}

  @RabbitSubscribe({
    exchange: PAYMENTS_EXCHANGE,
    routingKey: RoutingKeys.PAYMENT_CONFIRMED,
    queue: PAYMENT_EFFECTS_QUEUE,
    // A topologia (fila + DLX + bindings) é declarada UMA vez no
    // MessagingModule. Aqui apenas consumimos a fila já existente — não
    // redeclaramos (evita conflito 406 PRECONDITION_FAILED por args divergentes).
    createQueueIfNotExists: false,
    allowNonJsonMessages: false,
  })
  async handlePaymentConfirmed(
    msg: PaymentConfirmedMessage,
    amqpMsg: any,
  ): Promise<void | Nack> {
    const paymentId = msg?.paymentId;
    if (!paymentId) {
      this.logger.warn(
        'Mensagem payment.confirmed sem paymentId — descartando',
      );
      return; // ack: mensagem inválida, não adianta reprocessar
    }

    try {
      // Idempotente e transacional; nunca lança em condições normais.
      await this.paymentService.processPaymentEffects(paymentId);
      this.logger.log(
        `Efeitos aplicados para payment ${paymentId} (via RabbitMQ)`,
      );
      return; // ack
    } catch (error) {
      return this.scheduleRetryOrDlq(
        RoutingKeys.PAYMENT_CONFIRMED,
        msg,
        amqpMsg,
        `payment ${paymentId}`,
        error,
      );
    }
  }

  @RabbitSubscribe({
    exchange: PAYMENTS_EXCHANGE,
    routingKey: RoutingKeys.PAYMENT_CANCELLED,
    queue: PAYMENT_EFFECTS_QUEUE,
    createQueueIfNotExists: false,
    allowNonJsonMessages: false,
  })
  async handlePaymentCancelled(
    msg: PaymentConfirmedMessage,
    amqpMsg: any,
  ): Promise<void | Nack> {
    const paymentId = msg?.paymentId;
    if (!paymentId) {
      this.logger.warn(
        'Mensagem payment.cancelled sem paymentId — descartando',
      );
      return; // ack
    }
    try {
      await this.paymentService.processPaymentCancelledEffects(paymentId);
      this.logger.log(
        `Cancelamento aplicado para payment ${paymentId} (via RabbitMQ)`,
      );
      return; // ack
    } catch (error) {
      return this.scheduleRetryOrDlq(
        RoutingKeys.PAYMENT_CANCELLED,
        msg,
        amqpMsg,
        `payment ${paymentId} (cancelamento)`,
        error,
      );
    }
  }

  /**
   * Estratégia de falha com BACKOFF (sem hot-loop):
   * - Lê o contador de tentativas do header `x-retry-count`.
   * - Se ainda abaixo de MAX: republica na exchange de retry (fila de espera
   *   com TTL) e faz ACK da mensagem atual — a mensagem "descansa" e reaparece
   *   após o TTL, sem girar a CPU.
   * - Se atingiu MAX (ou a republicação falhar): `Nack(false)` → DLQ.
   */
  private async scheduleRetryOrDlq(
    routingKey: string,
    payload: unknown,
    amqpMsg: any,
    label: string,
    error: unknown,
  ): Promise<void | Nack> {
    const retryCount = this.retryCount(amqpMsg);
    this.logger.error(
      `Falha ao processar ${label} (retry ${retryCount}/${MAX_DELIVERY_ATTEMPTS}): ${error instanceof Error ? error.message : String(error)}`,
    );

    if (retryCount >= MAX_DELIVERY_ATTEMPTS) {
      this.logger.error(
        `${label} enviado para a DLQ após ${retryCount} tentativas`,
      );
      return new Nack(false);
    }

    const republished = await this.publisher.republishForRetry(
      routingKey,
      payload,
      retryCount + 1,
    );
    if (!republished) {
      // Não conseguiu agendar retry → não perde a mensagem: manda pra DLQ.
      this.logger.error(
        `${label}: falha ao agendar retry — enviando para a DLQ`,
      );
      return new Nack(false);
    }
    // Republicado na fila de espera → ack a mensagem atual.
    this.logger.warn(
      `${label}: reagendado para retry em backoff (tentativa ${retryCount + 1})`,
    );
    return; // ack
  }

  /** Lê o contador de tentativas do header `x-retry-count` (0 na 1ª vez). */
  private retryCount(amqpMsg: any): number {
    const headers = (amqpMsg?.properties?.headers ?? {}) as Record<
      string,
      unknown
    >;
    const raw = headers[RETRY_COUNT_HEADER];
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
}
