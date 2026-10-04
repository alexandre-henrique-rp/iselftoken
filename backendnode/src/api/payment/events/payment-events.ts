/**
 * @description Constantes e tipos para os eventos do Hub de Pagamentos v3.
 *
 * Substituem as chamadas inline (ex: `activateSubscriptionForPayment` chamada
 * diretamente de `processWebhookPaymentReceived`). Apos migrar para
 * eventos, o PaymentService NAO conhece as regras de dominio (Subscription,
 * Investment). Cada modulo de dominio se inscreve via @OnEvent.
 *
 * Convencao de nomes:
 * - payment.confirmed    - disparado quando um Payment vira PAID
 * - payment.cancelled    - disparado quando um Payment vira CANCELED
 * - payment.refunded     - disparado quando um Payment vira REFUNDED
 *
 * Wildcard: payment.* no EventEmitterModule.forRoot() cobre todos eles.
 */
export const PaymentEvents = {
  CONFIRMED: 'payment.confirmed',
  CANCELLED: 'payment.cancelled',
  REFUNDED: 'payment.refunded',
} as const;

export type PaymentEventName =
  (typeof PaymentEvents)[keyof typeof PaymentEvents];

/**
 * Payload minimo de cada evento. Carregamos o Payment completo (ja
 * hidratado do Prisma) para que os listeners possam decidir o que fazer
 * sem precisar re-buscar.
 *
 * LGPD: o `Payment` carrega `userId`, `amount`, `purpose`, `status`,
 * `subscriptionId`, `investmentId`, `campaignId` (todos Int) e IDs de
 * auditoria. NUNCA inclui dados sensiveis do User (CPF, etc) — o
 * listener pode faze findUnique separado se precisar.
 */
export interface PaymentConfirmedEvent {
  paymentId: number;
  payment: {
    id: number;
    userId: number;
    purpose: string;
    status: string;
    amount: any; // Decimal serializa como string no emitter
    subscriptionId: number | null;
    investmentId: number | null;
    campaignId: number | null;
    endToEndId: string | null;
    txid: string | null;
    paidAt: Date | null;
  };
}

export interface PaymentCancelledEvent {
  paymentId: number;
  payment: PaymentConfirmedEvent['payment'];
  reason?: string;
}

export interface PaymentRefundedEvent {
  paymentId: number;
  payment: PaymentConfirmedEvent['payment'];
  reason?: string;
}
