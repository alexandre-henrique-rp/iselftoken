/**
 * Constantes da fila de envio de e-mails.
 *
 * Arquitetura (Sprint de Notificacoes — central de notificacoes):
 *
 *   [listener @OnEvent] ──publish──> exchange "emails" (topic, durable)
 *        routing key = "email.send"
 *                         │
 *                         ▼
 *   queue "emails.send" (durable, com DLX) ──consume(ack manual)──>
 *        EmailConsumer → EmailService.sendTemplateBySlug(to, slug, ctx)
 *                         │ nack sem requeue apos esgotar retries
 *                         ▼
 *   dead-letter exchange "emails.dlx" -> queue "emails.send.dlq"
 *
 * Caso o broker esteja indisponivel no momento do publish, o
 * `EmailQueuePublisher` cai em fallback SMTP inline (chama
 * `EmailService.sendTemplateBySlug` direto) para nao perder a notificacao.
 *
 * LGPD: o payload carrega apenas `to` (email) + `slug` (template) + `ctx`
 * (variaveis do template, sem CPF/telefone/documentos).
 */

/** Exchange principal (topic, duravel) do dominio de envio de e-mails. */
export const EMAILS_EXCHANGE = 'emails';

/** Dead-letter exchange para mensagens que esgotaram retries. */
export const EMAILS_DLX = 'emails.dlx';

/**
 * Exchange de retry com atraso. Mensagens publicadas aqui caem numa fila de
 * espera com `x-message-ttl`; ao expirar, o dead-letter as devolve a exchange
 * principal `emails` preservando a routing key original. Backoff sem hot-loop.
 */
export const EMAILS_RETRY_EXCHANGE = 'emails.retry';

/** Fila de espera do retry. */
export const EMAILS_RETRY_QUEUE = 'emails.retry';

/** Fila principal que processa o envio de e-mail. */
export const EMAILS_SEND_QUEUE = 'emails.send';

/** Dead-letter queue correspondente. */
export const EMAILS_SEND_DLQ = 'emails.send.dlq';

/** Routing keys (topic) publicadas na exchange `emails`. */
export const EmailRoutingKeys = {
  /** Disparar envio de e-mail (caso canonico). */
  EMAIL_SEND: 'email.send',
} as const;

/**
 * Mensagem enfileirada para envio de e-mail via fila.
 * O consumer (EmailConsumer) usa `to` + `slug` + `ctx` para renderizar
 * e enviar via EmailService (template do banco OU hardcoded fallback).
 */
export interface EmailQueueMessage {
  /** Endereco do destinatario (ja validado em `dispatch`). */
  to: string;
  /** Slug do template (ex: 'startup-aprovada', 'compra-tokens', 'plan-added'). */
  slug: string;
  /** Contexto interpolado no template (variaveis mustache-like). */
  ctx: Record<string, unknown>;
  /** Origem do disparo (rastreabilidade LGPD — apenas nome logico). */
  origin?: string;
  /** Momento em que foi publicada (ISO). */
  publishedAt: string;
}
