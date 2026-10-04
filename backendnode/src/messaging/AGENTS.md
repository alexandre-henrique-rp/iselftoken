# Messaging

**Propósito:** Camada de mensageria assíncrona (RabbitMQ) para o iSelfToken. Cobre 2 domínios:

1. **Payments** (`payments` exchange) — efeitos de domínio após confirmação de pagamento PIX/cartão, webhooks EFI, DLQ e reconciliação.
2. **Emails** (`emails` exchange) — fila de envio de e-mails transacionais disparados pela Central de Notificações (Sprint 2026-10-04).

## Stack

- **Broker:** RabbitMQ 3.13-management (`docker-compose.yml`).
- **Cliente:** `@golevelup/nestjs-rabbitmq` (publisher confirms, retry, DLQ).
- **Conexão:** `connectionInitOptions.wait: true` (aguarda topologia no boot).
- **Reconexão:** `connectionManagerOptions.heartbeatIntervalInSeconds: 15`.

## Topologia

### Domínio: `payments` (existente, inalterado)

| Recurso | Tipo | Configuração |
|---|---|---|
| `payments` | exchange | topic, durable |
| `payments.dlx` | exchange | topic, durable (DLX) |
| `payments.retry` | exchange | fanout, durable (TTL 30s → dead-letter de volta para `payments`) |
| `payments.effects` | queue | binding: `payment.confirmed`, `payment.cancelled`; DLX → `payments.effects.dlq` |
| `payments.effects.dlq` | queue | DLQ de effects |
| `payments.efi-webhook` | queue | binding: `efi.webhook.received`; DLX → `payments.efi-webhook.dlq` |
| `payments.efi-webhook.dlq` | queue | DLQ do webhook |
| `payments.retry` | queue | fanout binding de `payments.retry`; TTL 30s; DLX → `payments` |

### Domínio: `emails` (NOVO — Sprint de Notificações — central 2026-10-04)

**Por que uma fila separada?** A Central de Notificações regra que **toda notificação in-app disparada é acompanhada por e-mail**. Em massa (campanha com 100k founders aprovados no mesmo dia), chamar SMTP inline bloqueia o request do usuário. A fila desacopla:

- **In-app** persiste + WebSocket emite (latência ~50ms).
- **E-mail** entra na fila `emails.send` (latência ~5ms no publish) e é processado por `EmailConsumer` em background.

| Recurso | Tipo | Configuração |
|---|---|---|
| `emails` | exchange | topic, durable |
| `emails.dlx` | exchange | topic, durable (DLX) |
| `emails.retry` | exchange | fanout, durable (TTL 30s → dead-letter de volta para `emails`) |
| `emails.send` | queue | binding: `email.send`; DLX → `emails.send.dlq` |
| `emails.send.dlq` | queue | DLQ de e-mails |
| `emails.retry` | queue | fanout binding de `emails.retry`; TTL 30s; DLX → `emails` |

**Mensagem (JSON, `application/json`):**

```ts
interface EmailQueueMessage {
  to: string;                                  // destinatário (email)
  slug: string;                                // ex: 'compra-tokens', 'plan-added'
  ctx: Record<string, unknown>;                // vars do template
  origin?: string;                             // rastreabilidade (ex: 'investment:42')
  publishedAt: string;                         // ISO timestamp
}
```

**LGPD:** apenas `to` + `slug` + `ctx` (vars do template, sem CPF/telefone/documentos). Nunca incluir PII bruta do user.

## Retry & DLQ — Política

Padrão reaproveitado de `payment-effects.consumer.ts` (ver `messaging.constants.ts`):

- `MAX_DELIVERY_ATTEMPTS = 5` — máximo de tentativas antes de DLQ.
- `RETRY_DELAY_MS = 30_000` — TTL da fila `emails.retry` (backoff 30s).
- `RETRY_COUNT_HEADER = 'x-retry-count'` — header AMQP carregando o contador.

Fluxo:

```
[listener @OnEvent] → publish em "emails" / "email.send"
  ↓
[consumer handleEmailSend] tenta EmailService.sendTemplateBySlug(to, slug, ctx)
  ├─ sucesso → ack
  ├─ falha SMTP transiente → republish em "emails.retry" (TTL 30s) → ack
  │     └─ após TTL → dead-letter de volta para "emails" / "email.send"
  │     └─ retryCount++ → se >= MAX → Nack(false) → "emails.send.dlq"
  └─ falha permanente (template inválido) → Nack(false) → "emails.send.dlq"
```

**Fallback SMTP inline:** se o **publish** no RabbitMQ falhar (broker fora), o `EmailQueuePublisher` chama `EmailService.sendTemplateBySlug` direto. Assim a notificação nunca é perdida, mesmo sem fila. Logado em `error` para Sentry.

## Mapa de Arquivos

| Arquivo | Função |
|---|---|
| `messaging.module.ts` | Conexão RabbitMQ + topologia completa (ambos os domínios) |
| `messaging.constants.ts` | Constantes do domínio `payments` (exchange, queues, routing keys, retry policy, MAX_DELIVERY_ATTEMPTS) |
| `payment.publisher.ts` | `PaymentPublisher` — publica `payment.confirmed` / `payment.cancelled` / `efi.webhook.received` + `republishForRetry` |
| `payment-effects.consumer.ts` | `PaymentEffectsConsumer` — aplica efeitos de domínio (subscription, investment, reservation) |
| `efi-webhook.consumer.ts` | `EfiWebhookConsumer` — processa webhook PIX bruto da EFI |
| `dlq-monitor.consumer.ts` | `DlqMonitorConsumer` — observabilidade das DLQs (log + AuditLog) |
| `email-queue.constants.ts` | Constantes do domínio `emails` (NOVO) |
| `email-queue.publisher.ts` | `EmailQueuePublisher` — publica `email.send` + fallback SMTP inline (NOVO) |
| `email.consumer.ts` | `EmailConsumer` — consome `email.send` e envia via SMTP (NOVO) |
| `email-queue.publisher.spec.ts` | Testes Jest do publisher (NOVO) |
| `email.consumer.spec.ts` | Testes Jest do consumer (NOVO) |

## Quando usar qual publisher

| Cenário | Publisher |
|---|---|
| Notificar in-app + e-mail (regra de negócio: "toda notificação tem e-mail") | `EmailQueuePublisher.publishSend()` |
| Webhook EFI confirmado | `PaymentPublisher.publishPaymentConfirmed()` / `publishEfiWebhook()` |
| Cancelamento de pagamento | `PaymentPublisher.publishPaymentCancelled()` |

## Anti-patterns

- ❌ Chamar `EmailService.sendTemplateBySlug` direto no listener — usar sempre `EmailQueuePublisher.publishSend()` (mantém fila + fallback).
- ❌ Chamar `EmailService.sendTemplateBySlug` no consumer para re-tentar — o consumer já chama (linha de frente). Em falha, ele republica na retry queue.
- ❌ Logar o payload inteiro do `EmailQueueMessage` em erro — pode conter PII do destinatário. Logar apenas `slug` + `origin` + (opcional) `to` mascarado.
- ❌ Criar nova exchange / fila sem documentar aqui + atualizar `messaging.module.ts` na mesma PR.

## Variáveis de ambiente

```bash
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASS=admin             # S35: sem default aqui; env.schema.ts valida
```

**Healthcheck:** `GET /ready` reporta `rabbitmq: true|false` (`src/common/health.controller.ts`).
