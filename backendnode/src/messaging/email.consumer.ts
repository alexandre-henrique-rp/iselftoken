import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import {
  MAX_DELIVERY_ATTEMPTS,
  RETRY_COUNT_HEADER,
} from './messaging.constants';
import {
  EMAILS_EXCHANGE,
  EMAILS_SEND_QUEUE,
  EmailQueueMessage,
  EmailRoutingKeys,
} from './email-queue.constants';
import { EmailQueuePublisher } from './email-queue.publisher';

/**
 * Consumer da fila de envio de e-mails (RabbitMQ).
 *
 * Recebe `email.send` no exchange `emails`, renderiza o template via
 * `EmailService.sendTemplateBySlug` (banco primeiro, hardcoded fallback)
 * e envia via SMTP (Nodemailer + AWS SES).
 *
 * Garantias:
 * - ACK manual: so confirma a mensagem (remove da fila) quando o envio SMTP
 *   tem sucesso. Se o processo cair no meio, a mensagem e reentregue.
 * - Retry limitado: em erro transitorio, republica em `emails.retry` (fila
 *   de espera com TTL 30s) ate MAX_DELIVERY_ATTEMPTS.
 * - DLQ: apos esgotar retries, `Nack(false)` → `emails.send.dlq` para
 *   inspecao manual.
 */
@Injectable()
export class EmailConsumer {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly publisher: EmailQueuePublisher,
  ) {}

  @RabbitSubscribe({
    exchange: EMAILS_EXCHANGE,
    routingKey: EmailRoutingKeys.EMAIL_SEND,
    queue: EMAILS_SEND_QUEUE,
    createQueueIfNotExists: false,
    allowNonJsonMessages: false,
  })
  async handleEmailSend(
    msg: EmailQueueMessage,
    amqpMsg: any,
  ): Promise<void | Nack> {
    if (!msg?.to || !msg?.slug) {
      this.logger.warn(
        `[email-consumer] mensagem invalida (sem to/slug) — descartando`,
      );
      return; // ack: mensagem malformada
    }

    try {
      const result = await this.emailService.sendTemplateBySlug(
        msg.to,
        msg.slug,
        msg.ctx,
      );
      if (!result.success) {
        this.logger.warn(
          `[email-consumer] SMTP reportou falha slug=${msg.slug} message=${result.message}`,
        );
        return this.scheduleRetryOrDlq(msg, amqpMsg, 'SMTP failure');
      }
      this.logger.log(
        `[email-consumer] email enviado slug=${msg.slug} origin=${msg.origin ?? 'unspecified'}`,
      );
      return; // ack
    } catch (error) {
      this.logger.error(
        `[email-consumer] exception slug=${msg.slug} error=${error instanceof Error ? error.message : String(error)}`,
      );
      return this.scheduleRetryOrDlq(msg, amqpMsg, 'exception');
    }
  }

  private async scheduleRetryOrDlq(
    msg: EmailQueueMessage,
    amqpMsg: any,
    label: string,
  ): Promise<void | Nack> {
    const retryCount = this.retryCount(amqpMsg);
    this.logger.error(
      `[email-consumer] falha no envio slug=${msg.slug} (${label}) retry ${retryCount}/${MAX_DELIVERY_ATTEMPTS}`,
    );

    if (retryCount >= MAX_DELIVERY_ATTEMPTS) {
      this.logger.error(
        `[email-consumer] slug=${msg.slug} enviado para DLQ apos ${retryCount} tentativas`,
      );
      return new Nack(false);
    }

    const republished = await this.publisher.republishForRetry(
      EmailRoutingKeys.EMAIL_SEND,
      msg,
      retryCount + 1,
    );
    if (!republished) {
      this.logger.error(
        `[email-consumer] slug=${msg.slug} falha ao agendar retry — enviando para DLQ`,
      );
      return new Nack(false);
    }
    this.logger.warn(
      `[email-consumer] slug=${msg.slug} reagendado para retry em backoff (tentativa ${retryCount + 1})`,
    );
    return; // ack (a mensagem "descansa" na fila de retry e volta depois)
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
}
