# Checklist de Análise da Migração de Configuração

> **Status:** 🔴 **ANÁLISE APENAS — NÃO EXECUTAR NENHUM PASSO AINDA**
> **Origem:** PRD `scripts/PRD_CONFIG_TAXAS_VALORES.md` §5.1 (RF-01..03) + §7 (Modelo de Dados)
> **Sprint:** CFG-UNIFY (tasks CFG-01..CFG-10 no `todo/todo.json`)
> **Pré-requisito:** DEC-10..DEC-17 resolvidos (vide PRD §14)
> **Autor:** Estudo técnico — gerado a partir da análise do codebase

Este documento **NÃO é um script executável**. É um checklist de análise que o implementador deve revisar e preencher **antes** de criar o migration real. Cada item tem critérios claros de "pronto para implementar".

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Fase A — Análise de Origem](#2-fase-a--análise-de-origem)
3. [Fase B — Análise de Destino (modelo)](#3-fase-b--análise-de-destino-modelo)
4. [Fase C — Análise de Mapeamento](#4-fase-c--análise-de-mapeamento)
5. [Fase D — Análise de Risco e Rollback](#5-fase-d--análise-de-risco-e-rollback)
6. [Fase E — Critérios de "Pronto para Implementar"](#6-fase-e--critérios-de-pronto-para-implementar)
7. [Apêndice — Soft skills (comunicação)](#7-apêndice--soft-skills-comunicação)

---

## 1. Visão Geral

### 1.1 Objetivo do migration

Consolidar **3 fontes de configuração**:

| Fonte atual | Tabela | Modelo | Chaves | UI Admin |
|---|---|---|---|---|
| Antigo (S01) | `system_configs` | `SystemConfig` | UPPERCASE, ex: `PLATFORM_ADMIN_FEE_PCT` | `/admin/configs/:key` |
| Intermediário (M6) | `finance_config` | `FinanceConfig` | lowercase namespace, ex: `fundraising.platformFee` | ❌ sem controller |
| Novo (S25) | `config_parameter_values` | `ConfigParameterValue` | mesma estrutura do FinanceConfig | `/admin/config/parameters` |

em **uma única tabela**: `config_parameter_values` (com versionamento por data).

### 1.2 Escopo do migration

**Inclui:**
- ✅ Cópia de dados vigentes das 3 fontes → `config_parameter_values`
- ✅ Adição de colunas `revokedAt`/`revokedById` ao schema
- ✅ Constraint UNIQUE para impedir versões duplicadas vigentes
- ✅ Atualização do `ConfigService` para cobrir **todas** as chaves (sem alias)
- ✅ Marcação de `SystemConfig` e `FinanceConfig` como deprecated
- ✅ Migração de **6+ valores hardcoded** espalhados

**Não inclui** (sprints separadas):
- ❌ Aplicação de UI nova (RF épico D — sprint posterior)
- ❌ Alertas de chave crítica (épico C — sprint posterior)
- ❌ Audit log dedicado `ConfigAuditLog` (sprint posterior)
- ❌ Cache invalidation pub/sub (DEC-17 — sprint posterior)

---

## 2. Fase A — Análise de Origem

> **Objetivo:** Mapear 100% dos dados que precisam migrar. Sem surpresa.

### A.1 — Inventário de chaves em `system_configs`

- [ ] **Listar todas as chaves** presentes em `system_configs` com `SELECT key, value, description, updatedAt FROM system_configs;`
- [ ] **Validar contagem** vs lista hardcoded em `prisma/seeds/seed-system-config.ts` (esperado: 9)
- [ ] **Classificar cada chave**: BOAS (vão ao destino) vs DEPRECATED (não migrar)
- [ ] **Cruzar com** `src/common/system-config/interfaces/financial-configs.interface.ts` — todas são cobertas?
- [ ] **Cruzar com** `src/api/campaigns/service/campaign-financial.helper.ts` — quais são usadas em produção?
- [ ] **Cruzar com** `src/api/campaigns/service/campaigns-state.service.ts` — mesmas chaves?

**Entregável:** Tabela com chave origem → chave destino + valor atual.

### A.2 — Inventário de chaves em `finance_config`

- [ ] **Listar todas as chaves** com `SELECT key, value, description FROM finance_config;`
- [ ] **Comparar com `config_parameter_values`** — ambas têm chaves lowercase namespaceadas?
  - [ ] Se sim: alguma divergência de valor entre as duas?
  - [ ] Se sim: qual é a fonte de verdade?
- [ ] **Identificar chaves** que estão em `finance_config` mas **não** estão em `config_parameter_values` (e vice-versa)

**Entregável:** Diff `finance_config` vs `config_parameter_values`.

### A.3 — Inventário de `config_parameter_values` atual

- [ ] **Listar todas as chaves** vigentes (`SELECT DISTINCT key FROM config_parameter_values;`)
- [ ] **Confirmar** se já há versionamento (múltiplas linhas por chave com `effectiveFrom` distintos)
- [ ] **Detectar chaves-órfãs** (cadastradas mas nunca referenciadas em código)

**Entregável:** Lista mestra de chaves (origem única de verdade após esta fase).

### A.4 — Inventário de valores **hardcoded**

Para cada um, capturar: arquivo, linha, valor atual, função, motivo de ser hardcoded.

- [ ] **`startup-crud.service.ts:312`** — `amount: 890` (selo verificação)
  - **Função:** `requestVerification()` — gera Payment com purpose=VERIFICATION_SEAL
- [ ] **`admin.service.ts:1399`** — `payment.purpose = 'EARLY_ACCESS'` (eixo R$ 5.000?)
  - **Cruzar** com `src/api/payment/early-access.service.ts` (constantes?)
- [ ] **`seed.ts`** — `minInvestment: 5000.0` (default em Campanha)
  - **Validar** se há override ou se é apenas default (zero impacto se houver config)
- [ ] **`SlaCalculatorService`** — `addBusinessDays(5)` (SLA financeiro)
  - **Validar** qual a constante hardcoded e onde está
- [ ] **`CampaignFinancialHelper.computeFinancialSnapshots`** — assume `PLATFORM_ADMIN_FEE_PCT` carregado de fora
  - **Validar** se há fallback hardcoded em caso de cache miss
- [ ] **`CASE.md §[Captacao]`** — faixas por estágio:
  - Ideação: R$ 100k–250k
  - MVP: R$ 100k–500k
  - Operação: R$ 100k–1M
  - Tração: R$ 100k–2.5M
  - Escala: R$ 100k–5M
- [ ] **C6 Bank fees** (PIX fixa, PIX variável, boleto) — buscar em env ou contrato
- [ ] **Demais hardcoded** — grep global por `R\$ \d\|0\.[0-9]+` em `src/`

**Entregável:** `backendnode/docs/hardcoded-values-inventory.md` (task CFG-02)

---

## 3. Fase B — Análise de Destino (modelo)

> **Objetivo:** Decidir o schema final do `ConfigParameterValue` antes de tocar em nada.

### B.1 — Colunas atuais em `config_parameter_value`

Schema atual (`backendnode/prisma/schema.prisma:1270+`):

```prisma
model ConfigParameterValue {
  id            Int       @id @default(autoincrement())
  key           String
  value         String    @db.Text
  effectiveFrom DateTime
  note          String?   @db.Text
  createdById   Int?
  createdAt     DateTime  @default(now())
  @@index([key, effectiveFrom])
  @@map("config_parameter_values")
}
```

### B.2 — Mudanças propostas (não aplicar — apenas validar)

| Mudança | Justificativa | Impacto | Reversível? |
|---|---|---|---|
| Adicionar `revokedAt: DateTime?` | Cancelar agendamento futuro (DEC-13) | Nenhum (nullable) | Sim (NULL) |
| Adicionar `revokedById: Int?` | Audit log de quem cancelou | Nenhum (nullable) | Sim (NULL) |
| Constraint `@@unique([key, effectiveFrom, revokedAt])` | Impedir versões duplicadas vigentes | Nenhum (DB-level) | Sim (DROP CONSTRAINT) |
| Constraint `@@unique([key, value]) WHERE revokedAt IS NULL` (partial) | Idem acima mas só para vigentes | MAIS complexo (DB-specific) | NÃO |

### B.3 — Perguntas abertas para validação

- [ ] **`@@unique` simples** funciona para nosso caso? Há colisão entre vigente e cancelada?
  - **Resposta esperada:** sim, funciona; cancelada teria `revokedAt` preenchido, garantindo unicidade
- [ ] **Partitioning** por ano seria útil? (10 anos de retenção = 5M+ rows potenciais)
  - Avaliar: PostgreSQL/MariaDB suporta, mas MySQL 8 não. Pular por ora.
- [ ] **Tipo de valor** deveria ser `Decimal` em vez de `String`?
  - Trade-off: query nativa mais lenta; frontend já trata string. Pesar LGPD/auditoria vs perf.
  - Decisão: manter String (compat com frontend atual)
- [ ] **Backward compat** — manter tabela `system_configs` em modo read-only como fallback?
  - Trade-off: dois sistemas em paralelo até app ser totalmente migrado
  - Recomendação: manter 1 release com fallback + remover na release seguinte

**Entregável:** Decisão documentada em ata + ADR específico (ex: `docs/decisions/ADR-009-config-unification.md`)

---

## 4. Fase C — Análise de Mapeamento

> **Objetivo:** Para cada chave origem, definir destino + regras de conversão.

### C.1 — Schema do mapeamento

```typescript
type KeyMapping = {
  source: {
    tabela: 'system_configs' | 'finance_config' | 'config_parameter_values' | 'hardcoded',
    key: string,
    arquivo?: string,
    linha?: number,
  };
  destino: {
    key: string,                    // chave canônica nova
    valorInicial?: number | string, // se hardcoded
    unidade: 'FRACTION' | 'PERCENT' | 'BRL' | 'INT' | 'BOOL',
    grupo: string,                  // Tokens e emissão | Comissões | etc.
    criticalKey: boolean,          // dispara alerta DPO?
  };
  conversao?: {
    fator?: number,                // multiplicador se unidade mudou (ex: 100x para ir de % para FRACTION)
    regex?: string,                // parse de string
    default?: number,              // fallback se valor origem for inválido
  };
};
```

### C.2 — Tabela de mapeamento (template)

| Origem (tabela/key) | Destino (key) | Valor origem | Conversão | Default |
|---|---|---|---|---|
| `system_configs.PLATFORM_ADMIN_FEE_PCT` | `fundraising.platformFee` | 0.20 | sem | 0.05 |
| `system_configs.TOKEN_MINT_FEE` | `fundraising.tokenMintFee` | 1.00 | sem | 1 |
| `system_configs.TOKEN_BASE_VALUE` | `fundraising.tokenPrice` | 200 | sem | 200 |
| `system_configs.TOKEN_TRANSACTION_FEE` | (descartar?) | 40 | — | — |
| `system_configs.COMPLIANCE_FEE` | `fundraising.complianceFee` | 500 | sem | 1500 |
| `system_configs.CAMPAIGN_MIN_TARGET` | `fundraising.minCampaign` | 500000 | sem | 10000 |
| `system_configs.CAMPAIGN_MAX_TARGET` | `fundraising.maxCampaign` | 10000000 | sem | 5000000 |
| `system_configs.CAMPAIGN_MIN_TOKENS` | `fundraising.minTokens` | 100 | sem | 100 |
| `system_configs.CAMPAIGN_MAX_TOKENS` | `fundraising.maxTokens` | 1000000 | sem | 1000000 |
| `finance_config.fundraising.authFeePerToken` | `fundraising.authFeePerToken` | 0.05 | sem | 0.05 |
| `finance_config.fundraising.tokenPrice` | `fundraising.tokenPrice` | 200 | sem | (já vem de cima) |
| `finance_config.fundraising.platformFee` | `fundraising.platformFee` | 0.05 | sem | (já vem de cima) |
| `hardcoded: startup-crud.service.ts:312` | `seal.verificationFee` | 890 | sem | 890 |
| `hardcoded: admin.service.ts:1399 EARLY_ACCESS` | `earlyAccess.productPrice` | 5000 | sem | 5000 |
| `hardcoded: seed.ts minInvestment` | `campaign.minInvestment` | 5000 | sem | 5000 |
| `hardcoded: CASE.md faixas estágio` | `campaign.targetRange.<stage>` | 100000..5000000 | sem | — |
| `hardcoded: SlaCalculatorService 5 dias` | `repasse.slaDiasUteis` | 5 | sem | 5 |

**Tarefa:** preencher valores reais via `SELECT ... ;` no banco de staging.

### C.3 — Conflitos e divergências

- [ ] Se uma chave origem tem **múltiplos valores** ao longo do tempo → pegar o mais recente (effectiveFrom MAX)
- [ ] Se uma chave origem **não existe** em `system_configs` → usar default de `config_parameter_values` ou hardcoded
- [ ] Se chaves **divergem entre origens** (ex: `fundraising.platformFee = 0.05` em ambos, ok) → manter valor mais recente e logar divergência
- [ ] Se há chave **somente em `system_configs` mas não em `config_parameter_values`** → adicionar à migração

**Entregável:** Tabela preenchida + casos divergentes logados.

### C.4 — Valores default quando origem é nula

Para cada chave que vai existir no destino, decidir:

- [ ] **Default final** (igual ao current hardcoded ou diferente?)
- [ ] **Origem dos defaults** (PRD §5.1 RF-05 ou valor histórico)
- [ ] **Garantia de testes** — temos testes que assumem defaults específicos?

---

## 5. Fase D — Análise de Risco e Rollback

> **Objetivo:** Definir o que fazer se algo der errado em produção.

### D.1 — Riscos identificados

| # | Risco | Probabilidade | Impacto | Detecção |
|---|---|---|---|---|
| R1 | Migração corrompe valores vigentes | Média | Crítico | Após migration: `SELECT COUNT(*)` vs baseline |
| R2 | Mapeamento escolhe chave errada (origem divergente) | Média | Alto | Testes de snapshot |
| R3 | Cache Redis `financial_configs` desatualizado após migration | Alta | Médio | Smoke test pós-deploy |
| D.R4 | App continua usando SystemConfigService em vez de ConfigService (não foi migrado) | Média | Alto | Logs (`configService.X chamado N vezes`) |
| D.R5 | Decisão errada sobre `TOKEN_TRANSACTION_FEE` (descartar ou manter?) | Baixa | Médio | Verificar com financeiro |
| D.R6 | CASE.md desatualizada conflita com config real | Alta | Baixo | Atualizar CASE.md no mesmo release |
| D.R7 | Hardcoded em algum lugar não mapejado (surpresa) | Alta | Médio | Grep pós-migration por R\$ |

### D.2 — Estratégia de rollback

- [ ] **Backup completo do banco** antes de aplicar migration (`mysqldump`)
- [ ] **SQL para reverter DDL** (DROP COLUMN revokedAt, DROP CONSTRAINT)
- [ ] **Não deletar dados origem** na fase 1 — manter por 1 release
- [ ] **Flag `migration_phase`** em arquivo `.env` — se == 1, admin vê banner "estamos em transição"
- [ ] **Plano de rollback manual**:
  ```bash
  # Se algo explodir:
  kubectl rollout undo deployment/backend -n iselfoken
  mysql iselfoken < pre_migration_backup.sql
  redis-cli FLUSHDB  # invalida todos os caches
  ```
- [ ] **Trigger de auto-rollback** se smoke test pós-migration falhar (optionally via hook)

### D.3 — Plano de deploy

1. **Backup do DB** (gerar dump)
2. **Deploy DDL** (criar colunas + constraint) — sem insert ainda
3. **Smoke test**: app continua usando SystemConfig (sem mudança de comportamento)
4. **Deploy DML** (insert de dados migrados)
5. **Smoke test**: contagem bate, valores coerentes
6. **Deploy da flag** `USE_CONFIG_SERVICE=true` (env)
7. **Monitoria ativa**: 24h com alerta se `getEffective()` falhar ou valor divergir
8. **Após 7 dias estáveis**: marcar `system_configs` como deprecated
9. **Após 30 dias estáveis**: drop `system_configs` e `finance_config`

### D.4 — Critérios de "reverter"

Rollback OBRIGATÓRIO se:
- [ ] Smoke test pós-deploy falhar
- [ ] Valor divergente em > 1% das chaves
- [ ] Latência de leitura > 5x baseline
- [ ] Erros 5xx > 0.1% / minuto
- [ ] Qualquer alerta DPO/CTO sobre valor divergente

**Decisão:** CTO aprova rollback + Sponsor Comercial notifica fundadores ativos.

---

## 6. Fase E — Critérios de "Pronto para Implementar"

> **Objetivo:** Validar que TODOS estes critérios estão preenchidos antes de chamar task CFG-04 done.

### 6.1 — Critérios de Análise (precisam estar completos)

- [ ] **A.1:** Tabela `system_configs` inventariada
- [ ] **A.2:** Diff `finance_config` vs `config_parameter_values` mapeado
- [ ] **A.3:** Lista mestra de chaves vigentes do `config_parameter_values`
- [ ] **A.4:** `hardcoded-values-inventory.md` completo (6+ valores)
- [ ] **B.2 + B.3:** Schema proposto validado (unique, colunas novas, defaults)
- [ ] **C.2:** Mapeamento origem→destino completo
- [ ] **C.3:** Conflitos documentados e resolvidos
- [ ] **D.1:** Riscos listados
- [ ] **D.2:** Plano de rollback escrito

### 6.2 — Critérios de Decisão (precisam estar fechadas)

- [ ] **DEC-10** (Unificar 1 ou 3 tabelas?) — FECHADA
- [ ] **DEC-11** (Migrar hardcoded junto ou separado?) — FECHADA
- [ ] **DEC-13** (Soft ou hard delete em cancel?) — FECHADA
- [ ] **DEC-14** (Janela de rollback = 7 dias ou ilimitado?) — FECHADA

### 6.3 — Critérios de Stakeholder

- [ ] DPO aprovou o plano de migração + LGPD impact assessment
- [ ] CTO aprovou o schema proposto + plano de rollback
- [ ] Financeiro lead aprovou o mapeamento de chaves
- [ ] Sponsor Comercial está avisado do freeze de deploy

### 6.4 — Critérios de Pre-flight Test (antes de produção)

- [ ] **Em staging**: todas as migrations rodaram + valores batem
- [ ] **Em staging**: smoke tests pós-deploy passaram
- [ ] **Em staging**: queries do app executaram sem erro
- [ ] **Em staging**: 24h de monitoria sem alerta

### 6.5 — Critérios de Comunicação

- [ ] E-mail enviado para DPO+CTO+Financeiro+Sponsor com data do deploy
- [ ] Status page interna atualizada (se houver)
- [ ] Plan de comunicação para fundadores ativos (`/founder/dashboard` banner?)

### 6.6 — Critérios de Saída

- [ ] Documento `backendnode/docs/migration-unify-config-spec.md` foi escrito (task CFG-04)
- [ ] **Migration ticket** foi criado na sprint de implementação (futuro)
- [ ] **ADRs** assinados (ADR-009-config-unification no mínimo)
- [ ] **CASE.md atualizado** com cross-reference ao PRD

---

## 7. Apêndice — Soft skills (comunicação)

> ⚠️ Às vezes o migration técnico falha não por código, mas por gente. Segue:

### 7.1 — Pessoas que precisam estar informadas

| Persona | Por quê | Quando avisar | Como |
|---|---|---|---|
| DPO (Renata) | LGPD impact | No FECHAMENTO das DEC + 1 semana antes do deploy | E-mail + reunião |
| CTO (Alex) | Schema + rollback | No FECHAMENTO das DEC + 1 semana antes do deploy | E-mail + aprovação explícita |
| Financeiro lead (Sandra) | Mapeamento de chaves | 2 semanas antes (tempo de auditar) | Planilha + reunião |
| Sponsor Comercial (definir) | Impacto em campanhas ativas | 1 semana antes | E-mail + briefing |
| Equipe DEV (backend+frontend) | Freezer de deploy | 3 dias antes | Slack/Discord |
| Status interno | Status page | No dia | Atualizar |

### 7.2 — Riscos humanos comuns

- [ ] **"Eu não fui avisado"** → sempre CC pessoas afetadas em decisões
- [ ] **"Isso quebrou minha campanha"** → comunicar fundadores ativos com antecedência
- [ ] **"Foi feito sem aprovação"** → registrar DEC-NN assinadas antes de codar
- [ ] **"Não tem rollback"** → D.2 PRÉ-EXISTENTE antes de produção
- [ ] **"Os defaults são diferentes do que eu esperava"** → co-criar com financeiro ANTES

### 7.3 — Templates de comunicação

#### E-mail pré-deploy (1 semana antes)

```
Assunto: [Deploy] Mudança de Configuração — YYYY-MM-DD 22h BRT

Pessoal,

No dia [data], faremos deploy do migration de consolidação de
configuração financeira na plataforma. Resumo:

- O que: substitui 2 tabelas de config legadas por 1 unificada
- Quando: [data] às 22h BRT (janela de baixo movimento)
- Impacto esperado: zero (UI continua igual; cálculos iguais)
- Rollback: [tempo estimado]

Detalhes completos: [link PRD]

Se sua área for afetada, favor revisar [link do impact map].

Atenciosamente,
[implementador]
```

#### Mensagem Slack/Discord (D-1)

```
:warning: Deploy amanhã 22h — Consolidação de Configuração

Quem: backend
Quando: amanhã 22h-23h
Impacto: zero (queries continuam retornando mesmos valores)
Quem valida: @alex (CTO), @renata (DPO)
Doc: [link PRD]
```

---

## ✅ Self-check antes de marcar CFG-04 done

Use este checklist ao final da task de análise:

- [ ] Lendo novamente o checklist, **todos os itens da Fase A..E** estão preenchidos
- [ ] **Nenhuma decisão em aberto** (DEC-10..DEC-17) que afete o migration
- [ ] **Nenhuma chave** está fora do mapeamento origem→destino
- [ ] **Plano de rollback** testado em staging (dry-run)
- [ ] **Stakeholders** todos cientes + sign-offs arquivados
- [ ] **Documento** `backendnode/docs/migration-unify-config-spec.md` foi escrito

Se tudo ✅, próxima sprint já pode implementar o migration real.

---

**Anexo — Referências cruzadas**

- PRD completo: `scripts/PRD_CONFIG_TAXAS_VALORES.md`
- Sprint backlog: `todo/todo.json` tasks CFG-01..CFG-10
- Decisões pendentes: `todo/todo.json` DEC-10..DEC-17
- ADR-008 (modelo matemático): `backendnode/src/api/campaigns/decisions/ADR-008-financial-model.md`
- LGPD review: `backendnode/src/api/campaigns/decisions/LGPD-REVIEW-S01.md`

---

**Versão:** 0.1 (Análise — 2026-08-17)
**Próxima revisão:** Após CFG-04 ser marcada como done
