# BACKEND KNOWLEDGE BASE

**Scope:** NestJS 10 API (port 7077) — Prisma 7 + SQLite, JWT + 2FA email, RabbitMQ (pagamentos) + Redis (cache/sessão) + Socket.IO (real-time), AWS S3 (object storage), PKI interna (assinatura digital)
**Last updated:** 2026-10-03 (S18.7 — PaymentOrder+Items cutover)

## PAYMENT DATA MODEL (S18.7)

**Source-of-truth: `PaymentOrder` + `PaymentItem` (since Sprint 2026-10-03)**

Refator do modelo de pagamento consolidado. Antes: 1 ordem gerava 2 Payment
records irmãos com estado independente (permitia bug "1 PAID + 1 PENDING").
Depois: 1 PaymentOrder tem N PaymentItems, e o estado (status/paidAt/txid) é
携带 na Order (atômico). Items herdam o estado.

**Componentes:**

| Model | Papel | Status |
|---|---|---|
| `PaymentOrder` | Fonte da verdade do estado (status, paidAt, txid, method) | Ativo |
| `PaymentItem` | Breakdown financeiro: `unitPrice × quantity = subtotal`, `originalSubtotal`, `discountAmount` | Ativo |
| `Payment` | Legacy, mantido para retrocompat durante cutover | **DEPRECATED** |

**Fluxo atual:**

1. **Criação** (`_createOrderWithItems` em `payment.service.ts`):
   - Cria 1 PaymentOrder + N PaymentItems em transação atômica
   - Dual-write: também cria N Payment records legados com `paymentGroupId` apontando para a âncora
   - Usado por `createStartupCheckout`, `createComplianceFee`, `create`

2. **Migração de dados legados** (`scripts/backfill-payment-orders.ts`):
   - Detecta pares COMPLIANCE_FEE + FAST_DEPLOY na mesma campanha
   - Detecta Payments standalone
   - Cria 1 PaymentOrder + N PaymentItems para cada
   - Marca `paymentGroupId` nos Payments legados
   - Idempotente: pula Orders já criadas
   - Modo dry-run (default) + `--apply`

3. **Reconciliação de pagamento** (`processWebhookPaymentReceived`):
   - Webhook PIX chega → busca por `txid`
   - Reconcilia siblings: FAST_TRACK_REVIEW via StartupDraft + FAST_DEPLOY via campaignId
   - Marca atomicamente: status, paidAt, txid/efiChargeId

4. **Cutover planejado** (Fase 6.5 — não aplicada):
   - Migration `20261003030000_drop_payment_legacy_table` PRONTA mas NÃO aplicada
   - Requer refatorar 19 arquivos que ainda usam `prisma.payment.*` (112 usos)
   - Após cutover: `prisma.payment` removido, todos os consumers leem de `PaymentOrder`/`PaymentItem`

**Endpoits afetados:**

- `findOne` retorna `order` + `items[]` quando disponíveis (helper `buildOrderSummaryForPayment`)
- `getStartupPaymentStatus` (admin) retorna `payments[]` com breakdown por item
- `findAll` ainda retorna Payments legados (dual-shape até cutover)

## STRUCTURE

```bash
src/
├── api/                            # 35 feature modules (NestJS @Module)
│   ├── admin/                      # Painel administrativo: startups, users, kyc, payments, payouts, plans, financeiro, security-audit, audit-logs, document-requests
│   ├── affiliate/                  # Programa de afiliados: candidatura, comissão, triagem
│   ├── auth                        # (ver src/auth/)
│   ├── backup/                     # (ver src/backup/)
│   ├── campaigns/                  # Rodadas de captação (campaign) com extension, allocation, audit
│   ├── categories/                 # Categorias + Áreas de Atuação (lookup)
│   ├── config/                     # Config plataforma: fundraising-config + system-config
│   ├── country/                    # Countries / States / Cities (geo lookup)
│   ├── depoimento/                 # Depoimentos públicos de investidores
│   ├── email-templates/            # Templates de e-mail (FIN-05): CRUD + render + LGPD validator
│   ├── founder/                    # Founder-only: document-requests, services, termo-adesao (PKI signing)
│   ├── geral/                      # Utilidades: CNPJ/CEP lookup, healthchecks auxiliares
│   ├── history/                    # Histórico consolidado (auditoria de transações)
│   ├── installment-requests/       # Solicitações de parcela (FIN-10): founder cria/dashboard
│   ├── investments/                # Investimentos (CONFIRMED) por startup; agregado my-startups
│   ├── marketplace/                # Vitrine pública + curated-picks + early-access + score-calculator + cron
│   ├── notifications/              # Notificações persistentes + Socket.IO gateway (WebSocket)
│   ├── payment/                    # Pagamentos (PIX + Cartão via EFI): account, coupons, fund-transfer, refund, split, events, guards, service
│   ├── plans/                      # Planos de assinatura SaaS
│   ├── repasses/                   # Repasses financeiros (FIN-09): Compliance delibera + Financeiro configura
│   ├── seals/                      # Selos de compliance atribuídos às startups
│   ├── signature/                  # (ver src/signature/) — assinatura digital de documentos
│   ├── startup/                    # Startup profile + rodada + data-change-request + extras
│   ├── startup-opinion/            # Opiniões públicas sobre startups (review agregada)
│   ├── subscriptions/              # Subscription lifecycle (assinatura de plano)
│   ├── template/                   # (ver src/template/) — PDF template builder para Termo de Adesão
│   ├── tokens/                     # Tokens (reserva + emissão + certificado digital)
│   ├── transactions/               # Transaction history (saga pagamento)
│   ├── transparency/               # Posts públicos + featured-report + discussions
│   ├── uploads/                    # Uploads S3 (M5-S13): profile-avatar, sanitização imagem, variants
│   ├── users/                      # User management + biometric + liveness-telemetry
│   ├── v2/payments/                # Payments Hub v2 (em paralelo com /api/payment até Fase 3)
│   ├── verificar/                  # Endpoint público de documento assinado (M6-S18.5)
│   ├── wallet/                     # Carteira do investidor (saldo + transações)
│   └── webhook/                    # Webhook log (EFI + Stripe)
│
├── auth/                           # JWT + 2FA + cookies HTTP-only + Redis session
│   ├── auth.controller.ts          # login, register, refresh, forgot-password, verify-code, access
│   ├── auth.service.ts             # bcrypt + JWT + e-mail 2FA
│   ├── auth.guard.ts               # AuthGuard (CanActivate, valida session_id cookie + Redis)
│   ├── admin.guard.ts              # AdminGuard (role=ADMIN)
│   ├── compliance.guard.ts         # ComplianceGuard (role=COMPLIANCE)
│   ├── dismiss-session.controller.ts
│   ├── cookies/                    # CookiesService (Set-Cookie helpers)
│   ├── session/                    # SessionService (Redis cache; TTL 7d)
│   ├── dto/  entities/  services/
│
├── common/                         # Compartilhado entre módulos
│   ├── audit/                      # Audit module + service (audit trail)
│   ├── allocation/                 # Alocação de recursos de captação
│   ├── config/                     # envSchema (Zod-validated env) + config helpers
│   ├── decorators/                 # @FinanceAccess, @SkipSessionFilter, etc.
│   ├── dto/  entities/             # ResponseDto (success/error wrapper)
│   ├── feature-flags/              # Feature flag system
│   ├── filters/                    # global-exception.filter
│   ├── guards/                     # finance-role.guard + outros
│   ├── health.controller.ts        # GET /health + GET /ready (database, rabbitmq)
│   ├── interceptors/               # LoggingInterceptor, ResponseInterceptor
│   ├── pki/                        # CA interna (Root + Intermediate), CertificateService, key-storage (vault/in-memory)
│   ├── s3/                         # S3 helpers compartilhados
│   ├── sla/                        # SLA monitoring
│   ├── storage/                    # Storage abstractions
│   ├── system-config/              # SystemConfig module (key/value runtime)
│   └── validators/                 # cnpj.validator (e outros custom validators)
│
├── email/                          # Email transacional (AWS SES via @aws-sdk/client-ses)
│   ├── email.service.ts            # send(template|simple|html)
│   ├── email-template-security.ts  # LGPD guard para templates
│   ├── templates/                  # 14 templates hardcoded (welcome, verification-code, kyc-resubmission, new-login-alert, etc.)
│   └── README.md
│
├── messaging/                      # RabbitMQ (@golevelup/nestjs-rabbitmq)
│   ├── messaging.module.ts
│   ├── messaging.constants.ts      # exchange `payments` + DLQ + retry
│   ├── payment.publisher.ts
│   ├── payment-effects.consumer.ts
│   ├── efi-webhook.consumer.ts
│   └── dlq-monitor.consumer.ts
│
├── realtime/                       # Socket.IO gateway
│   ├── realtime.module.ts
│   ├── realtime.service.ts
│   └── socket-io.adapter.ts        # Redis adapter para multi-instance
│
├── s3/                             # AWS S3 (presigned URLs)
│   ├── s3.service.ts
│   └── s3.types.ts
│
├── signature/                      # Assinatura digital (PDFs)
│   ├── signature.service.ts        # Assina PDF com certificado da PKI
│   └── signature.module.ts
│
├── template/                       # PDF template builder (Termo de Adesão)
│   ├── pdf-template-builder.service.ts
│   └── termo-adesao.template.ts
│
├── prisma/                         # PrismaService (@Global)
├── backup/                         # Backup interceptor (LGPD Art. 18 — export dados usuário)
├── app.module.ts                   # Root module (registra ~50 submodules)
├── app.controller.ts               # Healthcheck meta
├── main.ts                         # Bootstrap + Swagger/Scalar + Throttler + ValidationPipe global
└── instrument.ts                   # Sentry instrumentation
```

## WHERE TO LOOK

| Task                                | Location                                                           |
|-------------------------------------|--------------------------------------------------------------------|
| API endpoints                      | `src/api/{module}/*.controller.ts`                                 |
| Business logic                      | `src/api/{module}/*.service.ts`                                    |
| Request/response shapes            | `src/api/{module}/dto/` + `entities/`                              |
| DB models                           | `prisma/schema.sqlite.prisma` (60+ models)                         |
| Auth flow (JWT, 2FA, cookies)      | `src/auth/`                                                        |
| PKI / assinatura digital           | `src/common/pki/` + `src/signature/` + `src/template/`              |
| Email transacional                  | `src/email/`                                                       |
| Mensageria (pagamentos, webhook)    | `src/messaging/`                                                   |
| Real-time (Socket.IO)               | `src/realtime/` + `src/api/notifications/notifications.gateway.ts`|
| Object storage (S3, presigned URLs) | `src/s3/` + `src/api/uploads/`                                     |
| Auditoria / compliance              | `src/common/audit/` + `src/api/admin/admin-audit-logs.controller.ts` + `src/api/admin/admin-security-audit.controller.ts` |
| Pagamentos (PIX + Cartão EFI)       | `src/api/payment/`                                                 |
| Repasses / Installments             | `src/api/repasses/` + `src/api/installment-requests/`              |
| Templates de e-mail editáveis       | `src/api/email-templates/` + `prisma/seed-email-templates.ts`      |
| Health checks                       | `src/common/health.controller.ts` (`/health`, `/ready`)            |
| Swagger decorators                  | `src/main.ts` (Scalar UI) + cada controller                        |
| Docker services                     | `docker-compose.yml` (Redis + RabbitMQ)                            |
| Prisma migrations                   | `prisma/migrations-sqlite/` (SQL manual, idempotente)               |
| Mocks / fixtures                    | `prisma/seeds/` (assets, location, opinions, curated, config)       |
| Migrations de modelo                | `prisma/AGENTS.md` (esquema, estratégia de versão)                 |
| Termo de Adesão (PDF + QR + PKI)    | `src/api/founder/termo-adesao/` + `src/template/` + `src/signature/` |

## CONVENTIONS

- **Module pattern:** Each feature = `module.ts` + `controller.ts` + `service.ts` (+ subdiretórios para casos complexos: `dto/`, `entities/`, `service/`, `guards/`, `events/`, `account/`, `efi/`, `coupons/`, `split/`, `discussions/`, `decisions/`, `__tests__/`, `helpers/`, `jobs/`, `validators/`, `biometric/`, `services/`).
- **DTO naming:** `Create{Entity}Dto`, `Update{Entity}Dto` em `dto/`. Variações por domínio (`LoginDto`, `ResetPasswordDto`, etc.).
- **Entity naming:** `{Entity}Entity` em `entities/`.
- **Guards:** `@UseGuards(AuthGuard)` para auth básica. Guards de domínio: `AdminGuard` (`auth/admin.guard.ts`), `ComplianceGuard` (`auth/compliance.guard.ts`), `FinanceRoleGuard` (`common/guards/finance-role.guard.ts`).
- **Validation:** class-validator decorators em DTOs + `ValidationPipe` global em `main.ts`.
- **Respostas:** `ResponseDto.success(data)` / `ResponseDto.error(message, code?)`. Mensagens em PT-BR.
- **Erros:** `HttpException` com mensagem em PT-BR; mapeados pelo `global-exception.filter`.
- **Logging:** `Logger` do NestJS — nunca `console.log`.
- **Testes:** Jest co-localizado (`*.spec.ts`). E2E em `test/e2e/`. Fluxos UX completos em `test/e2e/flows/`.
- **Mensageria:** publishers publicam em exchange `payments`; consumers processam em `payment-effects.consumer`, `efi-webhook.consumer`. DLQ via `dlq-monitor.consumer`. Ver `messaging/AGENTS.md` (se existir) ou `src/messaging/messaging.constants.ts`.
- **Cache:** Redis (`@nestjs-modules/ioredis`) APENAS para session (`session:{userId}`). TTL 7d. Não usar para outras finalidades (resiliência, invalidação).
- **Real-time:** Socket.IO com Redis adapter (`src/realtime/socket-io.adapter.ts`) — múltiplas instâncias compartilham o mesmo canal.
- **Eventos internos:** `@nestjs/event-emitter` com `wildcard: true, delimiter: '.'` (ex: `payment.approved`, `payment.failed`). Backbone do desacoplamento entre payment e subscriptions/investments. Ver `app.module.ts:69`.
- **Path aliases:** `src/` para imports internos (`import { X } from 'src/common/...'`). `@prisma/*` aponta para `generated/prisma/*` (prisma generate custom output).
- **Swagger decorators:** obrigatórios em toda rota (controller + DTOs).

## AUTHENTICATION ARCHITECTURE (Hybrid Cookies + Redis)

### Overview

The authentication system uses a hybrid approach combining HTTP-only cookies with Redis session caching for improved security and performance.

### Before (JWT Only)

- Access token stored in localStorage/client-side
- Bearer token in Authorization header
- User loaded from database on every protected request
- Higher DB load, potential XSS vulnerability via localStorage

### After (Hybrid Cookies + Redis)

- **Access token:** HTTP-only cookie (`httpOnly: true`, `sameSite: 'strict'`)
- **Session cache:** Redis (key: `session:{userId}`)
- **TTL:** 7 days for Redis session, 35 minutes for cookie
- **Performance:** No database query on every protected request
- **Security:** XSS-resistant (httpOnly), CSRF-protected (sameSite strict)

### Files

| File                    | Purpose                                     |
|-------------------------|---------------------------------------------|
| `src/auth/cookies/`     | CookiesService for cookie management        |
| `src/auth/session/`     | SessionService for Redis session management |
| `src/auth/auth.guard.ts` | CanActivate guard — valida `session_id` cookie + Redis cache |
| `src/auth/admin.guard.ts` | role=ADMIN                                  |
| `src/auth/compliance.guard.ts` | role=COMPLIANCE                       |

### Endpoints

| Method | Path           | Description                           |
|--------|----------------|---------------------------------------|
| POST   | `/auth/login`  | email + senha → seta cookie + Redis   |
| POST   | `/auth/register` | novo usuário → e-mail 2FA            |
| POST   | `/auth/verify-code` | código 2FA → cookie definitivo     |
| POST   | `/auth/refresh` | refresh token                          |
| POST   | `/auth/forgot-password` | esqueci senha                  |
| POST   | `/auth/reset-password` | reset                       |
| POST   | `/auth/newcode` | novo código 2FA                       |
| POST   | `/auth/access`  | valida acesso atual                   |
| GET    | `/auth/check-af2` | status 2FA (usado pelo BFF frontend) |
| POST   | `/auth/logout` | Clears cookie + removes Redis session |

### Mensagens de erro (segurança — anti-enumeração)

| Cenário | Status | Mensagem |
|---|---|---|
| Email NÃO existe | 401 | "Credenciais inválidas, email ou senha incorreto" |
| Senha incorreta | 401 | "Credenciais inválidas, email ou senha incorreto" |
| User `isActive=false` | 401 | "Conta suspensa. Entre em contato com o suporte para reativar." (`ACCOUNT_SUSPENDED`) |
| 2FA pendente | 200 + redirect | (não é erro — fluxo separado) |

**Proteções:**
1. **Constant-time check:** `validatePassword` (bcrypt) é chamado mesmo para user inativo (anti-timing-enumeration).
2. **Rate limit por email:** `ThrottlerGuard` no controller — `email: 5 req / 15 min`.
3. **Mensagem genérica** para erros de credencial.
4. **Mensagem específica** apenas para user suspenso.

### Environment Variables

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=                 # >= 32 chars, validado por envSchema (fail-loud no boot)
```

### Session Flow

1. **Login:** User autentica → JWT + cookie HTTP-only + cache em Redis (`session:{userId}`)
2. **Protected requests:** Cookie enviado → `AuthGuard` valida `session_id` + Redis (sem DB query)
3. **Logout:** Cookie limpo + Redis session deletada
4. **Expiration:** Cookie 35 min, Redis 7d (sliding window)

## ANTI-PATTERNS (THIS PROJECT — atualizado)

- ❌ `console.log/error` em código de produção — usar `Logger` do NestJS
- ❌ `catch (error)` sem narrowing (`error.response.detalhe` sem null check)
- ❌ `as any` em configs JWT (`expiresIn` precisa de tipo correto)
- ❌ Carregar todas as relations do User em todo request — usar projections
- ❌ Senhas em texto puro, secrets hardcoded, `.env` commitado
- ❌ `localhost` em URLs de produção
- ❌ TODO comments sem issue linkada
- ❌ **Vazamento de dados sensíveis (PII/PCI) em arquivos versionados** (AGENTS.md, comentários, logs)

> Histórico: `strictNullChecks` foi corrigido (agora `true` no `tsconfig.json`). 2FA + Redis cache + plan logic foram implementados (Sprints M4-M6). MySQL foi removido (projeto 100% SQLite).

## DATABASE

- **SQLite** via Prisma 7 + `@prisma/adapter-better-sqlite3` (arquivo `prisma/dev.db`).
- Schema ativo: `prisma/schema.sqlite.prisma` (60+ models). Migrations em `prisma/migrations-sqlite/` (SQL à mão, versionado).
- Envs: `DATABASE_PROVIDER=sqlite`, `DATABASE_URL="file:./prisma/dev.db"`.
- `prisma.config.ts` → `schema.sqlite.prisma` + `prisma/migrations-sqlite`. MySQL removido definitivamente.
- `prisma/AGENTS.md` documenta convenções + estratégia de schema.
- `prisma/seeds/` contém seeds idempotentes: `seed.ts`, `seed-assets.ts`, `seed-location.ts`, `seed-opinions.ts`, `seed-curated.ts`, `seed-system-config.ts`, `seed-email-templates.ts`.

## DOCKER

```bash
docker-compose.yml → Redis (cache/sessão), RabbitMQ (mensageria de pagamentos)
```

- **Redis:** APENAS cache/sessão (`session:{userId}`) + Socket.IO adapter. NÃO é fila. Imagem `redis:7.4-alpine`. Porta 6379.
- **RabbitMQ:** mensageiro do fluxo de pagamento (exchange `payments` + DLQ + retry). `@golevelup/nestjs-rabbitmq`. Imagem `rabbitmq:3.13-management`. Portas 5672 (AMQP) + 15672 (UI).
- **AWS S3:** storage de uploads (ver seção OBJECT STORAGE).
- **Processamento de uploads:** `UploadsService` executa de forma síncrona o download/validação do buffer, sanitização de imagens e geração de variants; sem antivírus integrado no backend.
- **Healthcheck:** `GET /ready` reporta `{ database, rabbitmq }`. `GET /health` simples.

## OPENAPI / SWAGGER

- **UI humana (Scalar):** `http://localhost:7077/docs`
- **JSON para IA / codegen:** `http://localhost:7077/docs-json` (alias: `/openapi.json`)
- **Snapshot versionado:** `backendnode/docs/openapi.json` (pretty + keys ordenadas para diff estável)

Regerar o snapshot após mudar controllers/DTOs (com o backend rodando):

```bash
cd backendnode && npm run openapi:dump
```

Config do Swagger e os dois endpoints estão em `src/main.ts`. O `documentBuilder` adiciona `addCookieAuth('session_id')` — o JSON reflete o esquema de auth real.

## TESTING

- **Framework:** Jest (unit + e2e)
- **Pattern:** Co-located `.spec.ts` files next to source
- **Commands:** `npm run test` (unit), `npm run test:e2e` (e2e genérico), `npm run test:cov` (coverage), `npm run test:debug`
- **Smoke test (assinatura de termo):** `npm run smoke:e2e`

### E2E FLOWS (Real UX Simulation)

**Diretório isolado:** `backendnode/test/e2e/flows/`
**Comando:** `npm run test:e2e:flows`
**Config:** `backendnode/test/e2e/jest-e2e-flows.config.js` (ISOLADO do jest-e2e default)

**Escopo:** Testes E2E que simulam o fluxo UX real do frontend contra o backend NestJS via supertest. Diferem dos testes `.e2e-spec.ts` no `test/` (que usam `jest-e2e.js` genérico) por serem:

1. **Determinísticos** — email único com timestamp + cleanup automático (deleta user + relations)
2. **Completos** — simulam fluxo inteiro (cadastro → confirmação email → login 2FA → perfil → compra)
3. **Isolados** — cleanup garante idempotência entre runs
4. **Auto-contidos** — não dependem de estado externo (SMTP mockado, EFI mockado)

**Estrutura:**
```
test/e2e/flows/
├── user-registration-to-plan-purchase.e2e-spec.ts  # Fluxo M4 completo
└── setup/
    ├── test-helpers.ts  # Geradores fake (email, cpf, password)
    └── db-cleanup.ts    # Cleanup determinístico
```

**Quando usar:** Validar que o backend honra 100% do fluxo UX antes de deploy, sem precisar rodar o frontend. Detecta corrupções silenciosas (Wallet não criada, status incorretos, etc).

## OBJECT STORAGE (AWS S3)

### Arquitetura (após M5-S13)

```
Upload:   Browser → POST /api/uploads    → Backend salva arquivo no S3 + URL presigned (TTL 7d) no banco
View:     Browser → <img src="presigned URL"> → AWS S3 direto (sem hop no backend)
Renovar:  Browser → GET /api/uploads/url/:id → Backend regenera presigned URL
Fallback: Browser → GET /uploads/:type/:size/:filename (redirect 302 → presigned URL) — legados
```

### Config (env)

| Env | Default | Descrição |
|-----|---------|-----------|
| `AWS_REGION` | `sa-east-1` | Região AWS do bucket S3 |
| `S3_BUCKET_PREFIX` | vazio | Prefixo dos buckets S3 |
| `S3_PUBLIC_BASE_URL` | vazio | URL pública opcional do object storage (presigned URLs são preferenciais) |
| `S3_CORS_ORIGINS` | `http://localhost:5173` | Origens permitidas (comma-separated) para acesso direto do browser |
| `UPLOAD_PRESIGNED_URL_TTL` | `604800` | TTL da presigned URL (7 dias em segundos) |

### Buckets

Todos com prefixo `S3_BUCKET_PREFIX` (ex: `iselftoken-image`, `iselftoken-document`).

| Bucket lógico | Bucket físico (com prefixo) | Conteúdo |
|---------------|----------------------------|----------|
| `image` | `{prefix}-image` | Imagens originais e LG |
| `image-md` | `{prefix}-image-md` | Imagens medium (800px) |
| `image-sm` | `{prefix}-image-sm` | Imagens thumbnail (200px) |
| `video` | `{prefix}-video` | Vídeos originais e LG |
| `video-md` | `{prefix}-video-md` | Vídeos medium (720p) |
| `video-sm` | `{prefix}-video-sm` | Vídeos small (480p) |
| `document` | `{prefix}-document` | Documentos PDF/DOC |
| `comprovante` | `{prefix}-comprovante` | Comprovantes (uso futuro) |

### CORS

Configurado no bucket AWS S3 conforme `S3_CORS_ORIGINS` e a política de acesso do ambiente.

### Presigned URLs

- Geradas por `S3Service.getUrl(bucket, key, expiresIn)` com `getSignedUrl` do SDK AWS
- TTL padrão: 604800s (7 dias) — config `UPLOAD_PRESIGNED_URL_TTL`
- Renovação sob demanda: `GET /uploads/url/:id` (auth required)
- URLs legadas (sem presigned) mantidas como fallback

## MESSAGING (RabbitMQ) — Sprints M6+

Mensageria assíncrona para fluxo de pagamento e webhooks EFI.

- **Exchange:** `payments` (topic)
- **DLQ:** `payments.dlq` para mensagens com falha permanente após retry
- **Retry policy:** exponential backoff configurado em `messaging.constants.ts`
- **Consumers:**
  - `payment-effects.consumer.ts` — processa eventos `payment.*` (ativar subscription, marcar investment CONFIRMED, emitir token, etc.)
  - `efi-webhook.consumer.ts` — recebe webhooks EFI (PIX pago, cartão capturado) e dispara atualização de status
  - `dlq-monitor.consumer.ts` — monitora DLQ, alerta Sentry, dispara alerta no log
- **Publisher:** `payment.publisher.ts` — único ponto de publicação (estados: `payment.created`, `payment.approved`, `payment.failed`, `payment.refunded`)
- **Eventos internos (in-process):** `@nestjs/event-emitter` com `wildcard: true` (backbone entre payment e subscriptions/investments).

## REALTIME (Socket.IO) — Sprint WS-01

Gateway para notificações em tempo real.

- **Adapter:** `@socket.io/redis-adapter` (`src/realtime/socket-io.adapter.ts`) — permite múltiplas instâncias
- **Gateway principal:** `src/api/notifications/notifications.gateway.ts` — emite `notification` no canal do user
- **Auth:** cookie HTTP-only (`session_id`) — handshake valida sessão Redis antes de conectar
- **Cliente:** `frontend/app/hooks/use-notifications-socket.ts` (singleton por userId com ref-count)

## PKI — Certificate Authority Interna

### Contexto (Sprint M6-S18)

A CA interna é usada para assinar digitalmente o **Termo de Adesão Digital** dos fundadores.
A cadeia de certificação é: **Root CA (auto-assinada) → Intermediate CA (assinada pela Root)**.

### Arquitetura

```
src/common/pki/
├── pki.module.ts                        # módulo NestJS
├── ca-init.service.ts                   # serviço de bootstrap da CA
├── ca-init.service.spec.ts              # testes (100% coverage)
├── certificate.service.ts               # emissão e gerenciamento de certificados (T119)
├── certificate.service.spec.ts          # testes (T119)
├── cert-expiration.cron.ts              # cron job diário 03:00 para marcar certificados expirados
└── key-storage/
    ├── key-storage.interface.ts         # interface abstrata
    ├── in-memory-key-storage.service.ts # stub dev (criptografado em arquivo JSON)
    └── in-memory-key-storage.service.spec.ts
```

### CertificateService (T119)

O `CertificateService` emite e gerencia certificados digitais para o Termo de Adesão:

| Método | Descrição |
|--------|-----------|
| `issue(ownerType, ownerId)` | Emite certificado ou retorna existente (idempotente) |
| `getActiveCert(ownerType, ownerId)` | Retorna certificado ativo ou null |
| `revoke(certId, reason)` | Revoga certificado com motivo |
| `findExpiringSoon(thresholdDays)` | Lista certificados próximos da expiração |
| `markExpiredCertificates()` | Marca certificados expirados como 'expired' |

**Validade:** 1 ano (365 dias)
**Serial:** `crypto.randomBytes(16).toString('hex')` (hex uppercase)
**Fingerprint:** SHA-256 da chave pública (DER encoded, hex)
**Chave privada:** Armazenada no KeyStorageService (Vault ou stub)

### Dependências

- `node-forge` — geração de chaves RSA, certificados X.509, CSR, assinatura
- `pdf-lib` + `pdfkit` + `node-signpdf` — geração e assinatura do PDF
- `qrcode` — QR Code de verificação pública no PDF
- `KEY_STORAGE_PASSPHRASE` — senha para criptografia do keystore em dev

### Scripts

```bash
npm run pki:init           # Bootstrap da CA via in-memory (idempotente)
npm run pki:vault:init     # Bootstrap da CA via Vault (produção)
```

### Configuração das CAs

| CA | CommonName | Validade | Algoritmo |
|----|-----------|----------|-----------|
| Root | ISELFTOKEN ROOT CA G1 | 10 anos | RSA 2048 + SHA-256 |
| Intermediate | ISELFTOKEN INTERMEDIATE CA G1 | 5 anos | RSA 2048 + SHA-256 |

### KeyStorageService

- Interface: `IKeyStorageService` com métodos `store()`, `retrieve()`, `delete()`, `exists()`
- Implementação dev: `InMemoryKeyStorageService` (criptografia AES-256-GCM em arquivo JSON)
- Implementação prod: `VaultProductionKeyStorageService` (HashiCorp Vault transit engine)
- A chave privada JAMAIS é armazenada em plaintext no banco

### Ambiente

```bash
KEY_STORAGE_MODE=in-memory   # ou 'vault'
KEY_STORAGE_PASSPHRASE=      # senha para criptografia (dev)
VAULT_ADDR=                  # endereço do Vault (prod)
VAULT_TOKEN=                 # token do Vault (prod)
```

### Antipadrão

- Armazenar chave privada em plaintext no banco de dados
- Usar keystore sem criptografia
- Compartilhar a mesma senha de produção em dev

## ASSINATURA DIGITAL — Termo de Adesão (Sprint S18)

Pipeline completo: PKI + PDF + QR + verificação pública.

```
src/api/founder/termo-adesao/         # módulo NestJS
src/template/                         # pdf-template-builder + termo-adesao.template
src/signature/                        # assinatura do PDF
src/common/pki/                       # CA + certificado do signatário
src/api/verificar/                    # endpoint público de validação (QR Code)
```

- Geração: `PdfTemplateBuilderService` monta layout, `SignatureService` aplica assinatura PKI, QR Code aponta para `GET /verificar/:documentId`.
- Verificação pública: `src/api/verificar/` (sem auth, rate limit 100/IP/min, cache 5min).

## STARTUP DELETE AUDIT LOG (M6-S17)

### Contexto

Sprint M6-S17 implementa HARD DELETE para role COMPLIANCE com log de auditoria imutável.
Decisão do usuário (Risco Alto registrado) - mitigação obrigatória.

### Modelo: StartupDeleteAuditLog

Log imutável (append-only) para exclusão HARD de startups.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | cuid | ID único do log |
| `startupId` | string | ID da startup excluída |
| `startupSnapshot` | Text | JSON completo da startup pré-delete |
| `rodadaSnapshot` | Text? | JSON da rodada ativa (se houver) |
| `investmentsSnapshot` | Text? | JSON de investments ativos |
| `paymentsSnapshot` | Text? | JSON de payments |
| `documentsSnapshot` | Text? | JSON de StartupDocument |
| `signedDocsSnapshot` | Text? | JSON de SignedDocument (S18) |
| `deletedByUserId` | string | publicId do usuário compliance |
| `deletedByRole` | string | Role que executou (COMPLIANCE) |
| `deletedAt` | datetime | Timestamp da exclusão |
| `ipAddress` | string? | IP do request (PII - redatado em listagem) |
| `userAgent` | string? | User-Agent (PII - redatado em listagem) |
| `reason` | string? | Motivo informado pelo compliance |
| `retentionUntil` | datetime | 7 anos após deletedAt (LGPD + contabilidade) |
| `createdAt` | datetime | Timestamp de criação do log |

**Natureza:** Append-only (sem updatedAt, sem delete)

### Política de Retenção

- **Mínimo:** 7 anos (LGPD Art. 7, V + obrigação contabilidade brasileira)
- Após retenção, job de purge deve redatar registros (S20 hardening)

### Endpoint

```
DELETE /admin/startups/:id
Authorization: Cookie session_id
Role: COMPLIANCE
Body: { "reason": "motivo com mínimo 10 caracteres" }

Response: 204 No Content
```

### CNPJ Mascarado

Em listagens, CNPJs são mascarados no formato: `12.345.***/****-00`

### Guard

`ComplianceGuard` (`src/auth/compliance.guard.ts`) — permite apenas role COMPLIANCE

## VERIFICAR — Public Document Verification (M6-S18.5)

### Contexto

Sprint M6-S18.5 implementa endpoint PÚBLICO para validação de autenticidade de documentos assinados digitalmente. O QR code no PDF aponta para este endpoint.

### Arquitetura

```
src/api/verificar/
├── verificar.module.ts       # módulo NestJS
├── verificar.controller.ts   # endpoints públicos (sem auth)
├── verificar.service.ts      # lógica de validação
├── dto/
│   └── verificar-response.dto.ts  # DTOs de resposta
└── verificar.controller.spec.ts  # testes
    verificar.service.spec.ts      # testes
```

### Endpoints Públicos

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/verificar/:documentId` | Valida autenticidade do documento |
| GET | `/verificar/:documentId/download` | Redireciona para URL presigned do S3 |

### Security Features

- **Sem autenticação:** endpoint público (sem AuthGuard)
- **Rate limiting:** 100 requests/IP/minuto via ThrottlerGuard
- **Cache:** Header `Cache-Control: public, max-age=300` (5 minutos)
- **Máscara de dados sensíveis:** CPF, CNPJ, IPs, user-agents nunca expostos

### Validação

O endpoint `/verificar/:documentId` retorna:

```json
{
  "exists": true,
  "valid": true,
  "validation": {
    "hashMatches": true,
    "certificatesActive": true,
    "signedWithinValidity": true
  },
  "document": {
    "type": "termo_adesao",
    "signedAt": "2024-01-15T10:30:00.000Z",
    "templateVersion": "1.0.0"
  },
  "signataries": [
    {
      "role": "founder",
      "displayName": "F. Silva",
      "document": { "type": "CPF", "masked": "***.***.***-57" },
      "certificate": { "serialNumber": "...", "fingerprint": "...", ... }
    },
    {
      "role": "startup",
      "displayName": "Startup XYZ LTDA",
      "document": { "type": "CNPJ", "masked": "**.***.***/****-90" },
      "certificate": { ... }
    }
  ],
  "audits": [
    { "action": "aceite_checkbox", "createdAt": "..." }
  ]
}
```

### Máscara de CNPJ

CNPJs são mascarados no formato: `**.***.***/****-XX` (apenas os últimos 2 dígitos visíveis)

### Reutilização

Este módulo usa:
- `CertificateService` (S18.1) para validação de certificados
- `SignatureService` (S18.3) para lógica de assinatura
- `S3Service` para download de PDFs
- `PrismaService` para acesso ao banco

## EMAIL TEMPLATES (FIN-05)

Templates de e-mail editáveis via painel admin (`/admin/email-templates`).

- **Módulo backend:** `src/api/email-templates/` (`email-templates.controller.ts`, `email-templates.service.ts`, `email-render.service.ts`, `lgpd-email-template.validator.ts`)
- **Resolução de template em runtime** (`src/email/email.service.ts:203`): tenta banco primeiro via `EmailTemplatesService.renderBySlug()`, fallback para hardcoded se não encontrar. Templates com `slug` não registrado em `mapDataForDbTemplate` usam só hardcoded.
- **Seed:** `prisma/seed-email-templates.ts` (idempotente, 14 templates). Roda via `npm run seed:emails`.
- **Painel admin frontend:** `/admin/email-templates` (TipTap WYSIWYG + preview + versionamento + LGPD warning).
- **LGPD:** banner no editor alerta sobre `{{variavel}}` (não persistir PII fora das permitidas).
- **Tema dark + magenta:** templates novos (S34) seguem brand v1.2 (`#d500f9` + Inter). 12 legados ainda em HTML claro — migrar manualmente via painel.

## PKI — DISASTER RECOVERY RUNBOOK

### Cenários de Emergência

#### C1: Chave da Root CA comprometida

**Sintomas:** Vault comprometido, chave privada exposta, acesso não autorizado ao Vault.

**Procedimento:**

1. **IMEDIATO (0-1h):**
   ```sql
   UPDATE "DigitalCertificate" SET status = 'revoked', revokedAt = NOW(), revokeReason = 'ROOT_CA_COMPROMISED';
   UPDATE "CertificateAuthority" SET status = 'revoked' WHERE type = 'root';
   ```

2. **Curto prazo (1-24h):**
   ```bash
   npm run pki:vault:init   # Regenerar Root CA + Intermediate CA
   # Reemitir certificados para todos os founders/startups ativos
   # (cada signatário precisa assinar novamente o termo)
   ```

3. **Comunicação:**
   - Notificar todos os signatários afetados por e-mail
   - Publicar aviso na página de verificação
   - Documentar incidente no registro de auditoria

#### C2: Chave da Intermediate CA comprometida

**Procedimento:**

1. **IMEDIATO:**
   ```sql
   UPDATE "CertificateAuthority" SET status = 'revoked' WHERE type = 'intermediate';
   UPDATE "DigitalCertificate" SET status = 'revoked', revokeReason = 'INTERMEDIATE_CA_COMPROMISED' WHERE status = 'active';
   ```

2. **Regenerar Intermediate CA:**
   ```bash
   # Deletar Intermediate CA do Vault (se ainda disponível)
   # DELETE /v1/transit/keys/iselftoken/pki/intermediate/private

   npm run pki:vault:init   # Regenerar (idempotente)
   ```

3. **Reemitir certificados:** Founders/startups afetados assinam novamente.

#### C3: Vault indisponível em produção

**Sintomas:** `KEY_STORAGE_MODE=vault` mas Vault não responde.

**Comportamento do sistema:**
- O `KeyStorageServiceFactory` detecta indisponibilidade via health check
- Faz **fallback automático** para `InMemoryKeyStorageService`
- Logs em `pki.module.ts` mostram warning `[PKI] Fallback para InMemoryKeyStorageService`

**Atenção:** Fallback para in-memory **NÃO é seguro para produção**.
A chave da Root CA está em memória (criptografada em `.pki_keystore.json`).

**Procedimento:**
1. Restaurar Vault o mais rápido possível
2. Migrar de volta para `KEY_STORAGE_MODE=vault`
3. Regenerar Root CA se `.pki_keystore.json` foi comprometido

#### C4: Perda do arquivo `.pki_keystore.json` (dev)

**Sintomas:** Arquivo `.pki_keystore.json` deletado acidentalmente.

**Solução:**
```bash
rm .pki_keystore.json
sqlite3 prisma/dev.db "DELETE FROM \"CertificateAuthority\" WHERE status = 'active';"
npm run pki:vault:init   # ou npm run pki:init
```

**Em produção (Vault):** Nunca deve acontecer — Vault é a fonte da verdade.

### Validação Pós-Incidente

Após qualquer recovery, executar:

```bash
npm run pki:vault:init                                     # 1. Verificar CAs ativas
curl http://localhost:7077/api/certificates/active         # 2. Certificados emitidos
npm run test:e2e:flows -- --testPathPattern="m6-sanity"    # 3. Smoke test E2E
```

### Prevenção

| Risco | Mitigação |
|-------|-----------|
| Comprometimento Vault | Vault com auth via Kubernetes SA + políticas mínimas (least privilege) |
| Perda de chave Root CA | Backup criptografado da keystore em cofre offline (AWS S3 Glacier / HSM) |
| Vazamento keystore dev | `.pki_keystore.json` no `.gitignore` + rotação de senha a cada 90 dias |
| Revogação não notificada | `CertificateService` envia e-mail ao signatário em `revoke()` |
| Key ceremony | Procedimento dual control (2 pessoas) para Root CA |

## LGPD & BACKUP

- **Backup de dados do usuário (LGPD Art. 18):** `src/backup/` — interceptor `BackupInterceptor` + `BackupService` que monta ZIP com dados pessoais (User, Wallet, Transactions, Documents, Notifications) sob demanda via `GET /api/users/me/export`.
- **Auditoria:** `src/common/audit/` registra ações sensíveis (admin, compliance, payments) com `actor`, `action`, `target`, `metadata` (sem PII em texto livre).
- **Consentimento:** templates de e-mail + signup flags em `User.consents` (LGPD-aware).
- **Retenção:** logs 5 anos (auditoria) + 7 anos (delete audit log).
- **Anti-padrão:** logar CPF, e-mail, telefone, IP em texto livre — usar IDs opacos.


Bandeira: visa
Número:   4485785674290087  (final 7 ✓)
CVV:      123
Validade: 05/2029
Nome:     Gorbadoc Oldbuck
CPF:      94271564656

✅ Cupom MACOS50 (50% — max 10 usos)
✅ Cupom MARCOS99 (99% — max 10 usos)