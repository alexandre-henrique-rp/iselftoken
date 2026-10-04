# Inventário de Valores Hardcoded — Migração para Config Dinâmico

**Data:** 22/08/2026  
**Referência:** `scripts/PRD_CONFIG_TAXAS_VALORES.md` §5.1 RF-05  
**Tarefa:** CFG-02

---

## Legenda

| Coluna | Descrição |
|--------|-----------|
| **Prioridade** | ALTA = impacto direto em cobrança/compliance. MÉDIA = operacional. BAIXA = conveniência. |
| **Já em config.constants.ts?** | Se SIM, o valor default já está no registro canônico e será lido via `ConfigService.getEffective()`. Se NÃO, precisa ser adicionado. |

---

## 1. Valores Monetários (BRL)

| Valor | Descrição | Arquivo | Linha | Default | Já em config.constants.ts? | Prioridade | Dependências |
|-------|-----------|---------|-------|---------|---------------------------|------------|-------------|
| R$ 890 | Selo "Startup Verificada" | `src/api/startup/service/startup-crud.service.ts` | 312 | 890 | ❌ NÃO | ALTA | Checkout, controller Swagger doc |
| R$ 5.000 | Early Access (acesso antecipado) | `src/api/transactions/transactions.service.ts` | 549 | 5000 | ❌ NÃO | ALTA | createEarlyAccessPayment() |
| R$ 1.500 | Taxa de compliance | `src/api/config/config.constants.ts` | 72 | 1500 | ✅ SIM (`fundraising.complianceFee`) | — | — |
| R$ 2.500 | Taxa de fast-track | `src/api/config/config.constants.ts` | 79 | 2500 | ✅ SIM (`fundraising.fastTrackFee`) | — | — |
| R$ 10.000 | Campanha mínima | `src/api/config/config.constants.ts` | 87 | 10000 | ✅ SIM (`fundraising.minCampaign`) | — | — |
| R$ 5.000.000 | Campanha máxima | `src/api/config/config.constants.ts` | 93 | 5000000 | ✅ SIM (`fundraising.maxCampaign`) | — | — |
| R$ 200 | Preço base do token | `src/api/config/config.constants.ts` | 41 | 200 | ✅ SIM (`fundraising.tokenPrice`) | — | — |
| R$ 85 | Plano Afiliado (anual) | `src/api/config/config.constants.ts` | 118 | 85 | ✅ SIM (`plan.plano-afiliado.preco`) | — | — |
| R$ 50 | Plano Investidor (anual) | `src/api/config/config.constants.ts` | 125 | 50 | ✅ SIM (`plan.plano-investidor.preco`) | — | — |
| R$ 100 | Plano Fundador (anual) | `src/api/config/config.constants.ts` | 132 | 100 | ✅ SIM (`plan.plano-fundador.preco`) | — | — |

---

## 2. Percentuais e Taxas

| Valor | Descrição | Arquivo | Linha | Default | Já em config.constants.ts? | Prioridade | Dependências |
|-------|-----------|---------|-------|---------|---------------------------|------------|-------------|
| 0.05 (5%) | Taxa de emissão por token | `src/api/config/config.constants.ts` | 33 | 0.05 | ✅ SIM (`fundraising.authFeePerToken`) | — | transactions.service.ts:527 lê via getEffective() |
| 0.05 (5%) | Taxa da plataforma (fundraising) | `src/api/config/config.constants.ts` | 49 | 0.05 | ✅ SIM (`fundraising.platformFee`) | — | — |
| 3% | Comissão de afiliado (padrão) | `src/api/config/config.constants.ts` | 56 | 3 | ✅ SIM (`affiliate.defaultAffiliatePct`) | — | — |
| 2% | Comissão plataforma no afiliado | `src/api/config/config.constants.ts` | 63 | 2 | ✅ SIM (`affiliate.defaultPlatformPct`) | — | — |
| 5% | Equity mínimo | `src/api/config/config.constants.ts` | 99 | 5 | ✅ SIM (`fundraising.equityMin`) | — | — |
| 49% | Equity máximo | `src/api/config/config.constants.ts` | 105 | 49 | ✅ SIM (`fundraising.equityMax`) | — | — |

---

## 3. Constantes de Tempo / SLA

| Valor | Descrição | Arquivo | Linha | Default | Já em config.constants.ts? | Prioridade | Dependências |
|-------|-----------|---------|-------|---------|---------------------------|------------|-------------|
| 5 dias úteis | SLA pagamento parcela | `src/api/installment-requests/installment-requests.service.ts` | 43 | 5 | ❌ NÃO | MÉDIA | SlaCalculatorService, frontend countdown |
| 30 dias | Intervalo entre parcelas (legado) | `src/api/payment/fund-transfer.service.ts` | 19 | 30 | ❌ NÃO (deprecated — FIN-09 usa campo `intervaloDias` do Repasse) | BAIXA | Somente FundTransfer legado |
| 3 parcelas | Número de parcelas (legado) | `src/api/payment/fund-transfer.service.ts` | 17 | 3 | ❌ NÃO (deprecated — FIN-09 usa campo `numeroParcelas` do Repasse) | BAIXA | Somente FundTransfer legado |
| 1 hora | TTL cache SystemConfig | `src/common/system-config/system-config.service.ts` | 30 | 3600000 ms | ❌ NÃO (infra, não é regra de negócio) | BAIXA | Redis cache |
| 5 min | TTL cache user plan | `src/api/uploads/helpers/user-plan.helper.ts` | 24 | 300000 ms | ❌ NÃO (infra) | BAIXA | In-memory cache |

---

## 4. Frontend — Valores Hardcoded

| Valor | Descrição | Arquivo | Linha | Default | Já em config? | Prioridade | Nota |
|-------|-----------|---------|-------|---------|---------------|------------|------|
| R$ 100.000 | Captação mínima (todos os estágios) | `frontend/app/lib/new-startup-schema.ts` | 134-138 | 100000 | ❌ NÃO | ALTA | Deveria vir de endpoint `/api/config/limites-captacao` |
| R$ 250.000 | Captação máxima — Ideação | `frontend/app/lib/new-startup-schema.ts` | 134 | 250000 | ❌ NÃO | ALTA | Mesmo endpoint |
| R$ 500.000 | Captação máxima — MVP | `frontend/app/lib/new-startup-schema.ts` | 135 | 500000 | ❌ NÃO | ALTA | Mesmo endpoint |
| R$ 1.000.000 | Captação máxima — Operação | `frontend/app/lib/new-startup-schema.ts` | 136 | 1000000 | ❌ NÃO | ALTA | Mesmo endpoint |
| R$ 2.500.000 | Captação máxima — Tração | `frontend/app/lib/new-startup-schema.ts` | 137 | 2500000 | ❌ NÃO | ALTA | Mesmo endpoint |
| R$ 5.000.000 | Captação máxima — Escala | `frontend/app/lib/new-startup-schema.ts` | 138 | 5000000 | ❌ NÃO | ALTA | Mesmo endpoint |

---

## 5. Resumo de Ações

### 5.1 Valores que PRECISAM ser adicionados ao config dinâmico

| # | Chave canônica sugerida | Valor atual | Unidade | Prioridade |
|---|------------------------|-------------|---------|------------|
| 1 | `seal.verificationPrice` | 890 | BRL | ALTA |
| 2 | `earlyAccess.price` | 5000 | BRL | ALTA |
| 3 | `sla.installmentPaymentDays` | 5 | INT | MÉDIA |
| 4 | `fundraising.capByStage.ideacao.max` | 250000 | BRL | ALTA |
| 5 | `fundraising.capByStage.mvp.max` | 500000 | BRL | ALTA |
| 6 | `fundraising.capByStage.operacao.max` | 1000000 | BRL | ALTA |
| 7 | `fundraising.capByStage.tracao.max` | 2500000 | BRL | ALTA |
| 8 | `fundraising.capByStage.escala.max` | 5000000 | BRL | ALTA |
| 9 | `fundraising.capByStage.min` | 100000 | BRL | ALTA |

### 5.2 Valores JÁ no config dinâmico (sem ação)

Todos os 12 parâmetros de `config.constants.ts` já possuem chave canônica, default, e são lidos via `ConfigService.getEffective()`. Nenhuma ação necessária.

### 5.3 Valores DEPRECATED (não migrar)

- `REPASSE_PARCELAS = 3` e `REPASSE_INTERVALO_DIAS = 30` — substituídos pelo FIN-09 (campos `Repasse.numeroParcelas` e `Repasse.intervaloDias` configuráveis pelo Compliance/Financeiro). O `fund-transfer.service.ts` está marcado como deprecated.

### 5.4 Valores de INFRA (não migrar para painel admin)

- TTL de cache (1h Redis, 5min in-memory) — configuráveis via env vars se necessário, mas não são regras de negócio.

---

## 6. Próximos Passos

1. **CFG-03** — Definir mapeamento formal das chaves canônicas acima + aliases
2. **CFG-04** — Especificar migration SQL que insere os 9 novos parâmetros na tabela `config_parameter_values`
3. **Refactor backend** — Substituir `amount: 890` e `amount = 5000` por chamadas a `ConfigService.getEffective('seal.verificationPrice')` e `ConfigService.getEffective('earlyAccess.price')`
4. **Endpoint frontend** — Criar `GET /api/config/public` que retorna limites de captação por estágio (para substituir `LIMITES_CAPTACAO` hardcoded no frontend)
5. **CFG-07** — Mapear fees do C6 Bank quando contrato disponível
