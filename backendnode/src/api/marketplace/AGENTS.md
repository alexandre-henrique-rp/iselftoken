# Marketplace

**Propósito:** Vitrine pública de startups - featured, recently-added, opportunities, sector-stats, catálogo paginado, curated picks (curadoria iSelfToken) e ranking de Early Access. Endpoints públicos com cache HTTP.

## Regras de sessão (`scripts/marketplace/marketplace.md`)

Aplicadas em `MarketplaceService.getFeatured()` e validadas por `marketplace.service.spec.ts`:

1. **Max 15 itens** por seção (`MARKETPLACE_SECTION_LIMIT`).
2. **Captação ativa** obrigatória (`campaigns.some.status === OPEN`).
3. **> 4 selos ativos** obrigatórios (`MIN_SEALS_FOR_FEATURED`).
4. **Bloco elite** (`score > 98`) aparece antes do bloco prioridade (`score 85-98`).
5. **Bloco > 85** tem ordem aleatória **estável por dia** via `seededShuffle(seed = YYYY-MM-DD)`.

Constantes e helpers vivem em `marketplace.service.ts`:
- `MARKETPLACE_SECTION_LIMIT = 15`
- `MIN_SEALS_FOR_FEATURED = 4`
- `SCORE_TOP_THRESHOLD = 98`
- `SCORE_PRIORITY_THRESHOLD = 85`
- `applyFeaturedOrdering(startups)` — divide em elite/priority/rest e embaralha com seed.
- `getDailySeed()` — retorna `YYYY-MM-DD` em UTC.
- `seededShuffle(arr, seed)` — PRNG xorshift32 inicializado por SHA-256 do seed.

## Regras `getRecentlyAdded` / `getEarlyAccessStartups` (S0-T02)

Aplicadas em `MarketplaceService.queryRecentEligible()` e validadas em `marketplace.service.spec.ts`:

1. **Max 15** itens (`MARKETPLACE_SECTION_LIMIT`).
2. Apenas campanhas com `status=OPEN` E `createdAt >= now() - 20 dias`.
3. Ordenação: `count(selos ativos) DESC, campaigns.createdAt DESC` (tiebreaker).
4. Pós-filtro defensivo (defense in depth) caso a query seja bypassada.
5. Endpoint espelho em `/marketplace/early-access/startups` adiciona campo `rank` incremental (1..N).

Constantes: `RECENT_WINDOW_DAYS = 20`. `getEarlyAccessStartups` reusa `queryRecentEligible()` para garantir mesmo critério.

## Regras `getPicksOfWeek` (S0-T03)

Aplicadas em `MarketplaceService.queryPicksOfWeekEligible()` e validadas em `marketplace.service.spec.ts`:

1. **Max 15** itens (`MARKETPLACE_SECTION_LIMIT`).
2. Apenas campanhas com `status=OPEN` E `createdAt >= now() - 7 dias`.
3. Ordenação: `campaigns.createdAt ASC` (captação mais antiga primeiro).
4. Pós-filtro defensivo (defense in depth).
5. **Diferente** de `/marketplace/curated-picks` (curadoria humana fixa, top 3 com quote do curador). Picks da Semana é **filtro temporal automático**.

Endpoint: `GET /marketplace/picks-of-week` (cache 5min). Constante: `PICKS_OF_WEEK_WINDOW_DAYS = 7`.

## Cap de 15 em todas as seções (S0-T04)

`MARKETPLACE_SECTION_LIMIT = 15` é o teto rígido para qualquer seção pública. **Não configurável via FinanceConfig.** Se algum config antigo (`marketplace.featured_limit`, `marketplace.opportunities_limit`) tiver valor maior, o pool de busca usa `max(config, 15)` mas o output sempre fica em `slice(0, 15)`.

| Método | Cap em 15? |
|---|---|
| `getFeatured()` | ✓ |
| `getRecentlyAdded()` | ✓ |
| `getEarlyAccessStartups()` | ✓ |
| `getPicksOfWeek()` | ✓ |
| `getOpportunities()` | ✓ (corrigido em S0-T04) |
| `getAll()` | n/a (paginado, `pageSize` até 60) |
| `getCuratedPicks()` | n/a (curadoria humana, top 3) |
| `getSectorStats()` | n/a (agregação por categoria) |

Validação: 4 testes em `marketplace.service.spec.ts` simulam `FinanceConfig=50` e esperam `data.length === 15`.

## S1 — Schema `add_marketplace_pinning_score`

Migration aplicada em `prisma/migrations-sqlite/20260922000000_marketplace_pinning_score/migration.sql`. Aditiva + nullable + default `0` para `manuallyPinned` — sem risco de perda de dados.

### Campos novos em `Startup`

| Campo | Tipo | Default | Uso |
|---|---|---|---|
| `manuallyPinned` | Boolean | `false` | Pin ativo? (S4) |
| `manuallyPinnedBy` | Int? | null | FK → `User.id` ON DELETE SET NULL |
| `manuallyPinnedAt` | DateTime? | null | Timestamp do pin |
| `manuallyPinnedReason` | String? | null | Motivo ≥ 20 chars (S4) |
| `scoreBreakdown` | Json? | null | 9 chaves: kyc, documents, seals, traction, raised, deadline, category, partnerships, activity |
| `scoreLastCalculatedAt` | DateTime? | null | Cache invalidation (S2) |

Índice composto: `Startup_manuallyPinned_score_idx (manuallyPinned DESC, score DESC)` — query principal do featured.

### Validação E2E

`test/e2e/flows/marketplace-migration.e2e-spec.ts` — 3 testes cobrindo:
1. Persist + leitura de pinning manual
2. Persist + leitura de scoreBreakdown JSON + scoreLastCalculatedAt
3. Default `manuallyPinned=false` quando não setado (backward compat)

### Seed retrocompat

`prisma/seed.ts` seta TechInnovate com `score=45` + `scoreBreakdown` completo + `scoreLastCalculatedAt=now()`. Se a TechInnovate já existe com `score !== 45`, é atualizada in-place via `prisma.startup.update` (S1-T02).

## S2 — Score automático (ScoreCalculatorService)

`score-calculator.service.ts` calcula score 0..100 com breakdown de 9 chaves conforme PRD §5:

| Chave | Max | Regra |
|---|---|---|
| kyc | 10 | `KYCStatus.APPROVED` (founder) = 10, senão 0 |
| documents | 15 | cada `StartupDocument.reviewStatus='APPROVED'` = 3 pts, max 5 |
| seals | 15 | cada selo ativo = 3 pts, max 5 |
| traction | 10 | `Investment.count > 5` = 10, `> 2` = 5, senão 0 |
| raised | 10 | `raised/target >= 0.8` = 10, `>= 0.5` = 5, senão proporcional |
| deadline | 5 | dias restantes: `>60` = 5, `>30` = 3, `>7` = 1, senão 0 |
| category | 5 | AI/SAAS/FINTECH = 5, outras = 3 |
| partnerships | 10 | cada selo PARTNERSHIP ativo = 5 pts, max 2 |
| activity | 20 | `daysSince(updatedAt) <= 7` = 20, `<= 14` = 10, `<= 30` = 5 |

Persiste em `Startup.score + Startup.scoreBreakdown + Startup.scoreLastCalculatedAt` e emite evento `startup.scoreUpdated`.

### `recalculateAll()` (S2-T02)

Recalcula score de todas as startups APPROVED. Detecta outliers (delta ≥ 30 pts) e emite evento `marketplace.scoreOutlier` para auditoria. O cron propriamente dito (`@Cron('0 3 * * *')`) será conectado em S2-T02 quando integrarmos Redis lock — por ora o método é invocável manualmente.

### Endpoint privado (S2-T05)

`GET /startups/:id/marketplace-info` — score + breakdown + pin info. Auth: `AuthGuard` + ownership check (founder da startup OU role `ADMIN`/`COMPLIANCE`/`FINANCEIRO`). Documentado em `marketplace-info.controller.ts` + DTO em `dto/marketplace-info.dto.ts`.

### Featured consolidado (S2-T04)

`getFeatured()` agora usa `orderBy: [{ manuallyPinned: 'desc' }, { score: 'desc' }, { createdAt: 'desc' }]` — materializa o índice composto `Startup_manuallyPinned_score_idx` criado em S1. Pinos aparecem primeiro, depois score desc.

### Validação

| Cobertura | Testes |
|---|---|
| `score-calculator.service.spec.ts` | 13 testes (score=100 canônico, score=0 mínimo, cada chave do breakdown, persist, evento) |
| `marketplace.service.spec.ts` | 16 testes (regras S0 + cap 15) |

### Tasks S2 restantes (futuro)

- **T02 (cron + lock Redis)**: `@Cron('0 3 * * *')` com `Redis SET NX EX 1800` para `lock:recalculate:marketplace-scores`. Listener de `marketplace.scoreOutlier` criando AuditLog + email DPO.
- **T03 (listeners de evento)**: `@OnEvent` para `startup.documentUploaded`, `startup.kycStatusChanged`, `startup.sealAssigned`, `startup.campaignStatusChanged`. Debounce 30s por startupId via Redis.

## S4 — Pinning manual + UI admin + auditoria

### Backend

| Endpoint | Auth | Regra |
|---|---|---|
| `POST /admin/startups/:id/pin` | ADMIN/COMPLIANCE/FINANCEIRO | `reason >= 20 chars`, max 3 pinos ativos |
| `DELETE /admin/startups/:id/pin` | ADMIN/COMPLIANCE/FINANCEIRO | Preserva `reason` no `AuditLog.oldValue` (LGPD) |
| `GET /admin/marketplace/pinned` | ADMIN/COMPLIANCE/FINANCEIRO | Lista 0..3 pinos, ordenado por `manuallyPinnedAt DESC` |

`pin.service.ts`:
- Constantes: `MAX_PINNED = 3`, `MIN_REASON_LENGTH = 20`.
- `pin()` valida reason (400), conta pinos ativos (409 se >= 3), atualiza + cria AuditLog dentro de `$transaction` (anti race).
- `unpin()` limpa campos mas preserva reason em `AuditLog.oldValue`.
- `listPinned()` filtra `manuallyPinned: true`, ordena `manuallyPinnedAt DESC`.

`pin-change.listener.ts` (S4-T04):
- `@OnEvent('marketplace.pinChanged')` invalida `Redis DEL marketplace:featured:v1`.
- Fallback: TTL natural de 5min cobre Redis offline.

`AuditLog` actions: `PIN_STARTUP` / `UNPIN_STARTUP` — string livre no schema, validação no service.

### Frontend

`/admin/marketplace` (S4-T03):
- Loader SSR chama BFF `/api/admin/marketplace/pinned`.
- `AdminMarketplaceView` mostra contador `N/3 pinos ativos`, lista com nome/slug/reason, botao Despinear.
- `MAX_PINNED_SLOTS = 3` (constante espelhada).
- `routes.ts:521` registra a rota; `routes.ts` (BFF) registra `admin/marketplace/pinned`.

### Testes

| Cobertura | Testes |
|---|---|
| `pin.service.spec.ts` | 13 testes (motivo<20, motivo=19, motivo=20, 409 max, idempotência, audit log, evento, 404, listPinned) |
| `admin-marketplace-view.test.tsx` (frontend) | 4 testes (lista, empty, contador, botoes) |

### Tasks S2 restantes (continuam pendentes do S2)

(S4 nao depende da cron de S2 — opera via API manual.)

## S5 — Hardening, polish, go-live

| Task | Status | Arquivo |
|---|---|---|
| **T01** OpenAPI snapshot | ✅ done | regenerado via `npm run openapi:dump` (CI/staging) |
| **T02** Sentry alerts config | ✅ done | `marketplace.sentry.ts` com 3 triggers (score_cron_duration, pin_abuse, score_outlier) |
| **T03** Smoke tests + runbook | ✅ done | `test/e2e/flows/marketplace-go-live.e2e-spec.ts` (5 cenários) + `docs/runbooks/marketplace-go-live.md` |
| **T04** Email em massa founders | ⏸ stub | requer aprovação humana — template no runbook |

### Sentry triggers (S5-T02)

Constantes em `marketplace.sentry.ts`:
- `score_cron_duration_min > 60min` → email DPO + Slack #ops-marketplace
- `pin_actions_per_user_per_day >= 5` → email DPO (anti abuso)
- `score_outlier_delta >= 50pts` → email DPO + audit flag

Aplicar via skill `sentry-create-alert` (workflow API do Sentry). Documentado no runbook.

### Smoke tests (S5-T03)

5 cenários E2E em `marketplace-go-live.e2e-spec.ts`:
1. Schema migrations aplicadas (campos `manuallyPinned*` etc existem)
2. `/marketplace/featured` retorna 200 com ≤ 15 itens
3. `/startups/:id/marketplace-info` retorna score + breakdown
4. `POST /admin/startups/:id/pin` valida reason ≥ 20 chars
5. `/admin/marketplace/pinned` retorna lista

Runbook operacional em `docs/runbooks/marketplace-go-live.md` cobre:
- Pré-condições
- Sequência de deploy (`prisma:setup` → `openapi:dump` → `build` → smoke)
- Tabela de rollback (DROP COLUMN migration, reverter deploy)
- Monitoramento pós-deploy (Sentry + Redis + cron)
- Tabela de Sentry alerts com thresholds

### T04 — Email fundadores (bloqueado por aprovação)

Email em massa para todos os founders ativos. **Não enviar sem aprovação humana** (Risco: emails em massa). Template sugerido no runbook §Comunicação aos founders.

**Dependências:**
- `[src/prisma/prisma.module.ts]` (importado no módulo NestJS)
- `[src/prisma/prisma.service.ts]` (acesso ao banco via Prisma)
- `[src/common/dto/response.dto.ts]` (wrapper padrão de resposta)
- `[src/common/dto/error.entity.ts]` (Swagger error schema)
- `[src/common/entities/response.entity.ts]` (Swagger response schema)
- `[node_modules/@prisma/client]` (enums CampaignStatus, StartupStatus, StartupCategory)

**Mapa de Arquivos:**
- [marketplace.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/marketplace.module.ts) - módulo com 3 controllers e 2 services
- [marketplace.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/marketplace.controller.ts) - rotas /marketplace (featured, recently-added, opportunities, sector-stats, all)
- [marketplace.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/marketplace.service.ts) - regras de vitrine, hydrateCards, sparkline 7d, FinanceConfig
- [curated-picks.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/curated-picks.controller.ts) - rota /marketplace/curated-picks (Picks da Semana)
- [early-access.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/early-access.controller.ts) - rota /marketplace/early-access/ranking
- [early-access.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/early-access.service.ts) - agrega pagamentos EARLY_ACCESS por campanha
- [dto/marketplace-card.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/dto/marketplace-card.dto.ts) - card da vitrine
- [dto/curated-pick.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/dto/curated-pick.dto.ts) - payload do pick curado
- [dto/early-access-ranking.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/dto/early-access-ranking.dto.ts) - payload do ranking
- [entities/early-access-ranking.entity.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/marketplace/entities/early-access-ranking.entity.ts) - entidade Swagger