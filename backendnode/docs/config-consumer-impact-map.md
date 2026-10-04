# Inventário de Consumers por Chave Canônica (Impact Analysis)

**Data:** 22/08/2026  
**Referência:** `scripts/PRD_CONFIG_TAXAS_VALORES.md` §10 R7  
**Tarefa:** CFG-10  
**Depende de:** CFG-03

---

## Formato

Para cada chave canônica: quem lê, onde no código, qual cálculo faz, e se precisa invalidação de cache.

---

## 1. fundraising.authFeePerToken

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| TransactionsService | `src/api/transactions/transactions.service.ts` | 527 | `amount = targetAmount × authFee` | Não (query ao banco cada chamada) | ✅ Já usa `config.getEffective()` |
| CampaignFinancialHelper | `src/api/campaigns/service/campaign-financial.helper.ts` | 97 | `tokenMintingCost = totalTokens × TOKEN_MINT_FEE` | Via SystemConfigService (Redis 1h) | ❌ Ainda usa `getFinancialConfigs()` |

---

## 2. fundraising.platformFee

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| AdminService (dashboard) | `src/api/admin/admin.service.ts` | 1437 | Exibe alíquota vigente no dashboard admin | Não | ✅ Já usa `config.getEffective()` |
| CampaignFinancialHelper | `src/api/campaigns/service/campaign-financial.helper.ts` | 96 | `adminFeeValue = targetAmount × PLATFORM_ADMIN_FEE_PCT` | Via SystemConfigService (Redis 1h) | ❌ Ainda usa `getFinancialConfigs()` |

---

## 3. fundraising.tokenPrice

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| CampaignFinancialHelper | `src/api/campaigns/service/campaign-financial.helper.ts` | — | Usado como referência para sugerir preço | Via SystemConfigService (Redis 1h) | ❌ Ainda usa `getFinancialConfigs()` |
| MarketplaceService | `src/api/marketplace/marketplace.service.ts` | 535 | `tokenPrice = Number(campaign.tokenPrice)` ← lê do campo da campanha (snapshot), não da config dinâmica | N/A | N/A (snapshot imutável) |

---

## 4. fundraising.complianceFee

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| Nenhum consumer direto identificado | — | — | Valor exibido no admin config | — | ✅ (via listForAdmin) |

> **Nota:** A taxa de compliance pode estar sendo usada em um fluxo futuro (quando campanha muda para FUNDED). Verificar com equipe.

---

## 5. fundraising.fastTrackFee

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| Nenhum consumer direto identificado | — | — | Valor exibido no admin config | — | ✅ (via listForAdmin) |

---

## 6. fundraising.minCampaign / fundraising.maxCampaign

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| CampaignFinancialHelper | `src/api/campaigns/service/campaign-financial.helper.ts` | 48-60 | `if targetAmount < MIN → BadRequest`, `if targetAmount > MAX → BadRequest` | Via SystemConfigService (Redis 1h) | ❌ Ainda usa `getFinancialConfigs()` |
| CampaignsCreateService | `src/api/campaigns/service/campaigns-create.service.ts` | 146, 306 | Chama `getFinancialConfigs()` → passa para Helper | Idem | ❌ |
| CampaignsStateService | `src/api/campaigns/service/campaigns-state.service.ts` | 345 | Chama `getFinancialConfigs()` → passa para Helper | Idem | ❌ |

---

## 7. fundraising.equityMin / fundraising.equityMax

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| CampaignFinancialHelper | (mesmo helper acima) | — | Validação de equity da campanha | Via SystemConfigService (Redis 1h) | ❌ Ainda usa `getFinancialConfigs()` |

---

## 8. plan.plano-*.preco (3 chaves)

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| PlansService | `src/api/plans/services/plans.service.ts` | 28 | Override do preco do plano com valor vigente | Não (query por request) | ✅ Já usa `config.getEffective()` |
| TransactionsService | `src/api/transactions/transactions.service.ts` | 421 | `preco = config.getEffective(plan.{slug}.preco)` para criar Payment | Não | ✅ Já usa `config.getEffective()` |

---

## 9. affiliate.defaultAffiliatePct / affiliate.defaultPlatformPct

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| Nenhum consumer direto via getEffective | — | — | Valores usados como sugestão ao criar programa de afiliados | — | ✅ (via listForAdmin para o painel) |

> **Nota:** Na criação de programa de afiliados, o fundador define % manualmente. Os defaults aqui servem como sugestão no frontend.

---

## 10. affiliate.requireFounderReview

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| AffiliateService | `src/api/affiliate/affiliate.service.ts` | 308 | `if getEffective('affiliate.requireFounderReview') !== 0 → exige review` | Não | ✅ Já usa `config.getEffective()` |

---

## 11. seal.verificationPrice (NOVO — a migrar)

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| StartupCrudService | `src/api/startup/service/startup-crud.service.ts` | 312 | `amount: 890` (hardcoded no Payment create) | N/A | ❌ HARDCODED |

**Refactor necessário:**
```typescript
// Antes:
amount: 890,

// Depois:
amount: await this.config.getEffective('seal.verificationPrice'),
```

---

## 12. earlyAccess.price (NOVO — a migrar)

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| TransactionsService | `src/api/transactions/transactions.service.ts` | 549 | `const amount = 5000` (hardcoded) | N/A | ❌ HARDCODED |

**Refactor necessário:**
```typescript
// Antes:
const amount = 5000;

// Depois:
const amount = await this.config.getEffective('earlyAccess.price');
```

---

## 13. sla.installmentPaymentDays (NOVO — a migrar)

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| InstallmentRequestService | `src/api/installment-requests/installment-requests.service.ts` | 43, 165 | `tsLimitePagamento = sla.addBusinessDays(submittedAt, SLA_BUSINESS_DAYS)` | N/A | ❌ HARDCODED |
| Frontend (SLA countdown) | `frontend/app/components/foundation/repasse-sla-countdown.tsx` | — | Exibe "5 dias úteis" no texto | N/A | ❌ HARDCODED (texto) |

**Refactor necessário (backend):**
```typescript
// Antes:
const SLA_BUSINESS_DAYS = 5;

// Depois:
const SLA_BUSINESS_DAYS = await this.config.getEffective('sla.installmentPaymentDays');
```

**Frontend:** Consumir via endpoint `/api/config/public` ou receber no payload do dashboard.

---

## 14. fundraising.capByStage.* (6 chaves NOVAS — a migrar)

| Consumer | Caminho | Linha | Cálculo | Cache | Migrado? |
|----------|---------|-------|---------|-------|----------|
| Frontend (form de criação de startup) | `frontend/app/lib/new-startup-schema.ts` | 134-138 | Validação Zod de targetAmount por estágio | N/A (compilado) | ❌ HARDCODED |
| Frontend (rota create-startup) | `frontend/app/routes/private/create-startup.tsx` | — | Importa o schema que usa LIMITES_CAPTACAO | N/A | ❌ (transitive) |

**Refactor necessário:**
- Criar endpoint `GET /api/config/public` que retorna limites vigentes
- Frontend carrega limites no loader ou via hook
- Schema Zod recebe limites como parâmetro (factory function) ao invés de constante

---

## Resumo: Matriz de Migração

### Consumers JÁ migrados (usam `config.getEffective()`)

| # | Consumer | Chaves consumidas |
|---|----------|-------------------|
| 1 | TransactionsService (authFee) | `fundraising.authFeePerToken` |
| 2 | TransactionsService (plan preco) | `plan.*.preco` |
| 3 | PlansService | `plan.*.preco` |
| 4 | AdminService (dashboard) | `fundraising.platformFee` |
| 5 | AffiliateService | `affiliate.requireFounderReview` |
| 6 | ConfigService.listForAdmin() | ALL (exibe no painel) |

### Consumers a MIGRAR (ainda usam `getFinancialConfigs()` legado)

| # | Consumer | Chaves consumidas | Esforço |
|---|----------|-------------------|---------|
| 1 | CampaignsCreateService (×2 chamadas) | ALL via helper | Médio — injetar ConfigService, trocar por getManyEffective() |
| 2 | CampaignsStateService | ALL via helper | Idem |
| 3 | CampaignFinancialHelper | MIN/MAX_TARGET, PLATFORM_FEE, MINT_FEE | Médio — refatorar para receber object já resolvido |
| 4 | SystemConfigController (GET /admin/configs) | ALL | Baixo — redirecionar para ConfigService.listForAdmin() |

### Consumers a MIGRAR (hardcoded direto)

| # | Consumer | Chave destino | Esforço |
|---|----------|---------------|---------|
| 1 | StartupCrudService (`amount: 890`) | `seal.verificationPrice` | Baixo — 1 linha |
| 2 | TransactionsService (`amount = 5000`) | `earlyAccess.price` | Baixo — 1 linha |
| 3 | InstallmentRequestService (`SLA_BUSINESS_DAYS = 5`) | `sla.installmentPaymentDays` | Baixo — 2 linhas |
| 4 | Frontend LIMITES_CAPTACAO | `fundraising.capByStage.*` | Médio — endpoint + refactor schema |

---

## Plano de Execução por Sprint

| Sprint | Itens | Esforço total |
|--------|-------|---------------|
| **Sprint A** (quick wins) | Hardcoded: seal.verification + earlyAccess + SLA | ~2h |
| **Sprint B** (campaigns refactor) | CampaignsCreate + CampaignsState + Helper + drop SystemConfigController | ~4h |
| **Sprint C** (frontend) | Endpoint /api/config/public + refactor LIMITES_CAPTACAO + schema factory | ~3h |
| **Sprint D** (cleanup) | Drop SystemConfigService, FinancialConfigs interface, tabela system_configs | ~1h (após validação e2e) |

**Total estimado:** ~10h de trabalho distribuído em 4 sprints.
