# Mapeamento de Chaves — 3 Fontes → 1 Destino Canônico

**Data:** 22/08/2026  
**Referência:** `scripts/PRD_CONFIG_TAXAS_VALORES.md` §14 DEC-01  
**Tarefa:** CFG-03  
**Depende de:** CFG-02 (inventário de hardcoded)

---

## Contexto

O sistema possui 3 fontes históricas de configuração:

| # | Fonte | Formato chaves | Tabela/Arquivo | Acesso via |
|---|-------|---------------|----------------|-----------|
| A | SystemConfig (legado) | UPPERCASE_SNAKE | `system_configs` (Prisma) | `SystemConfigService.getFinancialConfigs()` / `.get(key)` |
| B | ConfigParameterValue (novo) | lowercase.dot.notation | `config_parameter_values` (Prisma) | `ConfigService.getEffective(key)` |
| C | Hardcoded em `.ts` | constantes locais | Vários services | Importação direta |

**Destino canônico:** `config_parameter_values` (Fonte B) com chaves `lowercase.dot.notation`.

---

## Tabela de Mapeamento

### Taxas e Comissões

| Chave canônica (destino) | Fonte A (SystemConfig) | Fonte C (hardcoded) | Unidade | Default | Consumers |
|--------------------------|----------------------|---------------------|---------|---------|-----------|
| `fundraising.authFeePerToken` | `TOKEN_MINT_FEE` | — | FRACTION | 0.05 | `transactions.service.ts:527` |
| `fundraising.platformFee` | `PLATFORM_ADMIN_FEE_PCT` | — | FRACTION | 0.05 | `campaign-financial.helper.ts:96`, `admin.service.ts:1437` |
| `fundraising.tokenPrice` | `TOKEN_BASE_VALUE` | — | BRL | 200 | marketplace, campaign-create |
| `fundraising.complianceFee` | `COMPLIANCE_FEE` | — | BRL | 1500 | — |
| `fundraising.fastTrackFee` | — | — | BRL | 2500 | — |
| `affiliate.defaultAffiliatePct` | — | — | PERCENT | 3 | `affiliate.service.ts` |
| `affiliate.defaultPlatformPct` | — | — | PERCENT | 2 | `affiliate.service.ts` |

### Limites de Campanha

| Chave canônica (destino) | Fonte A (SystemConfig) | Fonte C (hardcoded) | Unidade | Default | Consumers |
|--------------------------|----------------------|---------------------|---------|---------|-----------|
| `fundraising.minCampaign` | `CAMPAIGN_MIN_TARGET` | — | BRL | 300000 | `campaign-financial.helper.ts:48` |
| `fundraising.maxCampaign` | `CAMPAIGN_MAX_TARGET` | — | BRL | 12000000 | `campaign-financial.helper.ts:55` |
| `fundraising.equityMin` | — | — | INT | 5 | campaign validation |
| `fundraising.equityMax` | — | — | INT | 20 | campaign validation |

### Planos (Taxas de Adesão)

| Chave canônica (destino) | Fonte A | Fonte C | Unidade | Default | Consumers |
|--------------------------|---------|---------|---------|---------|-----------|
| `plan.plano-afiliado.preco` | — | `plans` seed | BRL | 85 | `plans.service.ts:28`, `transactions.service.ts:421` |
| `plan.plano-investidor.preco` | — | `plans` seed | BRL | 50 | Idem |
| `plan.plano-fundador.preco` | — | `plans` seed | BRL | 100 | Idem |

### Valores a ADICIONAR (CFG-02 §5.1)

| Chave canônica (destino) | Fonte A | Fonte C (hardcoded) | Unidade | Default | Consumers |
|--------------------------|---------|---------------------|---------|---------|-----------|
| `seal.verificationPrice` | — | `startup-crud.service.ts:312` → `amount: 890` | BRL | 890 | `startup-crud.service.ts`, Swagger doc no controller |
| `earlyAccess.price` | — | `transactions.service.ts:549` → `const amount = 5000` | BRL | 5000 | `createEarlyAccessPayment()` |
| `sla.installmentPaymentDays` | — | `installment-requests.service.ts:43` → `SLA_BUSINESS_DAYS = 5` | INT | 5 | `InstallmentRequestService`, frontend SLA countdown |
| `fundraising.capByStage.min` | — | `frontend/app/lib/new-startup-schema.ts:134` → `100000` | BRL | 100000 | Frontend form validation + endpoint público futuro |
| `fundraising.capByStage.ideacao.max` | — | Idem → `250000` | BRL | 250000 | Idem |
| `fundraising.capByStage.mvp.max` | — | Idem → `500000` | BRL | 500000 | Idem |
| `fundraising.capByStage.operacao.max` | — | Idem → `1000000` | BRL | 1000000 | Idem |
| `fundraising.capByStage.tracao.max` | — | Idem → `2500000` | BRL | 2500000 | Idem |
| `fundraising.capByStage.escala.max` | — | Idem → `5000000` | BRL | 5000000 | Idem |

### Controle de Afiliação

| Chave canônica (destino) | Fonte A | Fonte C | Unidade | Default | Consumers |
|--------------------------|---------|---------|---------|---------|-----------|
| `affiliate.requireFounderReview` | — | — | BOOL | 0 | `affiliate.service.ts:308` |

### Chaves SystemConfig RESTANTES (tokens)

| Chave canônica (destino) | Fonte A (SystemConfig) | Unidade | Default | Consumers |
|--------------------------|----------------------|---------|---------|-----------|
| `fundraising.tokenTransactionFee` | `TOKEN_TRANSACTION_FEE` | BRL | 0 | Cálculo de venda P2P (futuro) |
| `fundraising.minTokensPerCampaign` | `CAMPAIGN_MIN_TOKENS` | INT | 100 | `campaign-financial.helper.ts` |
| `fundraising.maxTokensPerCampaign` | `CAMPAIGN_MAX_TOKENS` | INT | 10000000 | `campaign-financial.helper.ts` |

---

## Estratégia de Aliases

### Decisão: Renomeação explícita (sem aliases em runtime)

**Justificativa:** Aliases em runtime (ex: interceptor que traduz `PLATFORM_ADMIN_FEE_PCT` → `fundraising.platformFee`) adicionam complexidade, dificultam grep, e criam ambiguidade. Preferimos:

1. **Migration DML** insere os valores na tabela `config_parameter_values` com as chaves canônicas.
2. **Refactor gradual** dos consumers: substituir `systemConfig.getFinancialConfigs().PLATFORM_ADMIN_FEE_PCT` por `configService.getEffective('fundraising.platformFee')`.
3. **Fase final** (pós-validação): dropar tabela `system_configs` e interface `FinancialConfigs`.

### Plano de execução (3 fases)

| Fase | Ação | Risco | Rollback |
|------|------|-------|----------|
| 1. Seed | Migration insere 9 novas chaves + copia 9 existentes da SystemConfig para config_parameter_values com effectiveFrom=1970-01-01 | Baixo (aditiva) | DROP dos registros inseridos |
| 2. Refactor | Cada consumer migra de `SystemConfigService` para `ConfigService.getEffective()`. Testes cobrem ambos | Médio | Revert commits individuais |
| 3. Drop | Remove `system_configs` table, `SystemConfigService`, `FinancialConfigs` interface | Alto (irreversível) | Backup + migration down |

---

## Validação de Cobertura

Todos os consumers abaixo devem usar `ConfigService.getEffective(key)` após a migração:

| Consumer | Chaves usadas | Migrado? |
|----------|--------------|----------|
| `campaigns-create.service.ts:146` | ALL (via `getFinancialConfigs()`) | ❌ Fase 2 |
| `campaigns-state.service.ts:345` | ALL (via `getFinancialConfigs()`) | ❌ Fase 2 |
| `campaign-financial.helper.ts:48-97` | MIN/MAX_TARGET, PLATFORM_ADMIN_FEE_PCT, TOKEN_MINT_FEE | ❌ Fase 2 |
| `transactions.service.ts:421` | `plan.*.preco` | ✅ Já usa `config.getEffective()` |
| `transactions.service.ts:527` | `fundraising.authFeePerToken` | ✅ Já usa `config.getEffective()` |
| `transactions.service.ts:549` | — (hardcoded 5000) | ❌ Fase 2 (→ `earlyAccess.price`) |
| `startup-crud.service.ts:312` | — (hardcoded 890) | ❌ Fase 2 (→ `seal.verificationPrice`) |
| `installment-requests.service.ts:43` | — (hardcoded 5) | ❌ Fase 2 (→ `sla.installmentPaymentDays`) |
| `affiliate.service.ts:308` | `affiliate.requireFounderReview` | ✅ Já usa `config.getEffective()` |
| `plans.service.ts:28` | `plan.*.preco` | ✅ Já usa `config.getEffective()` |
| `admin.service.ts:1437` | `fundraising.platformFee` | ✅ Já usa `config.getEffective()` |
| `system-config.controller.ts:65` | ALL (via `getFinancialConfigs()`) | ❌ Fase 3 (drop controller legado) |
| **Frontend** `new-startup-schema.ts:134` | limites por estágio | ❌ Fase 2 (→ endpoint `/api/config/public`) |

---

## Próximos Passos

1. **CFG-04** — Especificar migration SQL (DDL + DML seed das 9 novas chaves)
2. **CFG-05** — API contract do ConfigService unificado (interface pública)
3. **Implementação** — Sprint dedicada para Fase 2 (refactor de 7 consumers)
