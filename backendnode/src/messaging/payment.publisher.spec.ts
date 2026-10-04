import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentPublisher } from './payment.publisher';
import { PAYMENTS_EXCHANGE, RoutingKeys } from './messaging.constants';

describe('PaymentPublisher', () => {
  let publisher: PaymentPublisher;
  let amqp: { publish: jest.Mock };

  beforeEach(async () => {
    amqp = { publish: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentPublisher,
        { provide: AmqpConnection, useValue: amqp },
      ],
    }).compile();
    publisher = module.get(PaymentPublisher);
  });

  afterEach(() => jest.clearAllMocks());

  it('publica payment.confirmed persistente e retorna true', async () => {
    const ok = await publisher.publishPaymentConfirmed({
      paymentId: 10,
      userId: 3,
      purpose: 'SUBSCRIPTION',
    });

    expect(ok).toBe(true);
    expect(amqp.publish).toHaveBeenCalledWith(
      PAYMENTS_EXCHANGE,
      RoutingKeys.PAYMENT_CONFIRMED,
      expect.objectContaining({
        paymentId: 10,
        userId: 3,
        purpose: 'SUBSCRIPTION',
        publishedAt: expect.any(String),
      }),
      expect.objectContaining({ persistent: true }),
    );
  });

  it('publica efi.webhook.received e retorna true', async () => {
    const ok = await publisher.publishEfiWebhook({
      body: { pix: [] },
      idempotencyKey: 'key-1',
      receivedAt: new Date().toISOString(),
    });

    expect(ok).toBe(true);
    expect(amqp.publish).toHaveBeenCalledWith(
      PAYMENTS_EXCHANGE,
      RoutingKeys.EFI_WEBHOOK_RECEIVED,
      expect.objectContaining({ idempotencyKey: 'key-1' }),
      expect.objectContaining({ persistent: true }),
    );
  });

  it('retorna false quando o broker falha (permite fallback do caller)', async () => {
    amqp.publish.mockRejectedValue(new Error('broker down'));

    const ok = await publisher.publishPaymentConfirmed({
      paymentId: 10,
      userId: 3,
      purpose: 'SUBSCRIPTION',
    });

    expect(ok).toBe(false);
  });
});
