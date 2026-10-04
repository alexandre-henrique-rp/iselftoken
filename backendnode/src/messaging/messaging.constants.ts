/**
 * Constantes e contratos da mensageria RabbitMQ do fluxo de pagamentos.
 *
 * Arquitetura (Redis = só cache; RabbitMQ = mensageiro):
 *
 *   [confirmação PAID] ──publish──> exchange "payments" (topic, durable)
 *        routing key = "payment.confirmed"
 *                         │
 *                         ▼
 *   queue "payments.effects" (durable, com DLX) ──consume(ack manual)──>
 *        PaymentEffectsConsumer.processPaymentEffects(purpose)
 *                         │ nack sem requeue após esgotar retries
 *                         ▼
 *   dead-letter exchange "payments.dlx" -> queue "payments.effects.dlq"
 *
 * O webhook EFI (PIX) também passa a publicar aqui em vez do BullMQ/Redis.
 */

/** Exchange principal (topic, durável) do domínio de pagamentos. */
export const PAYMENTS_EXCHANGE = 'payments';

/** Dead-letter exchange para mensagens que esgotaram retries. */
export const PAYMENTS_DLX = 'payments.dlx';

/**
 * Exchange de retry com atraso. Mensagens publicadas aqui caem numa fila de
 * espera (`payments.retry`) com `x-message-ttl`; ao expirar, o dead-letter as
 * devolve à exchange principal (`payments`) preservando a routing key
 * original. Isso implementa BACKOFF sem hot-loop: em vez de `Nack(requeue)`
 * imediato, o consumer republica aqui e a mensagem só reaparece após o TTL.
 */
export const PAYMENTS_RETRY_EXCHANGE = 'payments.retry';

/** Fila de espera do retry (dead-letters de volta para `payments`). */
export const PAYMENTS_RETRY_QUEUE = 'payments.retry';

/** TTL do atraso de retry (ms). */
export const RETRY_DELAY_MS = 30_000;

/** Header que carrega a contagem de tentativas entre republicações. */
export const RETRY_COUNT_HEADER = 'x-retry-count';

/** Fila que processa os efeitos de domínio de um pagamento confirmado. */
export const PAYMENT_EFFECTS_QUEUE = 'payments.effects';

/** Dead-letter queue correspondente. */
export const PAYMENT_EFFECTS_DLQ = 'payments.effects.dlq';

/** Fila que processa o webhook PIX recebido da EFI. */
export const EFI_WEBHOOK_QUEUE = 'payments.efi-webhook';

/** Dead-letter queue do webhook. */
export const EFI_WEBHOOK_DLQ = 'payments.efi-webhook.dlq';

/** Routing keys (topic) publicadas na exchange `payments`. */
export const RoutingKeys = {
  /** Um Payment foi confirmado (PAID). Dispara os efeitos de domínio. */
  PAYMENT_CONFIRMED: 'payment.confirmed',
  /** Um Payment foi cancelado. */
  PAYMENT_CANCELLED: 'payment.cancelled',
  /** Webhook PIX bruto recebido da EFI (para processamento assíncrono). */
  EFI_WEBHOOK_RECEIVED: 'efi.webhook.received',
} as const;

/**
 * Máximo de tentativas de processamento antes de mandar para a DLQ.
 * Combinado com backoff via `x-message-ttl` na fila de retry (ou requeue
 * limitado no consumer). Mantemos conservador para não perder mensagem.
 */
export const MAX_DELIVERY_ATTEMPTS = 5;

/**
 * Mensagem publicada em `payment.confirmed` / `payment.cancelled`.
 * Carrega apenas IDs e metadados não-sensíveis (LGPD) — o consumer relê o
 * Payment do banco para aplicar os efeitos de forma idempotente.
 */
export interface PaymentConfirmedMessage {
  paymentId: number;
  userId: number;
  purpose: string;
  /** Momento em que foi publicada (ISO) — para observabilidade. */
  publishedAt: string;
}

/** Mensagem do webhook PIX bruto enfileirada para processamento. */
export interface EfiWebhookMessage {
  /** Payload cru do webhook EFI. */
  body: unknown;
  /** Chave de idempotência (header idempotency-key ou gerada). */
  idempotencyKey: string;
  receivedAt: string;
}
