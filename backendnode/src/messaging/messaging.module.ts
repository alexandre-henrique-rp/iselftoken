import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from 'src/email/email.module';
import {
  EMAILS_DLX,
  EMAILS_EXCHANGE,
  EMAILS_RETRY_EXCHANGE,
  EMAILS_RETRY_QUEUE,
  EMAILS_SEND_DLQ,
  EMAILS_SEND_QUEUE,
  EmailRoutingKeys,
} from './email-queue.constants';
import { EmailQueuePublisher } from './email-queue.publisher';
import { EmailConsumer } from './email.consumer';
import {
  EFI_WEBHOOK_DLQ,
  EFI_WEBHOOK_QUEUE,
  PAYMENTS_DLX,
  PAYMENTS_EXCHANGE,
  PAYMENTS_RETRY_EXCHANGE,
  PAYMENTS_RETRY_QUEUE,
  PAYMENT_EFFECTS_DLQ,
  PAYMENT_EFFECTS_QUEUE,
  RETRY_DELAY_MS,
  RoutingKeys,
} from './messaging.constants';
import { PaymentPublisher } from './payment.publisher';

/**
 * MessagingModule — conexão e topologia RabbitMQ do fluxo de pagamentos.
 *
 * Decisões para "não perder pagamento":
 * - Conexão com `connectionInitOptions.wait: false` para NÃO bloquear o boot
 *   se o broker estiver indisponível (o app sobe; publish/consume reconectam).
 * - Publisher confirms habilitado (`enableControllerDiscovery` não é usado;
 *   publicamos via AmqpConnection.publish com `{ persistent: true }`).
 * - Exchange e filas DURÁVEIS + mensagens persistentes → sobrevivem a restart
 *   do broker.
 * - Dead-letter exchange (DLX) por fila: mensagem que esgota retries vai para
 *   a DLQ em vez de ser descartada (inspeção manual, reprocesso).
 *
 * @Global para que producers/consumers em qualquer módulo injetem
 * `AmqpConnection` sem reimportar.
 */
@Global()
@Module({
  imports: [
    EmailModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('RABBITMQ_HOST', 'localhost');
        const port = config.get<string>('RABBITMQ_PORT', '5672');
        const user = config.get<string>('RABBITMQ_USER', 'admin');
        // S35 — sem default aqui: env.schema.ts já valida e aplica
        // 'admin' se RABBITMQ_PASS não estiver setado. Antes o default
        // 'admin123' aqui sobrescrevia silenciosamente o schema, e se
        // o broker tivesse sido inicializado com 'admin' (default do
        // docker-compose.prod.yml), dava ACCESS_REFUSED no boot.
        const pass = config.get<string>('RABBITMQ_PASS', 'admin');

        return {
          uri: `amqp://${user}:${pass}@${host}:${port}`,
          // Aguarda a declaração da topologia antes de registrar consumers que
          // usam `checkQueue`, evitando uma corrida no bootstrap.
          connectionInitOptions: { wait: true, timeout: 10000 },
          // Reconexão automática.
          connectionManagerOptions: { heartbeatIntervalInSeconds: 15 },
          exchanges: [
            {
              name: PAYMENTS_EXCHANGE,
              type: 'topic',
              options: { durable: true },
            },
            {
              name: PAYMENTS_DLX,
              type: 'topic',
              options: { durable: true },
            },
            {
              // Exchange de retry com atraso (fanout: a fila de espera única
              // recebe tudo; a routing key original é preservada no
              // dead-letter de volta para `payments`).
              name: PAYMENTS_RETRY_EXCHANGE,
              type: 'fanout',
              options: { durable: true },
            },
            {
              name: EMAILS_EXCHANGE,
              type: 'topic',
              options: { durable: true },
            },
            {
              name: EMAILS_DLX,
              type: 'topic',
              options: { durable: true },
            },
            {
              // Exchange de retry com atraso para e-mails (mesmo padrao de
              // payments: fanout → fila de espera com TTL → dead-letter de
              // volta para `emails` preservando a routing key).
              name: EMAILS_RETRY_EXCHANGE,
              type: 'fanout',
              options: { durable: true },
            },
          ],
          queues: [
            {
              // Fila de espera: segura a mensagem por RETRY_DELAY_MS e então
              // dead-letter de volta para a exchange principal `payments`
              // (sem deadLetterRoutingKey → preserva a routing key original,
              // reentregando na fila correta). Backoff sem hot-loop.
              name: PAYMENTS_RETRY_QUEUE,
              exchange: PAYMENTS_RETRY_EXCHANGE,
              routingKey: '',
              options: {
                durable: true,
                arguments: {
                  'x-message-ttl': RETRY_DELAY_MS,
                  'x-dead-letter-exchange': PAYMENTS_EXCHANGE,
                },
              },
            },
            {
              name: PAYMENT_EFFECTS_QUEUE,
              exchange: PAYMENTS_EXCHANGE,
              routingKey: [
                RoutingKeys.PAYMENT_CONFIRMED,
                RoutingKeys.PAYMENT_CANCELLED,
              ],
              options: {
                durable: true,
                arguments: {
                  'x-dead-letter-exchange': PAYMENTS_DLX,
                  'x-dead-letter-routing-key': PAYMENT_EFFECTS_DLQ,
                },
              },
            },
            {
              name: PAYMENT_EFFECTS_DLQ,
              exchange: PAYMENTS_DLX,
              routingKey: PAYMENT_EFFECTS_DLQ,
              options: { durable: true },
            },
            {
              name: EFI_WEBHOOK_QUEUE,
              exchange: PAYMENTS_EXCHANGE,
              routingKey: RoutingKeys.EFI_WEBHOOK_RECEIVED,
              options: {
                durable: true,
                arguments: {
                  'x-dead-letter-exchange': PAYMENTS_DLX,
                  'x-dead-letter-routing-key': EFI_WEBHOOK_DLQ,
                },
              },
            },
            {
              name: EFI_WEBHOOK_DLQ,
              exchange: PAYMENTS_DLX,
              routingKey: EFI_WEBHOOK_DLQ,
              options: { durable: true },
            },
            {
              // Fila de espera do retry de e-mails (mesmo padrao de payments).
              name: EMAILS_RETRY_QUEUE,
              exchange: EMAILS_RETRY_EXCHANGE,
              routingKey: '',
              options: {
                durable: true,
                arguments: {
                  'x-message-ttl': RETRY_DELAY_MS,
                  'x-dead-letter-exchange': EMAILS_EXCHANGE,
                },
              },
            },
            {
              name: EMAILS_SEND_QUEUE,
              exchange: EMAILS_EXCHANGE,
              routingKey: EmailRoutingKeys.EMAIL_SEND,
              options: {
                durable: true,
                arguments: {
                  'x-dead-letter-exchange': EMAILS_DLX,
                  'x-dead-letter-routing-key': EMAILS_SEND_DLQ,
                },
              },
            },
            {
              name: EMAILS_SEND_DLQ,
              exchange: EMAILS_DLX,
              routingKey: EMAILS_SEND_DLQ,
              options: { durable: true },
            },
          ],
        };
      },
    }),
  ],
  providers: [PaymentPublisher, EmailQueuePublisher, EmailConsumer],
  exports: [
    RabbitMQModule,
    PaymentPublisher,
    EmailQueuePublisher,
    EmailConsumer,
  ],
})
export class MessagingModule {}
