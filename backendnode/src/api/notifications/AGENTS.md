# Notifications

**Propósito:** Central de notificações in-app **e** e-mail para usuários autenticados. Persistência Prisma + push real-time via WebSocket + fila de e-mails RabbitMQ (Sprint 2026-10-04).

## Regra de Ouro (CASE.md [Notificações] — central e fila de e-mails)

> **Toda notificação in-app disparada é obrigatoriamente acompanhada por e-mail.**

Implementação:

```
Domain event (@OnEvent)
  └─► listener em UserNotificationService / StartupNotificationService / RepassesNotificationService
       │
       ├─► await notificationsService.create()  ← IN-APP PRIMEIRO (sync, persistido + WS)
       │
       └─► emailQueue.publishSend({to, slug, ctx, origin})  ← E-MAIL DEPOIS (fila)
             │
             ├─► RabbitMQ "emails" / "email.send"  (happy path)
             │     └─► EmailConsumer → EmailService.sendTemplateBySlug
             │
             └─► Fallback SMTP inline (se broker fora)  (resilência)
```

**Ordem garantida** — o `await notificationsService.create()` completa ANTES do `emailQueue.publishSend()`. WebSocket emite no momento do `create()` (sala `user:{userId}`).

## Stack Real-Time (inalterado)

- Transporte: **socket.io** (`@nestjs/platform-socket.io` + `@nestjs/websockets`)
- Multi-instância: **Redis adapter** (`@socket.io/redis-adapter`)
- Auth: **cookie HTTP-only** `session_id`
- Salas: **1 por userId** (`user:{userId}`)
- Rate limit: **5 conexões/userId** (LRU)

## Stack E-mail (NOVO — Sprint 2026-10-04)

- **Fila:** RabbitMQ exchange `emails` (topic) + queue `emails.send` + DLQ `emails.send.dlq` + retry com TTL 30s. Ver `src/messaging/AGENTS.md`.
- **Publisher:** `EmailQueuePublisher.publishSend()` — único ponto de envio de e-mail a partir de listeners. Tem fallback SMTP inline se broker indisponível.
- **Consumer:** `EmailConsumer` — `@RabbitSubscribe` em `emails.send`, chama `EmailService.sendTemplateBySlug` (banco primeiro, hardcoded fallback).
- **Retry policy:** `MAX_DELIVERY_ATTEMPTS=5`, `RETRY_DELAY_MS=30_000` — mesmo padrão de `payment-effects.consumer`.

## Cenários cobertos (16 + 6 repasses)

Central de Notificações — todos com **in-app + e-mail**:

| # | Evento | In-app title | E-mail slug |
|---|---|---|---|
| 1 | `payment.confirmed → SUBSCRIPTION` (1ª) | "Novo perfil ativado" | `plan-purchased` |
| 2 | `payment.confirmed → SUBSCRIPTION` (adicional) | "Perfil adicional ativado" | `plan-added` |
| 3 | `user.activated` | "Conta aprovada" | `user-approved` |
| 4 | `user.suspended` | "Conta suspensa" | `user-suspended` |
| 5 | `payment.confirmed → INVESTMENT` | "Compra de tokens confirmada" + startup | `compra-tokens` |
| 6 | `startup.payment.confirmed` | "Pagamento confirmado!" | `startup-pagamento-confirmado` |
| 7 | `startup.stage1.completed` (3 in-app) | criar / próximo / pendência | `startup-etapa1-concluida` |
| 8 | `startup.phase_approved` (Fase 1) | "Fase N aprovada" | `fase-aprovada` |
| 9 | `startup.stage2.completed` | "Fase 2 concluída" | `startup-etapa2-concluida` |
| 10 | `startup.phase_approved` (Fase 2) | "Fase N aprovada" | `fase-aprovada` |
| 11 | `startup.stage3.completed` (2 in-app) | "Quase lá" / "Pendência Taxa" | `startup-etapa3-concluida` + `startup-pagamento-confirmado` |
| 12 | `startup.phase_approved` (Fase 3) | "Fase N aprovada" | `fase-aprovada` |
| 13 | `startup.approved` (gate final) | "Startup aprovada!" | `startup-aprovada` |
| 14 | `startup.rejected` | "Ajustes pelo Compliance" | `startup-rejeitada` |
| 15 | `startup.document.rejected` | "Documento rejeitado" | `startup-documento-rejeitado` |
| 16 | `kyc.user.decided → APPROVED` | "KYC aprovado" | `kyc-approved` |

**Repasses (in-app + e-mail):** `installment.requested` / `installment.approved` / `installment.rejected` / `installment.completed` / `repasse.configured` / `repasse.concluded`.

## Multi-linha (`buildMultilineDescription`)

Backend grava descrições com `\n\n` entre parágrafos. Frontend renderiza com `whitespace-pre-wrap` em `notification-card.tsx`. Ver `description.helpers.ts` para o helper.

## Dependências

- `../../auth` (AuthGuard + SessionService)
- `src/common/dto/response.dto` (wrapper)
- `src/realtime` (SocketIoAdapter)
- `src/prisma` (persistência)
- `src/messaging` (EmailQueuePublisher, EmailConsumer)
- `src/email` (EmailService — fallback SMTP inline)

## Mapa de Arquivos

| Arquivo | Função |
|---|---|
| [notifications.module.ts](notifications.module.ts) | Módulo NestJS (registra service + gateway + UserNotificationService) |
| [notifications.controller.ts](notifications.controller.ts) | Rotas REST: GET page (com `types[]` multi-valor), GET unread-count, POST mark-as-read, POST mark-all-as-read, POST dev/trigger |
| [notifications.service.ts](notifications.service.ts) | Persistência Prisma + emit WS best-effort + ordenação `createdAt DESC` |
| [notifications.gateway.ts](notifications.gateway.ts) | Gateway socket.io no namespace `/notifications` — relay de `notification` / `payment.*` / `kyc.decided` |
| [user-notification.service.ts](user-notification.service.ts) | 6 listeners: `payment.confirmed → INVESTMENT` / `SUBSCRIPTION` / `user.activated` / `user.suspended` / `kyc.user.decided → APPROVED` |
| [description.helpers.ts](description.helpers.ts) | `buildMultilineDescription()` — helper para juntar parágrafos com `\n\n` |
| [dto/query-notifications.dto.ts](dto/query-notifications.dto.ts) | `NotificationType` enum (18 valores) + `QueryNotificationsDto` (aceita `type` single OU `types[]` CSV) |
| `notifications.service.spec.ts` | 6 testes |
| `notifications.gateway.spec.ts` | 14 testes |
| `user-notification.service.spec.ts` | 11 testes (6 listeners + regra de ORDEM) |
| `description.helpers.spec.ts` | 6 testes do helper |

## Fluxo de Push (detalhado)

```
Domain event (startup.payment.confirmed, kyc.resubmission, payment.confirmed, etc)
  └─► UserNotificationService / StartupNotificationService / RepassesNotificationService
       │  listener @OnEvent handler
       │
       ├─► await notificationsService.create(userId, title, desc, type)
       │     ├─► prisma.notification.create (persistência)
       │     └─► gateway.emitToUser(userId, 'notification', payload)  ← best-effort
       │           └─► socket.io Redis adapter → sala 'user:{userId}'
       │
       └─► void emailQueue.publishSend({to, slug, ctx, origin})  ← async, fire-and-forget
             ├─► RabbitMQ publish em "emails" / "email.send"
             │     └─► EmailConsumer handleEmailSend
             │           └─► EmailService.sendTemplateBySlug(to, slug, ctx)
             │                 ├─► EmailTemplatesService.renderBySlug (banco)
             │                 └─► hardcoded fallback (templates/*.ts)
             │
             └─► Fallback: EmailService.sendTemplateBySlug (sync, sem fila)
                   (acionado quando broker indisponível)
```

## Garantia de Isolamento

- Toda conexão socket.io entra em **exatamente uma sala**: `user:{userId}`.
- `userId` vem de `SessionService.getSession(cookie.session_id)` no `handleConnection`.
- `emitToUser(userId, …)` sempre mira a sala do destinatário correto.
- **Sem broadcast, sem sala por role** — garantia de que cada user só recebe o que é dele.

## Best-Effort (resiliência)

- Falha de WS (emit, connect_error) é logada mas **nunca propaga**. Frontend tem polling de 60s como fallback.
- Falha do publish RabbitMQ no `EmailQueuePublisher` é logada e cai em fallback SMTP inline.
- Falha do SMTP no consumer é republicada em `emails.retry` (TTL 30s) até `MAX_DELIVERY_ATTEMPTS=5`, depois Nack → DLQ.

## LGPD

Logs estruturados usam apenas `userId` (opaco) + `slug` + `origin` (sem PII). Nunca logar `session_id`, `to` (email), CPF, telefone em texto livre. Mensagens de notificação podem conter PII do destinatário (ex: nome de startup) — é conteúdo da notificação, não log.

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `SOCKET_IO_CORS_ORIGINS` | `http://localhost:5173` | Origens permitidas (comma-separated). Prod: `https://iselftoken.com` |
| `REDIS_HOST` | `localhost` | Pub/sub do socket.io usa Redis principal |
| `REDIS_PORT` | `6379` | — |
| `RABBITMQ_HOST` | `localhost` | Fila de e-mails |
| `RABBITMQ_PORT` | `5672` | — |

## Anti-patterns

- ❌ Disparar in-app e e-mail em paralelo (`Promise.all`) — quebra a ordem garantida. Sempre `await` in-app antes.
- ❌ Concatenar strings de descrição sem `\n\n` entre parágrafos — usar `buildMultilineDescription()`.
- ❌ Bloquear o request do usuário com SMTP síncrono — sempre via fila (fallback inline é defensivo).
- ❌ Persistir PII (CPF, e-mail pessoal, telefone) em logs do publisher/consumer.
- ❌ Criar notificação sem e-mail correspondente — viola a regra de "toda notificação = e-mail".
- ❌ Escrever `Notification.type` fora dos 18 valores do enum — bloqueado por trigger SQLite (migration 20261011000000).
