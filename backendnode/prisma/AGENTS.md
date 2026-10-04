# DATABASE SCHEMA — KNOWLEDGE BASE

**Generated:** 2026-03-21 (atualizado 2026-09-05)
**DB:** SQLite via Prisma ORM (adapter `@prisma/adapter-better-sqlite3`) — arquivo `prisma/dev.db`
**Schema ativo:** `prisma/schema.sqlite.prisma` (datasource `sqlite`; `DATABASE_PROVIDER=sqlite`, `DATABASE_URL="file:./prisma/dev.db"`)
**Migrations:** `prisma/migrations-sqlite/` (SQL escrito à mão; SQLite usa `ALTER TABLE ... ADD COLUMN`, Decimal/DateTime/Json como TEXT)

> Nota histórica: o projeto começou com MySQL, mas foi **totalmente migrado para SQLite**. Os arquivos MySQL (`schema.prisma`, `schema.mysql.prisma`) e as migrations MySQL (`prisma/migrations/`) foram **removidos**. O `prisma.config.ts` aponta para `schema.sqlite.prisma` + `prisma/migrations-sqlite`. Ao alterar o modelo, editar `schema.sqlite.prisma` e criar a migration em `prisma/migrations-sqlite/`.

## DOMAINS (7)

| # | Domain                      | Models                          | Purpose                           |
|---|-----------------------------|---------------------------------|-----------------------------------|
| 1 | Identidade & Compliance     | User, BackupUser, KYCProfile    | Usuários, roles, KYC, backup      |
| 2 | Carteira & Ledger           | Wallet, WalletTransaction       | Saldo, bloqueios, movimentações   |
| 3 | Planos & Assinaturas (SaaS) | Plan, Subscription              | Modelos de negócio por assinatura |
| 4 | Startups & Campanhas        | Startup, Campaign               | Equity crowdfunding               |
| 5 | Equity & Tokens             | Token, TokenHistory             | Ativos digitais, P2P, dividendos  |
| 6 | Pagamentos & Saques         | Payment, Investment, Withdrawal | C6 Bank PIX, cartão, saques       |
| 7 | Auditoria & Logs            | AuditLog, WebhookLog            | Rastreabilidade                   |
| 8 | Geografia                   | Country, State, City            | Dados geográficos seed            |

## MODELS

### 1. IDENTIDADE

**User** — Entidade central. Campos de acesso (email/senha/role), dados pessoais, endereço (JSON `pais`), documentos, status de conta. Relacionamentos: 4 perfis KYC (avatar, comprovante, documento, biofacial), wallet, payments, subscriptions, startups (fundador), investments, tokens (investidor), auditLogs.

- **Roles:** `USER`, `ADMIN`, `FINANCEIRO`, `COMPLIANCE`
- **publicId:** UUID exposto na API (nunca usar `id` interno)
- **Documentos:** `tipo_documento` enumera CPF, CNH, PASSAPORTE, DNI, SSN, etc.

**BackupUser** — Snapshot JSON antes de UPDATE/DELETE críticos (process: ADMIN/UPDATE/DELETE).

**KYCProfile** — Upload de arquivos (avatar, comprovante, documento, biofacial). URLs de 4 tamanhos (original, sm, md, lg). Status: PENDING → UNDER_REVIEW → APPROVED/REJECTED/NEEDS_RESUBMISSION.

### 2. CARTEIRA (LEDGER)

**Wallet** — 1:1 com User. Campos: `balance` (saldo disponível), `blocked` (saldo em ordens abertas), `currency` (BRL).

**WalletTransaction** — Histórico de movimentações. Tipos:

- Entrada: `DEPOSIT`, `CAMPAIGN_SETTLEMENT`, `DIVIDEND_EXIT`, `P2P_SALES`
- Saída: `WITHDRAWAL`, `INVESTMENT`, `SUBSCRIPTION`, `P2P_PURCHASE`

### 3. PLANOS (SaaS)

**Plan** — Catálogo de planos. Campos: nome, slug (único), preço, período (anos), benefícios (JSON), visível/recomendado. Seeds: AFILIADO (R$85/ano), INVESTIDOR (R$50/ano), FUNDADOR (R$100/ano).

**Subscription** — Assinatura de plano por usuário. Status: PENDING → ACTIVE → EXPIRED/CANCELED. Relaciona-se com payments.

### 4. STARTUPS & CAMPANHAS (CORE)

**Startup** — Perfil completo: dados empresariais (CNPJ, razão social), pitch (problema, solução, modelo de receita), estrutura (sócios JSON, teams JSON), dados bancários para repasse, logo (KYCProfile). Status: PENDING → APPROVED/REJECTED. Campos de EXIT: `isExited`, `exitValuation`, `exitDate`.

**Campaign** — Rodada de investimento. Campos financeiros: `targetAmount`, `minInvestment`, `valuation`, `tokenPrice`, `totalTokens`, `tokensSold`, `deadline`. Status: DRAFT → OPEN → FUNDED/FAILED → PAID_OUT. `reservationFeePaid` indica se founder pagou taxa de reserva.

### 5. EQUITY & TOKENS

**Token** — Ativo digital único (UUID `id`, `hash` único). Lastro: userId (investidor), startupId, campaignId. Campos: `quantity`, `purchaseVal` (preço de compra), `currentVal` (valor atual). Certificado PDF opcional.

**TokenHistory** — Histórico de transações do token. Tipos: `BUY_MARKET`, `SELL_P2P`, `DIVIDEND`, `DILUTION`.

### 6. PAGAMENTOS

**Payment** — Registro de pagamento. Diferencia por `purpose`:

- `SUBSCRIPTION` — Pagamento de plano
- `INVESTMENT` — Compra de tokens (relação 1:1 com Investment)
- `TOKEN_RESERVATION` — Founder paga para criar tokens (taxa de 5%)
- `EARLY_ACCESS` — Compra de acesso antecipado
- `P2P_BUY` — Compra de tokens de outro usuário

Integração EFI/C6: `txid`, `endToEndId`, `qrCodeBase64`, `copyPastePix`, `efiChargeId`, `paidAt`.

- `status` — `PENDING | PAID | CANCELED | REFUNDED`.
- `effectsAppliedAt` (DateTime?) — marco de aplicação dos EFEITOS de domínio
  (ativar plano/investimento/reserva). **Distinto de `paidAt`/status**: a
  idempotência e a reconciliação se ancoram neste campo, NÃO em `status===PAID`.
  Assim, um Payment PAID cujos efeitos falharam é recuperável (reprocessável)
  em vez de curto-circuitar como "já processado" — evita pago-sem-plano.
  Preenchido por `PaymentService.processPaymentEffects`. Migration:
  `20260905000000_payment_effects_applied_at`.

**Investment** — Registro de investimento (1:1 com Payment). Campos: amount, tokensQty, status (PENDING/CONFIRMED/CANCELED/REFUNDED).

**Withdrawal** — Saque do founder. Status: REQUESTED → PROCESSING → COMPLETED/REJECTED. Snapshot de dados bancários em `bankInfo` JSON.

### 7. AUDITORIA

**AuditLog** — Log de ações: userId (nullable desde BUG-FT-001 — ações de sistema: cron, webhooks, jobs usam `userId: null`), action, entity, entityId, oldValue/newValue (JSON snapshots), IP. FK para User usa `ON DELETE SET NULL` (preserva histórico LGPD quando User é deletado).

**WebhookLog** — Logs de webhooks externos (C6 Bank). Payload JSON, processed, status, errorLog.

### 8. GEOGRAFIA

**Country/State/City** — Dados geográficos seed (250+ países, estados, cidades). Relacionamento hierárquico.

## RELATIONSHIPS

```mermaid
User (1) ──── (1) Wallet
User (1) ──── (*) Payment
User (1) ──── (*) Subscription
User (1) ──── (*) Startup      [fundador]
User (1) ──── (*) Investment   [investidor]
User (1) ──── (*) Token        [investidor]
User (1) ──── (*) AuditLog

Startup (1) ── (*) Campaign
Startup (1) ── (*) Token
Startup (1) ── (*) Withdrawal

Campaign (1) ── (*) Investment
Campaign (1) ── (*) Token
Campaign (1) ── (*) Payment    [taxa de reserva]

Token (1) ───── (*) TokenHistory

Plan (1) ────── (*) Subscription
Subscription (1) ── (*) Payment

Country (1) ── (*) State
State (1) ───── (*) City
```

## REGRAS DE NEGÓCIO

1. **Usuário nunca exposto via ID interno** — Usar `publicId` (UUID) na API
2. **Wallet com bloqueio** — `blocked` impede saque de saldo em ordens abertas
3. **Campanha tem deadline** — Se não atingir `targetAmount` até deadline → `FAILED`
4. **Tokens são únicos** — Cada token tem `hash` único, representa equity
5. **Payment diferencia propósito** — `purpose` define regra de negócio (assinatura vs investimento vs reserva)
6. **Founder paga taxa de reserva** — `TOKEN_RESERVATION` (5%) antes de criar tokens
7. **KYC obrigatório** — 4 documentos: avatar, comprovante, documento, biofacial
8. **AuditLog rastreia tudo** — Snapshots JSON antes/depois de mudanças críticas
9. **BackupUser preserva dados** — Snapshot antes de UPDATE/DELETE de usuários
10. **Geografia hierárquica** — Country → State → City com relacionamentos FK

## SEED DATA

`npm run seed` cria:

- 3 usuários: admin, founder, investidor
- 3 planos: AFILIADO, INVESTIDOR, FUNDADOR
- 1 assinatura founder (6 anos)
- 3 startups com campanhas em estados diferentes (OPEN, FUNDED, FAILED)
- Tokens, investments, payments de exemplo

## COMMANDS

```bash
pnpm run prisma:generate                          # Gera o client a partir de schema.sqlite.prisma
pnpm run prisma:setup                             # generate + sync do client para node_modules
npx prisma db push --schema=prisma/schema.sqlite.prisma   # DEV ONLY — sincroniza dev.db sem tracking
npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma  # PROD — aplica migrations rastreáveis
npx prisma migrate status --schema=prisma/schema.sqlite.prisma   # Verifica migrations pendentes
npx prisma studio --schema=prisma/schema.sqlite.prisma    # GUI do banco
npm run seed               # Popular banco com dados de teste
npm run seed:location      # Seed de países/estados/cidades
```

### Fluxo de migration (SQLite)

As migrations SQLite são SQL escrito à mão em `prisma/migrations-sqlite/<timestamp>_<nome>/migration.sql`:

1. Editar `prisma/schema.sqlite.prisma`.
2. Criar a pasta da migration com `migration.sql` (`ALTER TABLE "X" ADD COLUMN "y" TEXT;` para nullable DateTime/Decimal/Json).
3. **DEV:** aplicar via `npx prisma db push --schema=prisma/schema.sqlite.prisma` e regenerar o client (`pnpm run prisma:setup`).
4. **DEV (alternativa, preferida pós-S35):** aplicar via `npx prisma migrate dev --schema=prisma/schema.sqlite.prisma` (cria a migration E aplica com tracking em `_prisma_migrations`). Use `db push` apenas para sincronização rápida sem migration formal.
5. **PROD:** `prisma migrate deploy` é o ÚNICO caminho oficial. `db push` foi removido do `Dockerfile.prod` e de `scripts/deploy.sh` na S35 — ele tentava recriar tabelas já materializadas e falhava com "table already exists".

### Baseline de prod DB migrada de `db push` → `migrate deploy` (S35)

Prod DBs criadas antes da S35 via `db push` têm todas as tabelas materializadas mas a `_prisma_migrations` está vazia. Antes de rodar o primeiro `migrate deploy` em prod, faça o baseline one-shot:

```bash
docker compose -f docker-compose.prod.yml exec -T api \
  npx ts-node /app/scripts/baseline-prod-db.ts
```

O script (`scripts/baseline-prod-db.ts`) detecta o estado da DB e age accordingly:
- **DB legada (`db push`)**: schema materializado (tabela `User` existe) mas `_prisma_migrations` vazia → insere as 34 rows com checksum SHA-256 em uma única transação Prisma.
- **DB já migrada**: `_prisma_migrations` populada → no-op imediato.
- **Fresh DB**: sem tabela `User` → no-op (deixa `migrate deploy` criar tudo do zero).

A partir do baseline, `migrate deploy` aplica somente migrations novas.

**Auto-baseline no `update`**: o `scripts/deploy.sh update` agora invoca `scripts/baseline-prod-db.ts` automaticamente antes de `migrate deploy`. Idempotente + safe — em deploys onde a DB já está migrada, o script sai sem fazer nada.

Para mais detalhes, ver `scripts/baseline-prod-db.ts` (cabeçalho com a justificativa completa).

## NOTES

- **Provider:** SQLite via `@prisma/adapter-better-sqlite3` (arquivo `prisma/dev.db`)
- **Output:** `generated/prisma/` (versionado? não — gitignored) e sincronizado para `node_modules/.prisma/client` via `prisma:sync`/`postinstall`. tsconfig mapeia `@prisma/client` → `generated/prisma`.
- **Nunca SQL raw** — Usar Prisma Client exclusivamente (exceto migrations, que são SQL à mão)
- **Decimal/DateTime/Json** — em SQLite são armazenados como TEXT
- **JSON para campos flexíveis** — `pais`, `redes_sociais`, `socios`, `teams`, `uso_recursos`, `beneficios`
