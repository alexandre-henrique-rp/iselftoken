import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmailService } from 'src/email/email.service';
import {
  MAX_DELIVERY_ATTEMPTS,
  RETRY_COUNT_HEADER,
} from './messaging.constants';
import {
  EMAILS_SEND_QUEUE,
  EmailQueueMessage,
  EmailRoutingKeys,
} from './email-queue.constants';
import { EmailConsumer } from './email.consumer';
import { EmailQueuePublisher } from './email-queue.publisher';

/**
 * Unit tests para EmailConsumer.
 *
 * Cobertura:
 *  - Happy path: SMTP sucesso → ack
 *  - SMTP reporta falha → republica para retry
 *  - retryCount >= MAX → Nack (DLQ)
 *  - republicação falha → Nack (DLQ)
 *  - Mensagem inválida (sem to/slug) → ack (descarta)
 *  - Exception no sendTemplateBySlug → republica
 */
describe('EmailConsumer', () => {
  let consumer: EmailConsumer;
  let emailService: jest.Mocked<Pick<EmailService, 'sendTemplateBySlug'>>;
  let publisher: jest.Mocked<Pick<EmailQueuePublisher, 'republishForRetry'>>;

  const validMsg: EmailQueueMessage = {
    to: 'user@example.com',
    slug: 'compra-tokens',
    ctx: { userName: 'Test' },
    origin: 'test',
    publishedAt: new Date().toISOString(),
  };

  const amqpMsgWithRetry = (retryCount: number) => ({
    properties: { headers: { [RETRY_COUNT_HEADER]: retryCount } },
  });

  beforeEach(async () => {
    emailService = { sendTemplateBySlug: jest.fn() } as any;
    publisher = { republishForRetry: jest.fn() } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailConsumer,
        { provide: EmailService, useValue: emailService },
        { provide: EmailQueuePublisher, useValue: publisher },
      ],
    }).compile();

    consumer = moduleRef.get(EmailConsumer);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tem a topologia correta (regression: queue + routing key)', () => {
    expect(EMAILS_SEND_QUEUE).toBe('emails.send');
    expect(EmailRoutingKeys.EMAIL_SEND).toBe('email.send');
  });

  it('ack quando SMTP tem sucesso', async () => {
    emailService.sendTemplateBySlug.mockResolvedValueOnce({
      success: true,
      message: 'ok',
    });

    const result = await consumer.handleEmailSend(
      validMsg,
      amqpMsgWithRetry(0),
    );

    expect(result).toBeUndefined();
    expect(emailService.sendTemplateBySlug).toHaveBeenCalledWith(
      validMsg.to,
      validMsg.slug,
      validMsg.ctx,
    );
  });

  it('ack (descarta) mensagem inválida sem to', async () => {
    const result = await consumer.handleEmailSend(
      { ...validMsg, to: '' },
      amqpMsgWithRetry(0),
    );
    expect(result).toBeUndefined();
    expect(emailService.sendTemplateBySlug).not.toHaveBeenCalled();
  });

  it('ack (descarta) mensagem inválida sem slug', async () => {
    const result = await consumer.handleEmailSend(
      { ...validMsg, slug: '' },
      amqpMsgWithRetry(0),
    );
    expect(result).toBeUndefined();
    expect(emailService.sendTemplateBySlug).not.toHaveBeenCalled();
  });

  it('republica para retry quando SMTP falha e retryCount < MAX', async () => {
    emailService.sendTemplateBySlug.mockResolvedValueOnce({
      success: false,
      message: 'smtp 4xx',
    });
    publisher.republishForRetry.mockResolvedValueOnce(true);

    const result = await consumer.handleEmailSend(
      validMsg,
      amqpMsgWithRetry(0),
    );

    expect(result).toBeUndefined(); // ack
    expect(publisher.republishForRetry).toHaveBeenCalledWith(
      EmailRoutingKeys.EMAIL_SEND,
      validMsg,
      1,
    );
  });

  it('Nack → DLQ quando retryCount >= MAX_DELIVERY_ATTEMPTS', async () => {
    emailService.sendTemplateBySlug.mockResolvedValueOnce({
      success: false,
      message: 'smtp 4xx',
    });

    const result = await consumer.handleEmailSend(
      validMsg,
      amqpMsgWithRetry(MAX_DELIVERY_ATTEMPTS),
    );

    // Nack(false) → DLQ
    expect(result).toEqual(expect.objectContaining({ requeue: false }));
    expect(publisher.republishForRetry).not.toHaveBeenCalled();
  });

  it('Nack → DLQ quando republishForRetry falha', async () => {
    emailService.sendTemplateBySlug.mockResolvedValueOnce({
      success: false,
      message: 'smtp 4xx',
    });
    publisher.republishForRetry.mockResolvedValueOnce(false);

    const result = await consumer.handleEmailSend(
      validMsg,
      amqpMsgWithRetry(0),
    );

    expect(result).toEqual(expect.objectContaining({ requeue: false }));
  });

  it('republica para retry quando sendTemplateBySlug lanca exception', async () => {
    emailService.sendTemplateBySlug.mockRejectedValueOnce(new Error('boom'));
    publisher.republishForRetry.mockResolvedValueOnce(true);

    const result = await consumer.handleEmailSend(
      validMsg,
      amqpMsgWithRetry(0),
    );

    expect(result).toBeUndefined();
    expect(publisher.republishForRetry).toHaveBeenCalledWith(
      EmailRoutingKeys.EMAIL_SEND,
      validMsg,
      1,
    );
  });
});
