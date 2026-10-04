import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  EfiWebhookMessage,
  PAYMENTS_EXCHANGE,
  PAYMENTS_RETRY_EXCHANGE,
  PaymentConfirmedMessage,
  RETRY_COUNT_HEADER,
  RoutingKeys,
} from './messaging.constants';

/**
 * Publisher do domínio de pagamentos no RabbitMQ.
 *
 * Todas as publicações são PERSISTENTES (`persistent: true`) e usam publisher
 * confirms (`publish` do golevelup aguarda o ack do broker), de modo que uma
 * publicação bem-sucedida garante que a mensagem foi persistida no broker —
 * requisito para "não perder pagamento".
 *
 * Os métodos retornam `boolean` (sucesso da publicação) para que o caller
 * possa aplicar um fallback (processar inline) caso o broker esteja
 * indisponível, evitando pago-sem-efeito.
 */
@Injectable()
export class PaymentPublisher {
  private readonly logger = new Logger(PaymentPublisher.name);

  constructor(private readonly amqp: AmqpConnection) {}

  /**
   * Publica `payment.confirmed`. Retorna true se o broker confirmou a
   * persistência da mensagem; false em qualquer falha (broker fora, etc).
   */
  async publishPaymentConfirmed(
    msg: Omit<PaymentConfirmedMessage, 'publishedAt'>,
  ): Promise<boolean> {
    return this.publish(RoutingKeys.PAYMENT_CONFIRMED, {
      ...msg,
      publishedAt: new Date().toISOString(),
    });
  }

  /**
   * Publica `payment.cancelled` (durável). Retorna true se o broker confirmou.
   */
  async publishPaymentCancelled(
    msg: Omit<PaymentConfirmedMessage, 'publishedAt'> & { reason?: string },
  ): Promise<boolean> {
    return this.publish(RoutingKeys.PAYMENT_CANCELLED, {
      ...msg,
      publishedAt: new Date().toISOString(),
    });
  }

  /**
   * Publica o webhook PIX bruto para processamento assíncrono. Retorna true
   * se o broker confirmou a persistência.
   */
  async publishEfiWebhook(msg: EfiWebhookMessage): Promise<boolean> {
    return this.publish(RoutingKeys.EFI_WEBHOOK_RECEIVED, msg);
  }

  /**
   * Republica uma mensagem na exchange de RETRY (fila de espera com TTL).
   * Após o TTL, a mensagem volta à exchange principal com a routing key
   * original. Incrementa o header de contagem de tentativas.
   *
   * Usado pelos consumers para implementar backoff sem hot-loop: em vez de
   * `Nack(requeue=true)` imediato, a mensagem "descansa" na fila de espera.
   */
  async republishForRetry(
    originalRoutingKey: string,
    payload: unknown,
    retryCount: number,
  ): Promise<boolean> {
    try {
      // Publicamos na exchange de retry (fanout) COM a routing key original.
      // A fanout ignora a routing key para enfileirar, mas o broker a preserva
      // na mensagem; quando o TTL expira na fila de espera, o dead-letter de
      // volta para `payments` reutiliza essa routing key original, reentregando
      // na fila correta (payments.effects / payments.efi-webhook).
      await this.amqp.publish(
        PAYMENTS_RETRY_EXCHANGE,
        originalRoutingKey,
        payload,
        {
          persistent: true,
          contentType: 'application/json',
          headers: { [RETRY_COUNT_HEADER]: retryCount },
        },
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Falha ao republicar para retry (rk=${originalRoutingKey}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async publish(
    routingKey: string,
    payload: unknown,
  ): Promise<boolean> {
    try {
      await this.amqp.publish(PAYMENTS_EXCHANGE, routingKey, payload, {
        persistent: true,
        contentType: 'application/json',
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Falha ao publicar "${routingKey}" no RabbitMQ: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
