import { Nack } from '@golevelup/nestjs-rabbitmq';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from 'src/api/payment/payment.service';
import { AuditService } from 'src/common/audit/audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EfiWebhookConsumer } from './efi-webhook.consumer';
import {
  EfiWebhookMessage,
  MAX_DELIVERY_ATTEMPTS,
  RETRY_COUNT_HEADER,
} from './messaging.constants';
import { PaymentPublisher } from './payment.publisher';

describe('EfiWebhookConsumer', () => {
  let consumer: EfiWebhookConsumer;
  let prisma: { webhookLog: { findUnique: jest.Mock } };
  let audit: { log: jest.Mock };
  let paymentService: { processWebhookPaymentReceived: jest.Mock };
  let publisher: { republishForRetry: jest.Mock };

  const amqpMsg = (retryCount = 0) => ({
    properties: { headers: { [RETRY_COUNT_HEADER]: retryCount } },
    fields: { redelivered: retryCount > 0 },
  });

  const pixMsg = (txid = 'TX123'): EfiWebhookMessage => ({
    body: { pix: [{ tipoOperacao: 'PIX_RECEBIDO', txid, endToEndId: 'E2E1' }] },
    idempotencyKey: 'idem-1',
    receivedAt: new Date().toISOString(),
  });

  beforeEach(async () => {
    prisma = { webhookLog: { findUnique: jest.fn().mockResolvedValue(null) } };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    paymentService = {
      processWebhookPaymentReceived: jest
        .fn()
        .mockResolvedValue({ error: false }),
    };
    publisher = { republishForRetry: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EfiWebhookConsumer,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: PaymentService, useValue: paymentService },
        { provide: PaymentPublisher, useValue: publisher },
      ],
    }).compile();
    consumer = module.get(EfiWebhookConsumer);
  });

  afterEach(() => jest.clearAllMocks());

  it('processa PIX recebido delegando a processWebhookPaymentReceived (ACK)', async () => {
    const result = await consumer.handleEfiWebhook(pixMsg('TX999'), amqpMsg(1));

    expect(paymentService.processWebhookPaymentReceived).toHaveBeenCalledWith(
      'TX999',
      'E2E1',
    );
    expect(result).toBeUndefined(); // ack
  });

  it('idempotência: pula reprocesso quando idempotencyKey já existe (ACK)', async () => {
    prisma.webhookLog.findUnique.mockResolvedValue({ id: 1 });

    const result = await consumer.handleEfiWebhook(pixMsg(), amqpMsg(1));

    expect(paymentService.processWebhookPaymentReceived).not.toHaveBeenCalled();
    expect(result).toBeUndefined(); // ack
  });

  it('falha do processWebhook abaixo do limite: reagenda retry (republish) e ACK', async () => {
    paymentService.processWebhookPaymentReceived.mockResolvedValue({
      error: true,
      message: 'falha',
    });

    const msg = pixMsg();
    const result = await consumer.handleEfiWebhook(msg, amqpMsg(0));

    expect(publisher.republishForRetry).toHaveBeenCalledWith(
      'efi.webhook.received',
      msg,
      1,
    );
    expect(result).toBeUndefined(); // ack
  });

  it('após MAX_DELIVERY_ATTEMPTS manda para DLQ: Nack(requeue=false)', async () => {
    paymentService.processWebhookPaymentReceived.mockResolvedValue({
      error: true,
      message: 'falha',
    });

    const result = await consumer.handleEfiWebhook(
      pixMsg(),
      amqpMsg(MAX_DELIVERY_ATTEMPTS),
    );

    expect(publisher.republishForRetry).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Nack);
    expect((result as Nack).requeue).toBe(false);
  });
});
