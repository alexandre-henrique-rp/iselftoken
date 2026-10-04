import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmailService } from 'src/email/email.service';
import { RETRY_COUNT_HEADER } from './messaging.constants';
import {
  EMAILS_EXCHANGE,
  EMAILS_RETRY_EXCHANGE,
  EmailQueueMessage,
  EmailRoutingKeys,
} from './email-queue.constants';
import { EmailQueuePublisher } from './email-queue.publisher';

/**
 * Unit tests para EmailQueuePublisher.
 *
 * Cobertura:
 *  - Happy path: amqp.publish OK → retorna true
 *  - Fallback: amqp.publish falhou → tenta SMTP inline
 *  - Fallback também falhou → retorna false
 *  - republishForRetry: sucesso e falha
 */
describe('EmailQueuePublisher', () => {
  let publisher: EmailQueuePublisher;
  let amqp: jest.Mocked<Pick<AmqpConnection, 'publish'>>;
  let emailService: jest.Mocked<Pick<EmailService, 'sendTemplateBySlug'>>;

  const baseMsg: Omit<EmailQueueMessage, 'publishedAt'> = {
    to: 'user@example.com',
    slug: 'compra-tokens',
    ctx: {
      userName: 'Test',
      startupName: 'Acme',
      quantity: 10,
      totalAmount: 'R$ 100,00',
    },
    origin: 'test',
  };

  beforeEach(async () => {
    amqp = { publish: jest.fn() } as any;
    emailService = { sendTemplateBySlug: jest.fn() } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailQueuePublisher,
        { provide: AmqpConnection, useValue: amqp },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    publisher = moduleRef.get(EmailQueuePublisher);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('publishSend', () => {
    it('publica na exchange e retorna true em caso de sucesso', async () => {
      amqp.publish.mockResolvedValueOnce(undefined as any);

      const result = await publisher.publishSend(baseMsg);

      expect(result).toBe(true);
      expect(amqp.publish).toHaveBeenCalledWith(
        EMAILS_EXCHANGE,
        EmailRoutingKeys.EMAIL_SEND,
        expect.objectContaining({
          to: baseMsg.to,
          slug: baseMsg.slug,
          ctx: baseMsg.ctx,
          origin: baseMsg.origin,
          publishedAt: expect.any(String),
        }),
        { persistent: true, contentType: 'application/json' },
      );
      expect(emailService.sendTemplateBySlug).not.toHaveBeenCalled();
    });

    it('cai no fallback SMTP quando amqp.publish falha', async () => {
      amqp.publish.mockRejectedValueOnce(new Error('broker down'));
      emailService.sendTemplateBySlug.mockResolvedValueOnce({
        success: true,
        message: 'sent',
      });

      const result = await publisher.publishSend(baseMsg);

      expect(result).toBe(true);
      expect(emailService.sendTemplateBySlug).toHaveBeenCalledWith(
        baseMsg.to,
        baseMsg.slug,
        baseMsg.ctx,
      );
    });

    it('retorna false quando AMBOS broker E SMTP falham', async () => {
      amqp.publish.mockRejectedValueOnce(new Error('broker down'));
      emailService.sendTemplateBySlug.mockResolvedValueOnce({
        success: false,
        message: 'smtp failed',
      });

      const result = await publisher.publishSend(baseMsg);

      expect(result).toBe(false);
    });

    it('retorna false quando broker falha E EmailService nao foi injetado', async () => {
      amqp.publish.mockRejectedValueOnce(new Error('broker down'));

      const moduleRef = await Test.createTestingModule({
        providers: [
          EmailQueuePublisher,
          { provide: AmqpConnection, useValue: amqp },
        ],
      }).compile();
      const pubNoEmail = moduleRef.get(EmailQueuePublisher);

      const result = await pubNoEmail.publishSend(baseMsg);

      expect(result).toBe(false);
    });
  });

  describe('republishForRetry', () => {
    it('publica na exchange de retry com o retryCount recebido', async () => {
      // O publisher repassa o retryCount DIRETO; o consumer é que decide
      // incrementar antes de chamar (ver `email.consumer.spec.ts`).
      amqp.publish.mockResolvedValueOnce(undefined as any);

      const result = await publisher.republishForRetry(
        EmailRoutingKeys.EMAIL_SEND,
        baseMsg,
        1,
      );

      expect(result).toBe(true);
      expect(amqp.publish).toHaveBeenCalledWith(
        EMAILS_RETRY_EXCHANGE,
        EmailRoutingKeys.EMAIL_SEND,
        baseMsg,
        expect.objectContaining({
          persistent: true,
          contentType: 'application/json',
          headers: { [RETRY_COUNT_HEADER]: 1 },
        }),
      );
    });

    it('retorna false quando amqp.publish lanca', async () => {
      amqp.publish.mockRejectedValueOnce(new Error('retry failed'));

      const result = await publisher.republishForRetry(
        EmailRoutingKeys.EMAIL_SEND,
        baseMsg,
        0,
      );

      expect(result).toBe(false);
    });
  });
});
