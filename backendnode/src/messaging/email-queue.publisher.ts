import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { RETRY_COUNT_HEADER } from './messaging.constants';
import {
  EMAILS_EXCHANGE,
  EMAILS_RETRY_EXCHANGE,
  EmailQueueMessage,
  EmailRoutingKeys,
} from './email-queue.constants';

/**
 * Publisher da fila de envio de e-mails (RabbitMQ).
 *
 * Toda publicacao e PERSISTENTE (`persistent: true`) e usa publisher confirms
 * (o `publish` do golevelup aguarda o ack do broker). Mensagem bem-sucedida
 * garante persistencia no broker.
 *
 * **Fallback SMTP inline**: se o broker estiver indisponivel (ou se a
 * publicacao falhar por qualquer motivo), o publisher chama o `EmailService`
 * direto via SMTP — assim a notificacao nunca e perdida, mesmo sem RabbitMQ.
 * Esse fallback e logged em `error` para Sentry.
 *
 * Os metodos sao `async/await` e retornam `boolean` para que o caller saiba se
 * entrou na fila (true) ou se caiu no fallback SMTP (tambem true — entrega
 * confirmada). Em caso de falha total, retorna `false` para o caller
 * sinalizar warn no log.
 */
@Injectable()
export class EmailQueuePublisher {
  private readonly logger = new Logger(EmailQueuePublisher.name);

  constructor(
    private readonly amqp: AmqpConnection,
    @Optional()
    @Inject(EmailService)
    private readonly emailService?: EmailService,
  ) {}

  /**
   * Publica `email.send` na exchange `emails` (durable). Se o broker
   * confirmar, retorna `true`. Em qualquer falha, tenta fallback SMTP inline
   * via `EmailService.sendTemplateBySlug` (tambem retorna `true` se o SMTP
   * aceitar). Retorna `false` apenas se AMBOS falharem.
   */
  async publishSend(
    msg: Omit<EmailQueueMessage, 'publishedAt'>,
  ): Promise<boolean> {
    const enriched: EmailQueueMessage = {
      ...msg,
      publishedAt: new Date().toISOString(),
    };
    const published = await this.publish(EmailRoutingKeys.EMAIL_SEND, enriched);
    if (published) {
      this.logger.log(
        `[email-queue] published slug=${msg.slug} to=<email> origin=${msg.origin ?? 'unspecified'}`,
      );
      return true;
    }

    // Fallback: tenta enviar via SMTP direto (sem fila)
    this.logger.warn(
      `[email-queue] broker indisponivel — fallback SMTP inline slug=${msg.slug}`,
    );
    return this.fallbackSmtp(msg);
  }

  /**
   * Republica uma mensagem na exchange de RETRY (fila de espera com TTL).
   * Apos o TTL, a mensagem volta a exchange principal com a routing key
   * original. Incrementa o header de contagem de tentativas.
   */
  async republishForRetry(
    originalRoutingKey: string,
    payload: unknown,
    retryCount: number,
  ): Promise<boolean> {
    try {
      await this.amqp.publish(
        EMAILS_RETRY_EXCHANGE,
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
        `Falha ao republicar email para retry (rk=${originalRoutingKey}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  private async publish(
    routingKey: string,
    payload: unknown,
  ): Promise<boolean> {
    try {
      await this.amqp.publish(EMAILS_EXCHANGE, routingKey, payload, {
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

  private async fallbackSmtp(
    msg: Omit<EmailQueueMessage, 'publishedAt'>,
  ): Promise<boolean> {
    if (!this.emailService) {
      this.logger.error(
        `[email-queue] fallback SMTP indisponivel (EmailService nao injetado) slug=${msg.slug}`,
      );
      return false;
    }
    try {
      const result = await this.emailService.sendTemplateBySlug(
        msg.to,
        msg.slug,
        msg.ctx,
      );
      if (!result.success) {
        this.logger.error(
          `[email-queue] fallback SMTP falhou slug=${msg.slug} message=${result.message}`,
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(
        `[email-queue] fallback SMTP exception slug=${msg.slug} error=${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
