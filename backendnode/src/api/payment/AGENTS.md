# Payment Module — Pagamentos (C6 Bank)

## Estado atual

Módulo NestJS que orquestra cobranças PIX e pagamentos via webhook, **além do repasse de fundos (B12)** às startups (NF + 3 parcelas via gateway C6).

## Modelo

`Payment` (`prisma/schema.sqlite.prisma`, model Payment):

- `purpose: PaymentPurpose` — `SUBSCRIPTION | INVESTMENT | TOKEN_RESERVATION | EARLY_ACCESS | P2P_BUY | VERIFICATION_SEAL`. Define a regra de negócio aplicada quando o pagamento confirma.
- `subscriptionId / investmentId / campaignId` — relacionamentos opcionais conforme `purpose`.
- `method: PaymentMethod`, `status: PaymentStatus` (default `PENDING`).
- EFI/C6 fields: `txid` (unique), `endToEndId`, `qrCodeBase64`, `copyPastePix`, `efiChargeId`, `paidAt`.
- **`effectsAppliedAt: DateTime?`** — marco de aplicação dos efeitos de domínio. A idempotência e a reconciliação se ancoram AQUI (não em `status===PAID`); um Payment PAID sem `effectsAppliedAt` é reprocessável (evita pago-sem-plano). Preenchido por `PaymentService.processPaymentEffects`.

## Endpoints

| Método | Rota                                     | O que faz                                                                                                                 |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/payment`                               | Cria Payment PENDING. Body: `{amount, method, purpose, subscriptionId?, investmentId?, campaignId?}`.                     |
| GET    | `/payment`                               | Lista paginada (admin/owner).                                                                                             |
| GET    | `/payment/:id`                           | Detalhe pelo id.                                                                                                          |
| POST   | `/payment/:id/pix`                       | Gera PIX QR (delega ao `IC6PixAdapter`; real ou mock por `C6_MODE`).                                                      |
| POST   | `/payment/:id/card`                      | Gera checkout hospedado de cartão C6 e retorna a URL pra redirect.                                                        |
| POST   | `/payment/:id/dev/simulate-paid`         | **Dev-only** (403 em prod): dispara o mesmo path do webhook, marcando o Payment como PAID e emitindo `payment.confirmed`. |
| PATCH  | `/payment/:id`                           | Update genérico.                                                                                                          |
| DELETE | `/payment/:id`                           | Stub.                                                                                                                     |
| POST   | `/webhooks/c6-bank`                      | Recebe `PIX_RECEIVED`, eventos `CHECKOUT` (cartão) e `TRANSACTION_STATUS_CHANGED`. Retry 3x com backoff.                  |
| GET    | `/founder/startups/:id/repasse`          | Consulta status do repasse (NF + 3 parcelas). B12.                                                                        |
| POST   | `/founder/startups/:id/repasse/initiate` | Inicia repasse (cria NF + 3 parcelas). Idempotente. B12.                                                                  |

## Fluxo de confirmação e ativação (RabbitMQ — 2026-09)

> **Redis = só cache; RabbitMQ = mensageiro.** O antigo pipeline BullMQ/Redis
> do webhook foi removido. Ver `src/messaging/*`.

```
Confirmação (PIX webhook | cartão | aprovação manual | sync | cron)
   ↓
PaymentService.processWebhookPaymentReceived(txid, e2eId)
   • marca Payment = PAID (se ainda não estava)
   • idempotência ANCORADA em effectsAppliedAt (não em status===PAID):
       - PAID + effectsAppliedAt != null  → no-op
       - PAID + effectsAppliedAt == null  → REPROCESSA efeitos (recuperação)
   ↓
dispatchOrApplyEffects(paymentId)
   • publica payment.confirmed no RabbitMQ (exchange `payments`, persistent)
   • FALLBACK: se o publish falhar (broker fora) → aplica efeitos inline
   ↓
PaymentEffectsConsumer (fila payments.effects, ack manual)
   ↓
PaymentService.processPaymentEffects(paymentId)   ← FONTE ÚNICA, idempotente
   • por purpose, em $transaction (relê-de-status):
       SUBSCRIPTION      → subscription ACTIVE (startedAt, expiresAt=+periodoMeses)
       INVESTMENT        → confirmInvestment (CONFIRMED + tokensSold + tokens)
       TOKEN_RESERVATION → cria Startup + Campaign DRAFT (reservationFeePaid) a partir do StartupDraft (regra documentada em CASE.md §"[Cadastro] — Criação da Campaign DRAFT na confirmação da reserva")
        FAST_TRACK_REVIEW → audit-only (`auditFastTrackStandalonePayment`); o efeito real `Startup.fastTrackReview=true` é setado dentro de `processTokenReservationPayment` quando a Startup é criada. Documentado em CASE.md §"[Pagamento] — Fast Track Review (S18.6, checkout consolidado)".
   • grava effectsAppliedAt = now  (só se os efeitos NÃO lançaram)
   • invalida a sessão Redis do usuário (SessionService.refreshUserSubscriptions)
```

**Garantias de "não perder pagamento":**

- **Idempotência** via `effectsAppliedAt` — reentrega/retry não duplica; PAID-sem-efeito é recuperável.
- **Reconciliação (backstop):** cron `reconcilePaidWithoutEffects` (5min) reaplica efeitos de Payments `PAID` com `effectsAppliedAt = null` e `paidAt` fora da folga.
- **Retry com backoff:** falha no consumer → republica na fila de espera `payments.retry` (`x-message-ttl` 30s + DLX de volta a `payments`), sem hot-loop. Após `MAX_DELIVERY_ATTEMPTS` (5) → DLQ.
- **DLQ observável:** `DlqMonitorConsumer` loga ERROR + `AuditLog PAYMENT_DLQ` nas DLQs (`payments.effects.dlq`, `payments.efi-webhook.dlq`).
- **Sessão:** `refreshUserSubscriptions` atualiza `subscriptions` in-place (sem deslogar); `AuthGuard.touchLastAccess` não sobrescreve subscriptions stale (elimina rebote para /pricing).

**Mensageria — arquivos (`src/messaging/`):**

| Arquivo | Papel |
| --- | --- |
| `messaging.module.ts` | Conexão RabbitMQ + topologia (exchange `payments` topic, DLX, filas + DLQ, `payments.retry`). |
| `messaging.constants.ts` | Nomes de exchange/filas/routing keys, `MAX_DELIVERY_ATTEMPTS`, `RETRY_DELAY_MS`, shapes das mensagens. |
| `payment.publisher.ts` | Publica `payment.confirmed`/`payment.cancelled`/webhook (persistent + confirms) e `republishForRetry`. |
| `payment-effects.consumer.ts` | Consome `payment.confirmed`/`payment.cancelled`; aplica efeitos; retry/DLQ. |
| `efi-webhook.consumer.ts` | Consome o webhook PIX cru; delega a `processWebhookPaymentReceived`; retry/DLQ. |
| `dlq-monitor.consumer.ts` | Observabilidade das DLQs (log + AuditLog + runbook de replay). |

**Eventos (EventEmitter in-process — apenas NOTIFICAÇÃO):** `payment.confirmed`/`payment.cancelled` também são emitidos via EventEmitter2 (shape aninhado, ver `events/payment-events.ts`), mas os efeitos de domínio são aplicados por `processPaymentEffects`, não pelos listeners. O listener em `subscriptions.service.ts` é no-op (observabilidade).

**Health:** `GET /ready` reporta `{ database, rabbitmq }`.

## Roadmap por fase

Ver `docs/superpowers/plans/2026-05-14-c6-payments-integration.md` para o plano completo.

- **P0** ✅ — Activation gap + env vars + este AGENTS.md.
- **P1** ✅ — `C6Config` (env + mTLS dispatcher undici), `C6AuthService` (OAuth client_credentials + cache Redis), `C6HttpClient` (Bearer + retry 401). `RedisModule` reexporta `IoredisModule`.
- **P2** ✅ — `C6PixAdapter` real (POST /v2/pix/cob) + `C6PixMockAdapter` (EMV local). Factory por `C6_MODE` injeta o adapter certo. `PaymentService.generatePix` delega ao adapter. `pix-emv.util.ts` constrói BR Code estático (mock) ou dinâmico (real, com `location` do C6). Webhook PIX trata `payload.pix` como array (formato BACEN). Anti-pattern de EMV inline no `PaymentService` foi removido.
- **P3** ✅ — `C6CheckoutAdapter` real (POST /v1/checkouts/) + `C6CheckoutMockAdapter` (URL `/dev/checkout-mock/:paymentId`). Hosted checkout: o C6 hospeda a página de cartão, frontend redireciona o user pra `url` retornada. `external_reference_id: "payment-<id>"` permite mapear webhook de volta. Endpoint novo: `POST /payment/:id/card`. Webhook gateia eventos `CHECKOUT` (PAID emite `payment.confirmed`; DECLINED/EXPIRED/CANCELLED/ERROR emitem `payment.cancelled`).
- **P4** ✅ — Endpoint dev `POST /payment/:id/dev/simulate-paid` que reusa `processWebhookPaymentReceived` para marcar PAID + emitir `payment.confirmed`. Gate: 403 se `NODE_ENV === 'production'`. Ownership check pelo userId. Idempotente (PAID → no-op). Quando o Payment ainda não tem `txid`, gera `DEV-SIM-<id>-<ts>` antes de chamar o pipeline.
- **P5** ✅ — Frontend `/checkout/payment/:id` com `PixPayment` (QR + polling) ou `CreditCardRedirect` (hosted). Pricing.tsx agora cria Subscription PENDING + Payment + navega. (Pertence ao submodule `frontend`.)
- **P6 (atual)** ✅ — Catálogo de erros C6 RFC 7807 (`c6/c6-errors.map.ts`): tipos, severity, retryable, builder de URL doc. `C6HttpError` carrega `parsed: C6ParsedError` com `code`, `correlationId`, `detail`. Webhook usa o catálogo pra log estruturado de eventos CHECKOUT terminais não-PAID. Cron `PaymentCronService` (`@nestjs/schedule` v4) roda hourly e expira Payments PENDING > 24h pra CANCELED. **Limitação:** versão simples (expira por tempo); reconciliação smart (consultar status no C6 antes de cancelar) precisa de métodos `queryStatus` nos adapters, fica como follow-up.

## B12 — Repasse de Fundos

Implementa o fluxo de repasse de fundos arrecadados em campanhas equity crowdfunding:

- `FundTransferService` (`fund-transfer.service.ts`):
  - `initiateTransfer(startupId, userId, role)` — busca investments CONFIRMED, gera NF sequencial (formato `NF-<ANO>-<SEQUENCIAL>`), cria 3 FundTransfer (parcela 1 = now, 2 = now+30d, 3 = now+60d). Idempotente: retorna NF existente se já iniciado.
  - `getTransferStatus(startupId, userId, role)` — consulta NF + 3 parcelas com status atual.
  - `processScheduledTransfers()` — busca parcelas PENDING vencidas, chama `IC6PixAdapter.transferBancario()` (C6), atualiza status (COMPLETED/FAILED) + AuditLog.
- `FundTransferCronService` (`fund-transfer-cron.service.ts`): roda diariamente às 09:00 BRT (timezone `America/Sao_Paulo`).
- `FundTransferController` (`fund-transfer.controller.ts`): endpoints `GET /:id/repasse` e `POST /:id/repasse/initiate` (registrado no `StartupModule`).
- `IC6PixAdapter.transferBancario(input)`: novo método que chama `POST /v2/transferencias` no C6 (mock retorna sucesso imediato).

**LGPD:** dados bancários (conta, agência, documento do titular) NUNCA são logados em plaintext. Apenas IDs gerados e valores monetários aparecem nos logs.

**Validações:**

- Transfer só pode ser iniciado se `campaign.status === 'FUNDED'`
- Idempotência: chamar 2x retorna existente (200, não 201 novo)
- Somente o founder owner pode initiate/get (ADMIN bypassa)
- Cron processa apenas PENDING + scheduledDate <= now
- Bank account data vem da startup (campos `banco/agencia/conta/digito/tipo_conta/pix_key/titular/documento_titular`)

**Coverage:** 98%+ lines, 100% functions (35 testes cobrindo service + cron + controller).

**BUG-FT-001 (system actions no AuditLog):** `processScheduledTransfers()` é chamado pelo `FundTransferCronService` (ação de sistema, sem User actor). O `AuditLog.userId` é **nullable** desde o fix BUG-FT-001 — antes era hardcoded `userId: 0`, o que quebrava FK em DB limpo. As 3 chamadas de `auditLog.create()` no service agora usam `userId: null` (não `userId: 0`). Migration: `20260717000000_make_auditlog_user_nullable`. Testes: bloco `BUG-FT-001 — AuditLog de ações de sistema` em `fund-transfer.service.spec.ts`. Workaround de criar `User system id=0` via raw SQL no E2E (`fund-transfer.e2e-spec.ts`) foi removido.

## Modo de operação (`C6_MODE`)

| Valor                   | Comportamento                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `mock` (default em dev) | Adapter local: gera EMV próprio, simula respostas — **não chama C6**. Útil para tests/CI. |
| `sandbox`               | Chama `https://baas-api-sandbox.c6bank.info`. Credenciais sandbox.                        |
| `prod`                  | Chama `https://baas-api.c6bank.info`. ⚠️ Pagamentos reais.                                |

Switch entre adapters via DI factory em `payment.module.ts` (entra na Fase 1).

## Anti-patterns conhecidos

- **`payment.service.ts:remove`** é stub (`return "This action removes..."`) — endpoint não deveria estar exposto. Decidir: remover ou implementar.

## Convenções

- Erros via `HttpException` ou `ResponseDto.error()`.
- Logs via `Logger` do NestJS, nunca `console.log`.
- TXIDs PIX: 26 chars max, prefixo `ISelf` + hex random.
- Idempotência de webhook: short-circuit se `payment.status === "PAID"`.

## Parcelamento (R2 S06)

Módulo de configuração de parcelamento com juros compostos.

### Endpoints Admin (`/admin/installments`)

| Método | Rota                          | Permissão        | O que faz                                 |
| ------ | ----------------------------- | ---------------- | ----------------------------------------- |
| POST   | `/admin/installments`         | ADMIN/FINANCEIRO | Cria nova config (fecha vigente anterior) |
| GET    | `/admin/installments`         | ADMIN/FINANCEIRO | Lista histórico paginado                  |
| GET    | `/admin/installments/vigente` | ADMIN/FINANCEIRO | Retorna config vigente                    |
| DELETE | `/admin/installments/:id`     | ADMIN/FINANCEIRO | Soft delete (effectiveUntil=now)          |

### Cálculo de Juros

Fórmula: M = P × (1 + i)^n

- `principal` = valor total
- `n` = número de parcelas (1..18)
- `i` = taxa mensal (ex: 0.0299 = 2.99%)
- `installmentAmount` = M / n (arredondado 2 casas)

Quando um Payment é criado com `method=CREDIT_CARD` + `installments`, o snapshot é persistido em `Payment.serviceDetails.installmentSnapshot` (JSON congelado — imutável).

### Persistência de `Payment.method` no cartão (BUG-FIX 2026-10-05)

`PaymentService.generateCardCheckout` (linhas ~2076–2093 de `payment.service.ts`) atualiza o campo `method` para `'CREDIT_CARD'` **dentro do `updateMany` do lock de emissão**, antes de chamar `processWebhookPaymentReceived`. Sem isso, Payments criados pelo wizard com default `method='PIX'` permaneciam com PIX no banco mesmo após liquidação via cartão — bug que afetava o label exibido em `/user/payments`, `/pending-payments-card` e `/admin/payments`.

Quando `installments > 1`, o serviço também persiste `serviceDetails.installments`. Backfill histórico aplicado em `prisma/migrations-sqlite/20261005000000_backfill_card_payment_method/` corrige o legado via `UPDATE Payment SET method='CREDIT_CARD' WHERE efiChargeId IS NOT NULL AND method='PIX'` (idempotente).

### Arquivos

- `service/installment-calculator.service.ts` — matemática pura
- `service/installment-config.service.ts` — CRUD + vigente + histórico
- `guards/installment-config-permission.guard.ts` — ADMIN/FINANCEIRO only
- `controller/installment-config.controller.ts` — endpoints admin
- `dto/create-installment-config.dto.ts` — validações

### Validações

- `maxInstallments` ≤ 18 (limite EFI)
- `installments=1` → sem juros (totalWithInterest = principal)
- `installmentAmount` ≥ `minInstallmentAmount` da config vigente
- Apenas 1 config pode estar vigente por vez (effectiveUntil=null)
