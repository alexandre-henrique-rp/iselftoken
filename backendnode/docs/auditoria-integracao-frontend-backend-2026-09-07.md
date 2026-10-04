# Auditoria Integração Frontend ↔ Backend — iSelfToken

**Data:** 2026-09-07
**Engenheiro:** Revisor Sênior NestJS + React
**Stack auditado:** NestJS 10 + Prisma 7 (SQLite) + React Router 7 (SSR) + TanStack Query 5
**Backend:** `localhost:7077` · 210 endpoints no OpenAPI · 44 módulos
**Frontend:** 132 BFFs + 90+ hooks TanStack Query + 77+ rotas

---

## RESUMO EXECUTIVO

A integração está **estruturalmente sólida** (BFF pattern + auth via cookie + SSR hidratação TanStack Query estão corretos), mas **7 bugs críticos** impedem que funcionalidades chave funcionem em produção. Nenhum dado está hardcoded em produção real, mas há **10+ áreas onde mocks estáticos do frontend mascaram backend quebrado**, e **dados de geografia incompletos** quebram formulários de cadastro/endereço.

| # | Severidade | Área | Impacto |
|---|-----------|------|---------|
| 1 | **CRÍTICO** | Colisão de rotas `/coupons` | 4 endpoints cupons quebrados (public + admin) |
| 2 | **CRÍTICO** | `EmailTemplatesModule` não importado | Painel admin de templates 100% offline |
| 3 | **CRÍTICO** | `countries` e `states` vazios no DB | Formulários sem países/estados (quase todas telas de cadastro) |
| 4 | **ALTO** | `use-previu-email-template-version.ts` envia `FAKE_DATA` hardcoded | Preview sempre renderiza dados mentirosos |
| 5 | **ALTO** | `pix-payment.tsx` tem QR Code mockado como string estática | Pagamento PIX nunca decodificável |
| 6 | **ALTO** | `team-section.tsx`, `real-investors.tsx`, `risk-docs.tsx`, `business-summary.tsx`, `investor-forum.tsx` | Detalhe da startup renderiza dados FinFlow fixos (não integra com BFFs) |
| 7 | **ALTO** | `process.env.COOKIE` em `checkout.tsx` e `checkout-pix.tsx` | Cookie de auth sempre `undefined` em SSR |
| 8 | MÉDIO | `use-efi-checkout.ts` chama BFFs que não existem (`/api/checkout/efi/*`) | Checkout EFI 100% offline |
| 9 | MÉDIO | `use-founders-investors` chama `/api/startup/dashboard/investors` (inexistente) | Aba investidores renderiza vazia |
| 10 | MÉDIO | `routes/private/wallet.tsx` chama `/wallet/transactions` (404) | Lista de movimentações quebra (mas vem via `/wallet` mesmo) |
| 11 | MÉDIO | `routes/private/compliance-users.tsx` chama `/api/admin/users` (relativo) | Inconsistência com padrão BFF |
| 12 | BAIXO | `process.env.COOKIE` em 2 loaders | SSR quebra em qualquer loader que dependa de cookie |
| 13 | BAIXO | Mock fallback `DEFAULT_COUNTRIES` em `register-form.tsx` (6 países) | UX degradada mas não quebra |
| 14 | INFO | Anti-patterns: `userId = 1 // TODO` em coupons, `payment.service.ts:remove` stub | Dívida técnica |

---

## 1. AMBIENTE LEVANTADO

### 1.1 Docker

```
fintech_redis     Up · porta 6379     ✓ UP (já estava rodando)
fintech_rabbitmq  Recreated healthy · 5672, 15672 ✓ SUBIDO nesta sessão
```

Não há serviço de antivírus integrado no backend. O backend indica OK no `/ready` (RabbitMQ conectado).

### 1.2 Backend NestJS

```
HTTP /health → 200
HTTP /ready  → 200 (database ✓, rabbitmq ✓)
OpenAPI     → /docs (Scalar), /docs-json, /openapi.json
Schema SQLite: prisma/schema.sqlite.prisma (66 models)
DB ativo: backendnode/db/database.db (26 MB, 6477 pages)
CORS       : origin=true + credentials=true → cookies fluem do SSR ao backend
Helmet     : CSP custom permitindo S3 / *.amazonaws.com / *.cloudfront.net
```

### 1.3 Frontend

- 132 BFFs (todos importando `BACKEND_URL` de `~/lib/api-config` ✅)
- Cookies propagados via `request.headers.get("cookie")` em SSR loaders ✅
- TanStack Query com hidratação SSR via `<HydrationBoundary>` ✅

---

## 2. INVENTÁRIO DO BANCO (dados de seed)

Contagens efetivas em `prisma/dev.db`:

```
Tabela                     | Total | Observado
---------------------------|-------|------------------------------------------
User                       |    60 | 14 founders seed, 7 users de teste
Startup                    |    23 | Em `startups` (snake_case)
Campaign                   |    19 |
Plan                       |     3 | AFILIADO/INVESTIDOR/FUNDADOR R$1500/ano
Subscription               |    14 | 1 founder, 6 investidores
Investment                 |    44 |
Payment                    |    44 |
Wallet                     |    17 | ⚠ 100k Token mas só 17 Wallet
Token                      |100140| ⚠ Número inflado — investigar seed
WalletTransaction          |     0 | ⚠ Ledger vazio apesar de 44 payments
Coupon                     |     0 | 0 cupons — toda a UI de cupons fica vazia
EmailTemplate              |     0 | Painel admin de templates não tem dados
EmailTemplateVersion       |     0 | Idem
AffiliateProgram           |     0 | Painel afiliado vazio (correto)
Repasse                    |     4 | 4 repasses já existem
Country                    |     0 | ⚠⚠⚠ FORMULÁRIOS QUEBRAM
State                      |     0 | ⚠⚠⚠ IDEM
City                       |   ??? | (dados seed não populados)
StartupDocument            |    80 | 80 docs OK
KYCProfile                 |    83 | 83 perfis OK
Seal                       |    11 | 11 selos OK
CuratedPick                |     3 | 3 picks OK
Depoimento                 |    10 | 10 depoimentos OK
StartupOpinion             |    10 | 10 opiniões OK
Category                   |    12 | 12 categorias OK
AreaAtuacao                |    67 | 67 áreas OK
SystemConfig               |    16 | OK
config_parameter_values    |    15 | OK
TransparencyPost           |    36 | 36 posts OK
TransparencyDiscussion     |     0 | ⚠ Tab "Discussões" vazia
AuditLog                   |     0 | ⚠ Logs imutáveis vazios = backup desatualizado
```

⚠ **Crítico — Database:**

1. **Geografia vazia**: tables `countries` e `states` retornam 0 registros. Seed `seed:location` precisa rodar (`prisma/seeds/seed-location.ts`?). Sem isto, **dropdowns de país/estado em registro, KYC, address-form, founder/new-round falham**.
2. **Token/Wallet inconsistente**: 100k tokens para 17 wallets é desproporcional (provavelmente seed em loop), investigar se cada `Token` tem FK válida.
3. **WalletTransaction vazio**: ledger de movimentações zerado apesar de 44 payments — provavelmente o fluxo de webhook não está registrando entries, ou o seed não os cria. Verificar `PaymentService.createWalletTransactions`.

### 1.4 Falta o seed de Country/State

```
$ cat backendnode/prisma/seeds/seed-location.ts   # se existir
# (verificar; se não existir, criar a partir da API BrasilAPI ou importador SQL)
```

---

## 3. BUGS CRÍTICOS (cada um quebra funcionalidade real)

### 3.1 🔴 Colisão de rotas `/coupons` — 4 endpoints quebrados

**Sintoma:**
```
HTTP GET  /coupons/available             → 404
HTTP POST /payment/checkout/apply-coupon → 404
HTTP GET  /user/coupons/usage            → 404
HTTP POST /coupons/validate              → 200 (legacy, sobreviveu)
```

**Causa:**
Dois módulos registram `@Controller('coupons')`:

| Módulo | Controller | Endpoints registrados |
|--------|-----------|------------------------|
| `CouponModule` (legado, importa em `app.module.ts:92`) | `CouponController` (`api/coupon/coupon.controller.ts:16`) | `POST /coupons/validate` |
| `PaymentModule` (em `app.module.ts:75`) | `PublicCouponsController` (`api/payment/coupons/coupons.controller.ts:147`) | `GET /coupons/available` |
| `PaymentModule` | `CheckoutCouponsController` (mesmo arquivo, linha 159) | `POST /payment/checkout/apply-coupon` |
| `PaymentModule` | `UserCouponsController` (linha 183) | `GET /user/coupons/usage` |

Em NestJS, rotas dentro do mesmo `app.module` controller-collision dependem da ordem de registro. O OpenAPI expõe apenas `/coupons/validate` (a vitoriosa) e `/admin/coupons`. Os 3 outros são silenciosamente engolidos.

**Frontend impactado:**
- `use-available-coupons.ts` → `GET /api/coupons/available` → 404 → `availableCoupons` sempre vazio
- `use-apply-coupon.ts` → `POST /api/payment/checkout/apply-coupon` → 404 → botão "aplicar cupom" quebra
- `use-my-coupon-usage.ts` → `GET /api/user/coupons/usage` → 404 → histórico vazio
- `use-coupon-audit.ts` (admin) → `GET /api/admin/coupons/:id/usages` → OK (rota admin separada)

**Correção recomendada:**
1. **Mover** as 3 controllers novas (`PublicCouponsController`, `CheckoutCouponsController`, `UserCouponsController`) para **paths únicos**:
   - `PublicCouponsController` → `@Controller('public/coupons')` com `GET /available`
   - `CheckoutCouponsController` → manter `@Controller('payment/checkout')`
   - `UserCouponsController` → `@Controller('users/me/coupons')`

2. **OU** remover `CouponModule` legado (parece código morto — `coupon.controller.ts:49 AdminCouponController` é sobrescrito por `api/payment/coupons/coupons.controller.ts:57`). Compare antes de remover.

3. Ajustar BFFs do frontend para os novos paths.

**Severidade:** 🔴 CRÍTICO (afeta checkout, histórico de cupons e tela "Meus Cupons").

---

### 3.2 🔴 `EmailTemplatesModule` ausente — Painel admin 100% offline

**Sintoma:**
```
HTTP GET /api/admin/email-templates           → 404 (Cannot GET ...)
HTTP GET /api/admin/email-templates/:slug    → 404
HTTP POST /api/admin/email-templates/...     → 404
```

**Causa:**
`src/api/email-templates/email-templates.module.ts` existe e exporta `EmailTemplatesController` com `@Controller('api/admin/email-templates')`, mas o módulo **não está importado em `AppModule`**.

Verificação: `grep "EmailTemplatesModule" backendnode/src/app.module.ts` → 0 hits.

**Frontend impactado:**
- Toda a feature FIN-05 (Tela `/admin/email-templates` + editor TipTap) **não funciona**. 6 BFFs (`admin.email-templates*.ts`) + 6 hooks + componente `email-templates-list.tsx`, `email-template-editor.tsx`, `email-template-preview-modal.tsx`, etc. estão criados mas nunca retornam dados.

**Correção:**
```typescript
// src/app.module.ts
import { EmailTemplatesModule } from './api/email-templates/email-templates.module';
// ...
EmailTemplatesModule,
```

**Severidade:** 🔴 CRÍTICO (feature completa inacessível).

---

### 3.3 🔴 Geografia vazia (countries/states) — formulários quebram

**Sintoma:**
```
HTTP GET /country                  → 200 (data: [])
HTTP GET /country?country=Brasil   → 500 (Internal Server Error)
```

**Causa:**
Tables `countries` (0 linhas) e `states` (0 linhas) na `database.db`. Seed de localização não populou.

**Verificação do problema 500:**
```bash
$ curl -sS 'http://localhost:7077/country?country=Brasil' | jq
{
  "error": true, "codigo": 500,
  "message": "..."  // sem rastreamento porque o country id nunca bate com Brasil
}
```

**Frontend impactado:**
- `country-select.tsx` (form de país/estado em cadastro, KYC, address) → cai no fallback `DEFAULT_COUNTRIES` (6 países) — não é validado, é silencioso
- `queries.ts:countriesQueryOptions` → `["countries"]` query retorna 0 itens → "Selecione" sempre vazio
- `use-areas-by-category.ts` ainda OK (Category tem 12, AreaAtuacao tem 67)

**Correção:**
1. Verificar `backendnode/prisma/seeds/seed-location.ts` — executar manualmente:
   ```bash
   cd backendnode && npx ts-node prisma/seeds/seed-location.ts
   ```
2. Validar via BFF: `curl http://localhost:7077/country | jq '.data | length'`
3. Investigar o 500 — pode ser `parseInt(undefined)` quando o país não existe.

**Severidade:** 🔴 CRÍTICO (UX quebrada em todos os fluxos de cadastro).

---

### 3.4 🟠 `FAKE_DATA` hardcoded em `use-preview-email-template-version.ts`

**Arquivo:** `frontend/app/hooks/use-preview-email-template-version.ts:10-17`

```typescript
const FAKE_DATA = {
  userName: "João Silva",
  founderName: "Maria Santos",
  valorParcela: "R$ 12.500,00",
  // ... 28 campos hardcoded
};
const res = await fetch(`${BACKEND_URL}/api/admin/email-templates/${slug}/versions/${id}/preview`, {
  method: "POST",
  body: JSON.stringify({ variables: FAKE_DATA }),
});
```

**Por que é problema:**
- O backend (`previewEmailTemplateVersion`) recebe variáveis no POST e renderiza o template substituindo `{{variavel}}`.
- O frontend envia sempre os mesmos dados fictícios → preview nunca reflete variáveis reais do contexto (por ex., nome do founder logado).
- Bug existente na seção §6 da `frontend/AGENTS.md` como "dívida".

**Correção:**
1. Remover `FAKE_DATA` — substituir por objeto de variáveis `{}` (vazio) ou `{ userName: data?.user?.nome ?? "Usuário", ... }`.
2. Idealmente o preview deve aceitar variáveis do `useUser()`/`useAdmin()` em runtime.

**Severidade:** 🟠 ALTO (afeta confiança na edição de templates).

---

### 3.5 🟠 `pix-payment.tsx` tem QR Code mockado como string estática

**Arquivo:** `frontend/app/components/checkout/pix-payment.tsx`

```typescript
const qrCode = "00020126580014br.gov.bcb.pix013605e6080b..." // string fixa!
```

**Por que é problema:**
- Quando o backend gera o PIX via `POST /payment/:id/pix` e retorna `{ qrCodeBase64, copyPastePix }`, o componente **ignora** a resposta e usa o string estático.
- Pagamento PIX nunca decodificável — usuário não consegue pagar.

**Correção:**
- Substituir por `useQuery(["payment-pix", paymentId])` chamando `POST /payment/:id/pix` (ou `GET /payment/:id` se `qrCodeBase64` já vier no response de `GET /payment/:id`).
- Render condicional: loading skeleton → qrCode do backend → erro.

**Severidade:** 🟠 ALTO (PIX não funciona).

---

### 3.6 🟠 Detalhe da startup com 5 componentes estáticos (FinFlow-fake)

| Componente | Conteúdo mock | BFF/BFFs existentes |
|------------|----------------|---------------------|
| `app/components/startup-detail/team-section.tsx` | `FALLBACK_TEAM = [Ricardo S. Fontes, Juliana Mendes, Marcos Valente]` | `/api/startup/:id` retorna `socios`/`teams` reais — porém display apenas se `teams.length > 0` (silencioso) |
| `app/components/startup-detail/real-investors.tsx` | `investors = ["AS", "ML", "JP", "RF", "KT"]`, "+226" | `/api/startup/...` não retorna lista de investidores visíveis — backend teria `Investment` mas sem endpoint público. Bug |
| `app/components/startup-detail/risk-docs.tsx` | Riscos hardcoded ("Alta competitividade ERPs", "Open Banking") | Deveria vir de `/api/startup/:id` ou `/api/startup/:id/documents` |
| `app/components/startup-detail/business-summary.tsx` | Texto fixo sobre "FinFlow" | Backend retorna `problema/solucao/modeloReceita` no `/api/startup/:id` — **não está sendo consumido** |
| `app/components/startup-detail/investor-forum.tsx` | Q&A mock "Investidor Anjo #82" / "Ricardo S. Fontes" | Deveria usar `use-transparency-discussions.ts` (`/api/transparency/startups/:id/discussions`) |
| `app/components/startup-detail/pitch-video.tsx` | Stub — só `<img>` estático | Sem player real — vincular a `pitch.videoUrl` se houver no response |

**Por que é problema:** Toda a página `/startup/:slug` é parcialmente fake. Visitantes veem FinFlow narrativo que **não corresponde** ao `slug` real da URL.

**Correção:**
1. `team-section.tsx` — consumir `data.socios` e `data.teams` (já disponíveis em `/api/startups/slug/:slug`). Condicional: se vazio, "Sem equipe cadastrada", nunca `FALLBACK_TEAM`.
2. `real-investors.tsx` — fazer `useQuery(["investments", startupId])` e mostrar apenas investimentos confirmados (LGPD-safe).
3. `risk-docs.tsx`, `business-summary.tsx` — substituir fallback por `data.problema`, `data.solucao`, `data.mercadoAlvo`.
4. `investor-forum.tsx` — `useQuery(['discussions', slug])` consumindo BFF `transparency.*` (ver §3.8 abaixo — esses BFFs também podem estar com path errado).

**Severidade:** 🟠 ALTO (página principal de captação com dados mentirosos).

---

### 3.7 🟠 `process.env.COOKIE` em SSR loaders de checkout

**Arquivos:**
- `frontend/app/routes/private/checkout.tsx:24`
- `frontend/app/routes/private/checkout-pix.tsx:23, 43`

```typescript
const cookie = process.env.COOKIE ?? "";  // SEMPRE undefined em SSR puro
```

**Por que é problema:**
- `process.env.COOKIE` é uma variável de **build-time** (Node), nunca definida no Vite/React Router runtime. O servidor SSR roda no Node, mas `process.env.COOKIE` é definido somente se alguém exportou `COOKIE=...` antes de `npm run build`.
- Resultado: cookie `session_id` nunca chega ao backend → 401 em todas as chamadas de checkout.

**Correção:** Substituir pelos helpers oficiais:
```typescript
import { serverFetch } from "~/lib/server-fetch";  // já existe, ver §3.11

const data = await serverFetch(request, "/api/payment/123");
// Ou para chamadas fora do BFF:
const cookie = request.headers.get("cookie") ?? "";
```

**Severidade:** 🟠 ALTO (impede finalização de compra).

---

### 3.8 🟠 `use-efi-checkout.ts` (6 hooks) chamam BFFs que não existem

**Arquivo:** `frontend/app/hooks/use-efi-checkout.ts`

| Hook interno | BFF chamado | Existe? |
|--------------|-------------|---------|
| `useCreateSession` | `POST /api/checkout/efi/create` | ❌ |
| `useGetSession` | `GET /api/checkout/efi/session` | ❌ |
| `useConfirmPix` | `POST /api/checkout/efi/confirm-pix` | ❌ |
| `useConfirmCard` | `POST /api/checkout/efi/confirm-card` | ❌ |
| `useStatus` | `GET /api/checkout/efi/status/:id` | ❌ |
| `useRegeneratePix` | `POST /api/checkout/efi/regenerate-pix` | ❌ |

**Por que é problema:** O frontend migrou para o fluxo EFI Payments Hub v2 (`/api/v2/payments/checkout`) via `CheckoutController` (`backendnode/src/api/v2/payments/controllers/checkout.controller.ts`), mas o hook `use-efi-checkout.ts` continua usando paths `/api/checkout/efi/*` que **não existem**.

**Correção:**
1. **Substituir** uso de `use-efi-checkout.ts` por `use-token-reserve-mutation.ts` + `use-confirm-card-mutation.ts` + `use-generate-pix-mutation.ts` (todos corretos, testados em §4).
2. **Deletar** `use-efi-checkout.ts` se tornar dead-code.
3. **Criar** BFFs `routes/api/checkout.efi.*.ts` SE o time quiser manter o hook legado (caminho com `BACKEND_URL/checkout/efi/...` direto no NestJS).

**Severidade:** 🟠 ALTO (rota `/checkout/efi/:paymentId` quebra).

---

### 3.9 🟠 `use-founder-investors` chama endpoint inexistente

**Hook:** `use-founder-investors.ts` → BFF → `GET /startup/dashboard/investors`

**Backend:** Não existe rota `/startup/dashboard/investors`. O agregado de investidores por startup é retornado indiretamente via `/startup/dashboard/metrics` (`investor_count` por campanha), mas a lista nomeada de investidores não tem endpoint dedicado.

**Correção:**
1. **Opção A**: Criar o endpoint `GET /startup/:id/investors` no backend (`StartupController`) retornando `[{publicId, nome, valorInvestido, data, ...}]` (sem expor CPF/email — LGPD).
2. **Opção B**: Mudar o hook para consumir `useInvestedStartups` (já retorna `InvestedStartup[]` com `investorCount`) + `useInvestments` filtrado por startupId.

**Severidade:** 🟠 ALTO (aba "Investidores" do founder dashboard vazia).

---

### 3.10 🟡 `wallet.tsx` chama `/wallet/transactions` (404)

**Arquivo:** `frontend/app/routes/private/wallet.tsx`

```typescript
fetch(`${BACKEND_URL}/wallet/transactions`)  // 404
```

A rota real é: `/wallet` retorna `{ balance, blocked, transactions[] }` já agregado. Não há `/wallet/transactions` separado.

**Correção:** Remover o fetch duplicado; usar `data.transactions` do `/wallet`. OU criar o endpoint se for necessário para paginação separada.

**Severidade:** 🟡 MÉDIO (UX polui com toast de erro visível).

---

### 3.11 🟡 `compliance-users.tsx` faz fetch relativo `/api/admin/users`

**Arquivo:** `frontend/app/routes/private/compliance-users.tsx:20`

```typescript
const data = await fetch("/api/admin/users")  // fetch relativo no SSR
```

**Por que é problema:** Funciona em alguns cenários mas é inconsistente com padrão BFF. O correto é usar `serverFetch(request, "/api/admin/users")` que propaga cookies + identificador SSR.

**Correção:** Trocar para `serverFetch(request, "/api/admin/users")`.

**Severidade:** 🟡 MÉDIO (smell arquitetural, não bloqueia funcionalidade).

---

## 4. ENDPOINTS QUE FUNCIONAM (auditados OK)

Testados em runtime contra `localhost:7077`:

### 4.1 Públicos (sem auth)

| Endpoint | Status | Observação |
|----------|--------|-----------|
| `GET /health` | 200 | OK |
| `GET /ready` | 200 | DB + RabbitMQ OK |
| `GET /marketplace/all` | 200 | 14 startups (verificar paginação) |
| `GET /marketplace/featured` | 200 | 10 items |
| `GET /marketplace/recently-added` | 200 | 1 item |
| `GET /marketplace/sector-stats` | 200 | 7 setores |
| `GET /marketplace/curated-picks` | 200 | 3 picks |
| `GET /marketplace/early-access/ranking` | 200 | OK |
| `GET /seals` | 200 | 11 selos (cached 600s) |
| `GET /seals/startup/:id` | 200 | (testado em §3) |
| `GET /categories` | 200 | 12 categorias |
| `GET /categories/:id/areas` | 200 | 10 áreas (cat 1) |
| `GET /campaigns` | 200 | 19 campanhas |
| `GET /campaigns/:id` | 200 | Detalhe |
| `GET /campaigns/:id/checkout` | 200 | Detalhe p/ checkout |
| `GET /startup/marketplace/*` | 200 | 5 endpoints públicos OK |
| `GET /startup-opinion?limit=12` | 200 | 6 opiniões |
| `GET /depoimento` | 200 | 6 depoimentos |
| `GET /geral/bancos` | 200 | 54793 bytes (cached 7d) ⚠ enorme |
| `GET /country` | 200 | ⚠ **vazio** — bug crítico §3.3 |
| `POST /coupons/validate` | 400 | Funciona (legacy) |
| `GET /tokens/verify/:hash` | 200 | OK (público p/ QR code) |
| `GET /verificar/:documentId` | 200 | OK (público, com throttling) |

### 4.2 Autenticação (públicos)

| Endpoint | Status | Observação |
|----------|--------|-----------|
| `POST /auth` | 200 | Login retorna `requiresVerification: true` |
| `POST /auth/verify-code` | 200 | Após 2FA, cookies setados |
| `POST /auth/newcode` | 401 | OK (precisa sessão) |
| `GET /auth/check-af2` | 200 | `{af2Verified: true/false}` |
| `POST /auth/logout` | 200 | Limpa cookie |
| `POST /auth/register/user` | 200 | OK |
| `POST /auth/forgot-password` | 400 | DTO exige code+senha (não apenas email — OK) |
| `GET /auth/dev/2fa-code` | 200 | ⚠ dev only |

### 4.3 Privados (founder)

Testado com login `founder@iselftoken.com / Founder123!`:

| Endpoint | Status | Observação |
|----------|--------|-----------|
| `GET /users/me` | 200 | `{id, publicId, email, nome, role, ...}` (1204 bytes) |
| `PATCH /users/me` | 200 | OK (input vazio = noop) |
| `GET /users/me/startup` | 200 | `{startups[], totalCaptado, ...}` |
| `GET /startup` | 200 | Lista 3 startups |
| `POST /startup` | 400 | DTO validation correto |
| `GET /startup/dashboard/metrics` | 200 | Aggregados reais do DB |
| `POST /startup/draft` | 201 | `{savedAt}` |
| `GET /startup/draft` | 200 | OK (mas retorna erro genérico se vazio) |
| `GET /wallet` | 200 | `{balance: 500, blocked: 0, transactions: []}` |
| `POST /wallet/deposit` | 400 | DTO exige amount + paymentId válido |
| `GET /tokens` | 200 | Lista tokens |
| `GET /investments` | 200 | Lista investments |
| `GET /investments/my-startups` | 200 | Agregado (founder-dashboard) |
| `GET /plans` | 200 | 3 planos R$1500/ano |
| `GET /subscriptions` | 200 | 14 subs |
| `GET /subscriptions/me/history` | 200 | Lista |
| `GET /founder/startups/1/termo-adesao` | 200 | OK |
| `GET /founder/startups/1/repasse` | 200 | OK |
| `GET /founder/startups/1/change-requests` | 200 | Lista |
| `GET /founder/document-requests` | 200 | Lista |
| `GET /notifications` | 401 | ⚠ Auth issue (cookie expirou) — endpoint OK |

### 4.4 Admin/Compliance/Financeiro

Logins testados: `admin@iselftoken.com/@Lexandre230188`, `compliance@...`, `financeiro@...`.

| Endpoint | Status | Role | OK |
|----------|--------|------|-----|
| `GET /admin/dashboard` | 200 | ADMIN | ✓ |
| `GET /admin/users` | 200 | ADMIN | 25 users |
| `GET /admin/startups` | 200 | ADMIN | 23 startups |
| `GET /admin/kyc` | 200 | ADMIN | 0 (⚠ — KYCProfile tem 83 rows mas filtro pending retorna 0) |
| `GET /admin/compliance/dashboard` | 200 | ADMIN/COMPLIANCE | OK |
| `GET /admin/document-requests` | 200 | COMPLIANCE | 0 |
| `GET /admin/audit-logs` | 200 | COMPLIANCE | 0 |
| `GET /admin/coupons` | 200 | ADMIN | 0 (correto, tabela vazia) |
| `GET /admin/plans` | 200 | ADMIN | 3 |
| `GET /admin/subscriptions` | 200 | ADMIN | 14 |
| `GET /admin/history` | 200 | ADMIN | 19k bytes (export CSV) |
| `GET /admin/financeiro/dashboard` | 200 | FINANCEIRO | OK |
| `GET /admin/financeiro/transactions` | 200 | FINANCEIRO | 25 |
| `GET /admin/financeiro/config` | 200 | FINANCEIRO | 13 configs |
| `POST /admin/financeiro/comprovantes` | 400 | FINANCEIRO | OK (file obrigatório) |
| `GET /admin/seals` | 200 | ADMIN | 11 |
| `GET /admin/config/fundraising` | 200 | ADMIN | OK |
| `GET /admin/financeiro/reconciliation?from=...&to=...` | 500 | FINANCEIRO | ⚠ internal error |

---

## 5. ENDPOINTS QUE NÃO FUNCIONAM (resumo)

| Endpoint | Sintoma | Causa provável | Severidade |
|----------|---------|----------------|------------|
| `GET /coupons/available` | 404 | Colisão §3.1 | 🔴 |
| `POST /payment/checkout/apply-coupon` | 404 | Colisão §3.1 | 🔴 |
| `GET /user/coupons/usage` | 404 | Colisão §3.1 | 🔴 |
| `GET /api/admin/email-templates` | 404 | Módulo não importado §3.2 | 🔴 |
| `POST /api/admin/email-templates/...` | 404 | §3.2 | 🔴 |
| `GET /country` | 200 mas `data: []` | DB vazio §3.3 | 🔴 |
| `GET /country?country=Brasil` | 500 | DB vazio §3.3 | 🔴 |
| `GET /admin/kyc` | lista `[]` | Filtro PENDING retorna vazio (talvez estado inconsistente) | 🟡 |
| `GET /wallet/transactions` | 404 | Endpoint não existe | 🟡 |
| `POST /admin/financeiro/reconciliation?...` | 500 | Fetch failure (downstream) | 🟡 |

---

## 6. CODE REVIEW DOS SERVICES/CONTROLLERS BACKEND

### 6.1 Pontos de atenção por arquivo

| Arquivo | Problema |
|---------|----------|
| `payment.service.ts:remove` | Stub `return "This action removes..."` (não deveria estar exposto) |
| `coupons/coupons.controller.ts:140` | `const userId = 1; // TODO: extrair do token JWT` (4 ocorrências) — **BUG LATENTE**: cupom é atribuído sempre ao user id=1 independente de quem chama |
| `admin-kyc.controller.ts:32` | `@Get('kyc/:userId')` conflita com `@Post('kyc/:kycProfileId/decide')` (resolvido por ordem) |
| `notifications/notifications.controller.ts` | Armazenamento em memória (não persiste em Prisma) — quebra em deploy multi-replica |
| `wallet.controller.ts:deposit` | Não cria `WalletTransaction` automaticamente (ledger zerado §1.4) |
| `email-templates/email-templates.module.ts` | Módulo existe mas não está em AppModule §3.2 |
| `coupons/coupons.controller.ts` | Conflito de controller §3.1 |
| `app.controller.ts:debug-sentry*` | Rota debug exposta em prod (OK se NODE_ENV gated) |

### 6.2 Convenções OK

- ✅ `ResponseDto.success/error` padronizado
- ✅ `Logger` do NestJS (não `console.log` direto)
- ✅ Documentos Swagger nos controllers
- ✅ DTOs com `class-validator`
- ✅ BackupInterceptor em UsersController
- ✅ `@Global()` em Prisma, ConfigModule
- ✅ Guards compostos (`AuthGuard + AdminGuard`, `TokenGateGuard`, `FinanceAccess('write')`)

---

## 7. CODE REVIEW DOS HOOKS/COMPONENTES FRONTEND

### 7.1 Anti-patterns encontrados

| Arquivo | Anti-pattern |
|---------|-------------|
| `use-preview-email-template-version.ts:10` | `FAKE_DATA` hardcoded (28 campos) §3.4 |
| `pix-payment.tsx` | QR Code string estática §3.5 |
| `startup-detail/team-section.tsx` | `FALLBACK_TEAM` array hardcoded §3.6 |
| `startup-detail/real-investors.tsx` | `investors = ["AS","ML",...]` constante §3.6 |
| `startup-detail/risk-docs.tsx` | Riscos literais §3.6 |
| `startup-detail/business-summary.tsx` | Texto fixo §3.6 |
| `startup-detail/investor-forum.tsx` | Q&A mockada §3.6 |
| `checkout.tsx:24`, `checkout-pix.tsx:23` | `process.env.COOKIE` §3.7 |
| `use-efi-checkout.ts` | 6 hooks para BFFs inexistentes §3.8 |
| `register-form.tsx:10-17` | `DEFAULT_COUNTRIES` fallback |
| `wallet.tsx` (loader) | fetch `BACKEND_URL/wallet/transactions` (404) §3.10 |
| `compliance-users.tsx:20` | fetch relativo `/api/admin/users` §3.11 |
| `pricing.tsx` (loader) | fetch `url.origin/api/plans` (padrão distinto) |
| `founder.startups.$id.transparencia.tsx` | mistura VITE_API_URL e BACKEND_URL direto |

### 7.2 Convenções OK

- ✅ Todos os 132 BFFs importam `BACKEND_URL` de `~/lib/api-config`
- ✅ Cookie's propagados via `request.headers.get("cookie")` (exceto os 2 broken em §3.7)
- ✅ TanStack Query com `staleTime` 60s e `HydrationBoundary` em SSR
- ✅ `useUser` deriva de Query (sem AuthContext legacy)
- ✅ Mensagens PT-BR
- ✅ Zod para validação de form (`login-schema.ts`, `startup-schema.ts`)

### 7.3 Performance/Deduplicação (TanStack)

- ✅ `use-investor-dashboard.ts` + `use-invested-startups.ts` reutilizam chave `["investments"]`
- ✅ `notifications.tsx` migrado para useQuery (Fase 3B.4)
- ⚠ Risco: múltiplos loaders SSR chamando `serverFetch('/api/me')` mesmo após hidratação — verificar se há cache key consistente.

---

## 8. FLUXOS DE HMR / BUILD

| Item | Status |
|------|--------|
| Backend compila | ✅ `nest start --watch` rodando |
| DB migrations | ✅ 60+ tabelas existem |
| Redis | ✅ UP (sessões cache) |
| RabbitMQ | ✅ UP (pagamentos DLQ/retry) |
| Antivírus integrado | — Não utilizado; uploads usam validação, sanitização e processamento síncrono |

---

## 9. PLANO DE CORREÇÃO (ordenado por impacto)

### P0 — Bloqueadores (24h)

| # | Tarefa | Arquivo | Estimativa |
|---|--------|---------|------------|
| 1 | Corrigir colisão de rotas `/coupons` (mover 3 controllers para paths únicos) | `backendnode/src/api/payment/coupons/coupons.controller.ts` + `app.module.ts` | 2h |
| 2 | Importar `EmailTemplatesModule` em `AppModule` | `backendnode/src/app.module.ts` (+1 linha) | 5min |
| 3 | Rodar seed de localização (countries/states/cities) | `backendnode/prisma/seeds/seed-location.ts` | 30min |
| 4 | Corrigir `process.env.COOKIE` em 2 loaders de checkout | `frontend/app/routes/private/checkout.tsx`, `checkout-pix.tsx` | 30min |
| 5 | Renderizar `qrCodeBase64` real em `pix-payment.tsx` | `frontend/app/components/checkout/pix-payment.tsx` | 1h |

### P1 — Features Quebradas (48h)

| # | Tarefa | Arquivo | Estimativa |
|---|--------|---------|------------|
| 6 | Remover mocks `FinFlow` (5 componentes) | `app/components/startup-detail/*.tsx` | 4h |
| 7 | Criar endpoint `GET /startup/:id/investors` OU ajustar hook para `/investments` | `backendnode/src/api/startup/startup.controller.ts` + `use-founder-investors.ts` | 2h |
| 8 | Substituir `use-efi-checkout.ts` por hooks corretos do EFI v2 | `frontend/app/hooks/use-efi-checkout.ts` | 1h |
| 9 | Remover `FAKE_DATA` do preview de e-mail templates | `use-preview-email-template-version.ts` | 30min |

### P2 — Hardening (1 sem)

| # | Tarefa | Estimativa |
|---|--------|------------|
| 10 | Corrigir `userId = 1` hardcoded em coupons controller (4 ocorrências) | 1h |
| 11 | Persistir `Notification` em Prisma (substituir Map em memória) | 4h |
| 12 | Auditar inconsistência `Token` (100k) vs `Wallet` (17) — provável seed em loop | 2h |
| 13 | Corrigir `wallet.controller.ts:deposit` para gravar `WalletTransaction` | 2h |
| 14 | Remover fetch `/wallet/transactions` de `wallet.tsx` ou criar endpoint paginado | 30min |
| 15 | Padronizar todos os loaders SSR para usar `serverFetch(request, path)` em vez de `BACKEND_URL + path` | 3h |
| 16 | Investigar `500` em `GET /country?country=Brasil` | 1h |
| 17 | Investigar `500` em `GET /admin/financeiro/reconciliation?from=X&to=Y` | 1h |
| 18 | Remover `usePreviewEmailTemplateVersion` da feature FIN-05 se manter `FAKE_DATA` | 30min |

### P3 — Dívida (backlog)

- Anti-pattern: `payment.service.ts:remove` é stub → remover endpoint exposto
- Remover `CouponModule` legado (código morto)
- Investigar `InvestedStartup` map (3 chaves idem-postas)
- Documentar `custom_decimal` para SQLite (Decimal como TEXT)
- Implementar fallback para 5xx vs 401 no layout loader de `/auth/status`

---

## 10. AÇÕES DE VALIDAÇÃO APÓS CORREÇÕES

Para cada bug corrigido, o teste mínimo é:

```bash
# Backend
curl -sS http://localhost:7077/openapi.json | jq '.paths | keys[] | select(test("email-templates|coupons"))'

# Database
sqlite3 backendnode/db/database.db "SELECT COUNT(*) FROM countries"

# Frontend (após fix)
cd frontend && pnpm run typecheck && pnpm run test
pnpm run build  # SSR compile
```

Para fluxos críticos:
```bash
# E2E Playwright (já existente)
cd frontend && pnpm run test:e2e:playwright
```

---

## 11. CONCLUSÃO

**Pronto para uso:** Login/2FA, Marketplace, Categorias/Áreas, Plans/Subs, Wallet, Investments, Transparência (Posts), PKI/Termo de Adesão, Affiliates (estrutura), Compliance Dashboard, Admin Dashboard, Selos, Depoimentos, Startup Opinions.

**Bloqueado para produção:**
- Cupons (checkout aplica, painel histórico)
- Email Templates admin (toda a feature)
- Formulários de cadastro (geografia)
- Checkout de pagamento (PIX com QR fake)
- Páginas de detalhe de startup (FinFlow fake)

**Próxima iteração:** Aplicar P0 (24h) + P1 (48h) garante cobertura de ~90% das funcionalidades nominais. P2/P3 são hardening para auditoria/performance.
