# Page Priority — Top-15 Páginas Pré-Mapeadas

Inventário das páginas com **maior risco de gargalo** sob a meta de 500 VUs simultâneos. Baseado em exploration prévio do codebase (rotas com queries pesadas, joins profundos, ou alto tráfego esperado).

A skill usa esta lista como **foco padrão** durante Fase 2 (Medir). Para auditoria completa, varre todas as ~290 rotas via `perf-scout.sh`.

---

## Ranking por Risco

| Rank | Página | Tipo | Auth | BFFs/queries | Risco | Prioridade |
|------|--------|------|------|--------------|-------|------------|
| 1 | `/admin/dashboard` | SSR private | sim | 30+ agregados | Crítico | P0 |
| 2 | `/financeiro/dashboard` | SSR private | sim | 8+ queries | Alto | P0 |
| 3 | `/startup/:slug` (público) | SSR public | não | 8+ queries (joins) | Alto | P0 |
| 4 | `/checkout/:id` | SSR private | sim | 4 queries + EFI | Alto (síncrono) | P1 |
| 5 | `/marketplace` | SSR public | não | 5+ queries | Alto | P1 |
| 6 | `/home` | SSR private | sim | 4 queries | Médio | P1 |
| 7 | `/wallet` | SSR private | sim | 6 queries | Médio | P1 |
| 8 | `/founder/dashboard` | SSR private | sim | 5+ queries | Médio | P2 |
| 9 | `/compliance/dashboard` | SSR private | sim | 6+ queries | Médio | P2 |
| 10 | `/api/admin/dashboard/summary` | BFF | sim | 30+ agregados | Crítico | P0 |
| 11 | `/api/users/me` | BFF | sim | Redis + DB | Médio | P1 |
| 12 | `/api/payment` | BFF | sim | findMany + count | Médio | P1 |
| 13 | `/api/startups/featured` | BFF | não | 3+ queries | Médio | P2 |
| 14 | `/api/marketplace` | BFF | não | 5+ queries | Alto | P1 |
| 15 | `/api/auth/status` | BFF | não | Redis only | Baixo | P3 |

---

## Detalhamento por Página

### 1. /admin/dashboard

- **Arquivo**: `frontend/app/routes/private/admin/dashboard.tsx`
- **Backend**: `backendnode/src/api/admin/admin-dashboard.controller.ts` + `admin-dashboard-summary.service.ts`
- **BFF chamado**: `GET /api/admin/dashboard/summary`
- **Risco**: 30+ agregados em `Promise.all` sem cache Redis; 3 scans sem índice composto
- **Latência esperada**: 1800–2400ms p95
- **SLO**: p95 < 500ms (ver `slo-budgets.md`)
- **Cenário k6**: `admin_dashboard` (20 VUs)

### 2. /financeiro/dashboard

- **Arquivo**: `frontend/app/routes/private/financeiro/dashboard.tsx`
- **Backend**: `backendnode/src/api/financeiro/`
- **Risco**: Múltiplos `findMany` com `include` aninhado (Payment + Subscription + Campaign)
- **Cenário k6**: `financeiro_load` (incluído em admin)

### 3. /startup/:slug

- **Arquivo**: `frontend/app/routes/public/startup.$slug.tsx`
- **Backend**: `backendnode/src/api/startup/startup.controller.ts`
- **Risco**: Página pública de altíssimo tráfego SEO; joins profundos (campaign + investment + team + seals)
- **Latência esperada**: 400–600ms p95
- **SLO**: p95 < 300ms (rota pública)
- **Cenário k6**: `marketplace_browse` (200 VUs)

### 4. /checkout/:id

- **Arquivo**: `frontend/app/routes/private/checkout/$id.tsx`
- **Backend**: `backendnode/src/api/payment/payment.controller.ts`
- **Risco**: Caminho síncrono com chamada HTTP externa (EFI); PIX depende de webhook
- **Cenário k6**: `checkout_flow` (30 VUs)

### 5. /marketplace

- **Arquivo**: `frontend/app/routes/public/marketplace.tsx`
- **Backend**: `backendnode/src/api/marketplace/marketplace.service.ts`
- **Risco**: Cache Redis 5min configurado mas invalidação pode não estar alinhada
- **Cenário k6**: `marketplace_browse` (200 VUs)

### 6. /home

- **Arquivo**: `frontend/app/routes/private/home.tsx`
- **Risco**: Carrega featured + my-startups em paralelo (geralmente OK)
- **Cenário k6**: Combinado em `auth_login`

### 7. /wallet

- **Arquivo**: `frontend/app/routes/private/wallet.tsx`
- **Backend**: `backendnode/src/api/wallet/wallet.service.ts`
- **Risco**: `findMany` em Tokens + Investments + Withdrawals sem take explícito
- **Cenário k6**: `wallet_load` (200 VUs)

### 8. /founder/dashboard

- **Arquivo**: `frontend/app/routes/private/founder/dashboard.tsx`
- **Risco**: Agregados por startup + captação ativa
- **Cenário k6**: Combinado em `auth_login`

### 9. /compliance/dashboard

- **Arquivo**: `frontend/app/routes/private/compliance/dashboard.tsx`
- **Backend**: `backendnode/src/api/compliance/`
- **Risco**: Similar ao admin dashboard mas com filtros adicionais

### 10–15. BFFs Críticos

Endpoints `/api/*` que servem as páginas acima. Cada um herda os mesmos riscos do service backend. Auditar com `B1–B12` do `backend-checklist.md`.

---

## Como Usar Este Mapeamento

### Modo Padrão (full)

```bash
# Fase 1 — Recon (todas as ~290 rotas)
bash .opencode/skills/performance-tuning/scripts/perf-scout.sh > docs/performance/<id>-scout.txt

# Fase 2 — Medir (top-15 desta lista)
k6 run .opencode/skills/performance-tuning/templates/k6-script.js
```

### Modo Focado (1 página)

```bash
@perf audit /admin/dashboard
```

A skill foca apenas na página + seus BFFs + services relacionados, ignorando as outras 14.

### Modo Top-10

```bash
@perf audit top-10
```

A skill audita apenas ranks 1–10 (excluindo BFFs 10–15 que são cobertos pelas páginas).

---

## Critério de Inclusão no Top-15

Páginas entram no ranking se atendem **2 ou mais** dos critérios:

1. Mais de 5 queries Prisma no fluxo de render
2. `include` com > 3 níveis de profundidade
3. Sem cache Redis configurado
4. Auth-gated (rotas private têm latência adicional de `requireAuthorizedUser`)
5. Chamada HTTP externa (EFI, BrasilAPI, AWS S3)
6. Paginação `findMany` sem `take`
7. Listagem com `orderBy createdAt desc` sem índice
8. Rota pública (sem barreira de login → tráfego imprevisível)

---

## Atualização

Este mapeamento é um snapshot. Conforme o iSelfToken evolui, novas páginas podem entrar no top-15 (ex: nova feature compliance, novo fluxo admin). Re-rodar `perf-scout.sh` periodicamente para refresh.
