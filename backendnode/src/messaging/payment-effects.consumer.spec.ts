import { Nack } from '@golevelup/nestjs-rabbitmq';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from 'src/api/payment/payment.service';
import {
  MAX_DELIVERY_ATTEMPTS,
  PaymentConfirmedMessage,
  RETRY_COUNT_HEADER,
} from './messaging.constants';
import { PaymentEffectsConsumer } from './payment-effects.consumer';
import { PaymentPublisher } from './payment.publisher';

describe('PaymentEffectsConsumer', () => {
  let consumer: PaymentEffectsConsumer;
  let paymentService: { processPaymentEffects: jest.Mock };
  let publisher: { republishForRetry: jest.Mock };

  const baseMsg: PaymentConfirmedMessage = {
    paymentId: 42,
    userId: 7,
    purpose: 'SUBSCRIPTION',
    publishedAt: new Date().toISOString(),
  };

  // amqpMsg com header de contagem de retries.
  const amqpMsg = (retryCount = 0) => ({
    properties: { headers: { [RETRY_COUNT_HEADER]: retryCount } },
    fields: { redelivered: retryCount > 0 },
  });

  beforeEach(async () => {
    paymentService = { processPaymentEffects: jest.fn() };
    publisher = { republishForRetry: jest.fn().mockResolvedValue(true) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentEffectsConsumer,
        { provide: PaymentService, useValue: paymentService },
        { provide: PaymentPublisher, useValue: publisher },
      ],
    }).compile();
    consumer = module.get(PaymentEffectsConsumer);
  });

  afterEach(() => jest.clearAllMocks());

  it('aplica efeitos e faz ACK (retorna void) no caminho feliz', async () => {
    paymentService.processPaymentEffects.mockResolvedValue(undefined);

    const result = await consumer.handlePaymentConfirmed(baseMsg, amqpMsg(0));

    expect(paymentService.processPaymentEffects).toHaveBeenCalledWith(42);
    expect(result).toBeUndefined(); // ack
    expect(publisher.republishForRetry).not.toHaveBeenCalled();
  });

  it('faz ACK e não processa quando paymentId está ausente', async () => {
    const result = await consumer.handlePaymentConfirmed(
      { ...baseMsg, paymentId: undefined as any },
      amqpMsg(0),
    );

    expect(paymentService.processPaymentEffects).not.toHaveBeenCalled();
    expect(result).toBeUndefined(); // ack
  });

  it('em falha abaixo do limite: reagenda retry (republish) e ACK', async () => {
    paymentService.processPaymentEffects.mockRejectedValue(new Error('boom'));

    const result = await consumer.handlePaymentConfirmed(baseMsg, amqpMsg(0));

    expect(publisher.republishForRetry).toHaveBeenCalledWith(
      'payment.confirmed',
      baseMsg,
      1,
    );
    expect(result).toBeUndefined(); // ack (mensagem republicada na fila de espera)
  });

  it('em falha ao atingir MAX: Nack(requeue=false) → DLQ (sem republish)', async () => {
    paymentService.processPaymentEffects.mockRejectedValue(new Error('boom'));

    const result = await consumer.handlePaymentConfirmed(
      baseMsg,
      amqpMsg(MAX_DELIVERY_ATTEMPTS),
    );

    expect(publisher.republishForRetry).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Nack);
    expect((result as Nack).requeue).toBe(false);
  });

  it('se o republish falhar: Nack(requeue=false) → DLQ (não perde a mensagem)', async () => {
    paymentService.processPaymentEffects.mockRejectedValue(new Error('boom'));
    publisher.republishForRetry.mockResolvedValue(false);

    const result = await consumer.handlePaymentConfirmed(baseMsg, amqpMsg(0));

    expect(result).toBeInstanceOf(Nack);
    expect((result as Nack).requeue).toBe(false);
  });

  it('handlePaymentCancelled aplica cancelamento e ACK', async () => {
    (paymentService as any).processPaymentCancelledEffects = jest
      .fn()
      .mockResolvedValue(undefined);

    const result = await consumer.handlePaymentCancelled(baseMsg, amqpMsg(0));

    expect(
      (paymentService as any).processPaymentCancelledEffects,
    ).toHaveBeenCalledWith(42);
    expect(result).toBeUndefined(); // ack
  });
});
