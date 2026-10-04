# PRD — Painel de Configuração de Taxas e Valores da Plataforma

**Data:** 2026-08-17  
**Autor:** Estudo gerado a partir de pesquisa no codebase (ver §15 — Referências Investigadas)  
**Status:** Rascunho → aguardando aprovação e decisões (§14)  
**Prioridade:** ALTA — bloqueia transparência operacional e conformidade LGPD  
**Sprint alvo:** PRÉ-M7 (consolidação de dívidas técnicas)  
**Módulo:** Backend (config + admin) + Frontend (rotas /admin/config e /financeiro/config)

---

## 1. Contexto e Problema

A plataforma **iSelfToken** é uma fintech de equity crowdfunding tokenizado. Os cálculos financeiros da plataforma dependem criticamente de **taxas, percentuais e limites** (ex: taxa de reserva de token, taxa de compliance, faixa de equity aceito, etc.). Esses parâmetros impactam diretamente:

- **Conformidade legal** (CVM 88/2022 + LGPD Art. 7º V — obrigação de transparência em alterações que afetam cálculos)
- **Cálculos de captação** (camada crítica para founders, investidores e DPO)
- **Repasses financeiros** (compliance + financeiro configuram valor/intervalo das parcelas por campanha)

Hoje existem **2 fontes de configuração** no banco (**1 deprecated** — `system_configs`, migrando para S25), **~15 chaves já cobertas** com versionamento, **pelo menos 6 valores críticos hardcoded no código** sem possibilidade de administração:

| Sistema | Tabela | UI? | Versionamento? | Estado |
|---|---|---|---|---|
| SystemConfig (S01) | `system_configs` | Sim via `/admin/configs/:key` | ❌ Sobrescreve | **Deprecated** — migrando para S25 |
| ConfigParameterValue (S25) | `config_parameter_values` | Sim via `/admin/config/parameters` | ✅ Append-only por data | **Fonte única da verdade** (unificação) |

E valores hardcoded espalhados:
- `R$ 890,00` (selo de verificação documental, `startup-crud.service.ts:312`)
- `R$ 5.000,00` (early-access, `admin.service.ts:1399`)
- `R$ 5.000,00` (mínimo de investimento por campanha, `seed.ts`)
- SLA de 7 dias úteis (SlaCalculatorService)
- EFI (substitui C6 Bank fees — integração via gateway EFI)

**Problemas resultantes:**
1. **Inconsistência de dados**: as mesmas chaves vivem em 2+ tabelas; admin só vê uma metade
2. **LGPD arriscado**: `LGPD-REVIEW-S01.md` sinaliza que mudanças críticas (ex: `COMPLIANCE_FEE` de R$500 → R$5000) não geram alerta em tempo real
3. **Auditoria frágil**: SystemConfig sobrescreve valor anterior — perde-se histórico de quem mudou e quando
4. **Hardcoded values espalhados**: 6+ valores críticos sem possibilidade de administração
5. **Cache desalinhado**: `SystemConfigService` cacheia por 1h mas `ConfigService` não sabe invalidar
6. **UI `/admin/config` incompleta**: 9 chaves uppercase do SystemConfig não aparecem na tela

---

## 2. Objetivos

### 2.1 Objetivo geral

Unificar todos os parâmetros financeiros e operacionais da plataforma em **um único modelo de configuração** (append-only, com vigência por data), com UI administrativa completa, RBAC granular, audit log dedicado e migração dos valores hardcoded.

### 2.2 Objetivos mensuráveis

| # | Métrica | Atual | Alvo |
|---|---|---|---|
| O1 | Tabelas de configuração | 3 | 1 |
| O2 | Valores hardcoded críticos em código | ≥ 6 | 0 |
| O3 | Parâmetros editáveis via UI | 15 (S25) + 9 (S01, sem UI) | ≥ 30 (cobrindo todas as atuais + hardcoded) |
| O4 | Cobertura de histórico/auditoria de mudança | Parcial (LGPD-REVIEW-S01 ↑) | 100% (cada mudança gera audit log) |
| O5 | Latência de propagação da nova taxa | ≤ 1h (cache Redis TTL) ou deploy | ≤ 60s (invalidação on-write) |
| O6 | Alertas para mudança em config crítica | 0 | 100% (DPO/CTO notificados por email) |

---

## 3. Personas

### P1 — **ADMIN (Alex)** — administrador da plataforma
- **Rotina:** Configura cobranças, limites, percentuais em escala global
- **Dores atuais:**
  - Não sabe se há 1 ou 3 sistemas de config
  - Algumas chaves não aparecem em nenhum painel
  - Mudou `PLATFORM_ADMIN_FEE_PCT` de 20% para 25% num deploy e não tem registro
- **Ganho desejado:** Painel único, ver todas as chaves, ter log, agendar mudança com efeito a partir de data

### P2 — **FINANCEIRO (Sandra)** — equipe de repasse/conciliação
- **Rotina:** Concilia transações, configura parcelamento de repasses, lê taxas para auditoria
- **Dores atuais:**
  - Vê `/financeiro/config` mas faltam chaves (apenas `fundraising.*`)
  - Alterar valor FIXO de parcela exige processo manual fora do sistema
- **Ganho desejado:** Ler todas as taxas relevantes para conciliação + sugerir valores de parcela coerentes com taxa da plataforma

### P3 — **COMPLIANCE/DPO (Renata)** — governança de dados
- **Rotina:** Audita mudanças, garante LGPD/CVM, atende auditoria externa
- **Dores atuais:**
  - Não recebe alerta quando `COMPLIANCE_FEE` muda
  - Não consegue dizer "quem mudou `TOKEN_MINT_FEE` em Q2/2026?"
- **Ganho desejado:** Audit log dedicado + notificação em mudanças críticas + consulta retroativa por chave

### P4 — **FUNDADOR (João)** — usa indiretamente
- **Impacto:** As taxas configuradas afetam o cálculo da reserva de tokens que ele paga. Não vê a tela, mas sente o efeito.

### P5 — **INVESTIDOR (Pedro)** — usa indiretamente
- **Impacto:** Preço de token, taxa de compliance (que pode ser descontada do repasse), etc.

---

## 4. Histórias de usuário

### ÉPICO A — Unificação da Fonte da Verdade

> **A1.** Como ADMIN, quero ver **uma única lista de todos os parâmetros** da plataforma (taxas, percentuais, limites, valores fixos), agrupados por domínio, sem precisar saber se vêm de tabelas diferentes.

> **A2.** Como ADMIN, quero **editar um parâmetro** preenchendo novo valor, data de vigência (hoje ou futuro) e motivo opcional, e a partir da data ele passa a valer automaticamente.

> **A3.** Como DPO, quero **auditar quem mudou o quê e quando** em qualquer chave, com filtros por período/chave/usuário.

> **A4.** Como ADMIN, quero **reverter (rollback)** uma alteração agendada/executada que trouxe problema operacional, dentro de uma janela razoável (ex: 7 dias).

### ÉPICO B — Migração dos Valores Hardcoded

> **B1.** Como ADMIN, quero poder **ajustar a taxa do selo "Startup Verificada"** (atualmente hardcoded em R$ 890) sem deploy.

> **B2.** Como ADMIN, quero poder **ajustar a taxa de Early Access** (atualmente hardcoded em R$ 5.000) sem deploy.

> **B3.** Como ADMIN, quero poder **ajustar o mínimo de investimento por campanha** (atualmente hardcoded em R$ 5.000) sem deploy.

> **B4.** Como FINANCEIRO, quero configurar o **limite de valor FIXO por parcela** no repasse (DEC-02 do Repasse — ainda em aberto).

### ÉPICO C — Segurança e Conformidade

> **C1.** Como DPO, quero **receber alerta** (email + notificação in-app) quando uma config **crítica** mudar — ex: `COMPLIANCE_FEE`, `PLATFORM_ADMIN_FEE_PCT`, qualquer chave do grupo `Compliance` ou `Tokens e emissão`.

> **C2.** Como qualquer usuário interno, quero **confirmação visual + lock de 5s** ao editar uma config crítica, evitando cliques acidentais.

> **C3.** Como FINANCEIRO, quero ter **acesso de leitura** a todas as configs mas **sem permissão de edição** (RBAC granular), exceto planos (`plan.*`).

> **C4.** Como DPO, quero **exportar o histórico de uma chave em CSV** (decisão tomada em LGPD-REVIEW-S01.md §histórico) para auditoria externa.

### ÉPICO D — UX Admin

> **D1.** Como ADMIN, quero ver **badges de impacto** ("afeta fundraising", "afeta compliance", "afeta planos") em cada parâmetro, indicando quem sente o efeito.

> **D2.** Como ADMIN, quero **preview do efeito** antes de salvar — ex: "Campanha de R$ 5M terá taxa de compliance de R$ X" (calcula em sandbox).

> **D3.** Como ADMIN, quero **alertas quando config crítica é agendada** — bloco âmbar persistente até a data chegar.

> **D4.** Como ADMIN, quero **filtros e busca** no painel (por grupo, por nome, por quem criou).

---

## 5. Requisitos Funcionais

### 5.1 Escopo Principal (MVP)

#### Módulo de Dados — Consolidação

| ID | Requisito | Origem | Prioridade |
|---|---|---|---|
| RF-01 | **Migração SQL** copia todos os valores de `system_configs` + `finance_config` → `config_parameter_values` (com `effectiveFrom = 1970-01-01`, `note = "Migração de [origem]"`). Idempotente. | Estudo §Fase 6 | MUST |
| RF-02 | Tabela `system_configs` é marcada como **deprecated** (somente leitura) e todo código passa a ler via `ConfigService.getEffective()`. | ADR-008 | MUST |
| RF-03 | Tabela `finance_config` é removida após migração confirmada. | Estudo §Fase 6 | MUST |
| RF-04 | Endpoint `/admin/config/parameters` é expandido para aceitar **TODAS** as chaves (antigas uppercase + novas lowercase + futuras). Mantém backwards-compat via alias. | Estudo §Fase 2 | MUST |
| RF-05 | Adicionar 6+ chaves hoje hardcoded ao registro canônico, com default inicial igual ao valor hardcoded: | Estudo §Fase 3 | MUST |

**Novas chaves propostas (RF-05):**

| Chave | Label no UI | Default (igual ao hardcoded) | Unidade | Grupo |
|---|---|---|---|---|
| `seal.verificationFee` | Taxa do selo Startup Verificada | 890 | BRL | Selos |
| `earlyAccess.productPrice` | Preço Early Access | 5000 | BRL | Marketplace |
| `campaign.minTarget` | Meta mínima global (R$) | 100000 | BRL | Captação |
| `campaign.maxTarget` | Meta máxima global (R$) | 5000000 | BRL | Captação |
| `campaign.minInvestment` | Investimento mínimo por campanha | 5000 | BRL | Limites de captação |
| `campaign.maxInvestment` | Investimento máximo por campanha | a definir | BRL | Limites de captação |
| `campaign.equityMin` | Equity mínimo oferecido (%) | a definir | PERCENT | Limites de captação |
| `campaign.equityMax` | Equity máximo oferecido (%) | a definir | PERCENT | Limites de captação |
| `token.basePrice` | Preço base do token | 200 | BRL | Token |
| `token.salePrice` | Preço de venda do token | 240 | BRL | Token |
| `token.reservePrice` | Preço de reserva do token | 1 | BRL | Token |
| `token.fastTrackFee` | Taxa Fast Track | a definir | BRL | Serviços extras |
| `affiliate.commissionOptions` | Opções de comissão afiliado (%) | 3,5,10 | LIST | Afiliados |
| `repasse.minParcela` | Valor mínimo por parcela | a definir | BRL | Repasse |
| `repasse.maxParcela` | Valor máximo por parcela | a definir | BRL | Repasse |
| `repasse.defaultParcelas` | Sugestão de número de parcelas | 12 | INT | Repasse |
| `repasse.slaDiasUteis` | SLA financeiro (dias úteis) | 7 | INT | Repasse |
| `repasse.jurosBasePct` | Juros base por parcela (% a.m.) | a definir | PERCENT | Repasse |

#### API — Contratos

| ID | Endpoint | Método | Auth | Descrição |
|---|---|---|---|---|
| API-01 | `/admin/config/parameters` | GET | ADMIN/FINANCEIRO/COMPLIANCE | Lista todas as chaves com vigente + agendado + histórico |
| API-02 | `/admin/config/parameters` | POST | ADMIN | Cria nova versão (key, value, effectiveFrom, note) |
| API-03 | `/admin/config/parameters/:key/history?from=&to=&page=` | GET | ADMIN/COMPLIANCE | Histórico paginado de uma chave |
| API-04 | `/admin/config/parameters/:key/effective?at=ISO_DATE` | GET | ADMIN/FINANCEIRO | Valor vigente numa data específica |
| API-05 | `/admin/config/parameters/:key/scheduled` | DELETE | ADMIN | Cancela uma alteração agendada futura |
| API-06 | `/admin/config/parameters/export.csv?from=&to=` | GET | ADMIN/COMPLIANCE | Exporta histórico em CSV |
| API-07 | `/admin/config/audit-log?key=&actor=&from=&to=` | GET | ADMIN/COMPLIANCE | Auditoria de quem mudou o quê |
| API-08 | `/financeiro/config/fundraising` | GET | FINANCEIRO/ADMIN | Snapshot read-only do grupo fundraising |

#### UI — `/admin/config` (Admin)

- Manter a estrutura atual mas expandir:
  - **Busca textual** por nome da chave
  - **Filtro por grupo** (chips horizontais: Tokens / Comissões / Compliance / Limites / Planos / Selos / Repasse / Captação / Integrações)
  - **Indicador de impacto** (badge "Afeta cálculos de campanha" / "Afeta compliance" / "Afeta planos")
  - **Confirmação dupla para configs críticas** (modal com lock de 5s + digitação da chave)
  - **Botão "Reverter"** em cada item do histórico (RF A4) — gera nova versão com valor anterior
  - **Botão "Cancelar agendamento"** se vigente atual e próxima são iguais (RF API-05)

#### UI — `/financeiro/config` (Financeiro)

- Mantém como read-only
- Adicionar: **export CSV** das chaves que ele vê (para conciliação)

---

### 5.2 Escopo Estendido (v1.1 — fora de MVP)

| ID | Requisito | Prioridade |
|---|---|---|
| EX-01 | Detecção de impacto cruzado — antes de alterar `fundraising.equityMax`, mostrar: "X startups têm captação nessa faixa; alteração afeta cálculos retroativos apenas a partir da data de vigência" | NICE |
| EX-02 | API pública `/config/whitelabel.json` para tenants futuros (multi-tenant) | LATER |
| EX-03 | Modo "sandbox" — admin testa combinação de taxas antes de salvar | LATER |
| EX-04 | Auto-documentação via IA — gerar changelog a partir das notas | LATER |

---

## 6. Requisitos Não-Funcionais

| Categoria | Requisito |
|---|---|
| **Performance** | GET `/admin/config/parameters` retorna ≤ 200ms (p99) com 100 chaves no histórico |
| **Performance** | Mudança de 1 config propaga para TODOS os workers em ≤ 60s (Redis pub/sub ou DEL imediato) |
| **Concorrência** | Duas edições simultâneas da mesma chave: 2ª recebe 409 Conflict (versioning append-only resolve) |
| **Segurança** | Audit log imutável (append-only) sem DELETE físico do DB; soft delete apenas com flag `revokedAt` |
| **Segurança** | Toda mudança gera `AuditLog` com `actorId`, `actorRole`, `ip`, `userAgent`, `key`, `oldValue`, `newValue`, `note` (LGPD Art. 37) |
| **Disponibilidade** | Falha em Redis não derruba escrita (logs warning, fallback em DB) |
| **Acessibilidade** | WCAG 2.1 AA — navegação por teclado, contraste 4.5:1, ARIA labels em PT-BR |
| **i18n** | Toda label/mensagem em **PT-BR** (idioma oficial do harness) |
| **LGPD** | Mudanças em chaves do grupo "Compliance" + "Tokens e emissão" disparam notificação ao DPO por email (consentimento não necessário — base legal: obrigação legal/regulatória, Art. 7º V LGPD) |
| **Auditoria** | Retenção do histórico por **10 anos** (Art. 16 LGPD + obrigação regulatória CVM) |
| **Versionamento** | EffectiveFrom aceita data passada, presente e futura; passado cria retroativo; presente aplica imediato; futuro agenda |

---

## 7. Modelo de Dados (esquemático)

### `config_parameter_values` (já existe — evoluir)

```typescript
model ConfigParameterValue {
  id              Int       @id @default(autoincrement())
  key             String                              // ex: "fundraising.authFeePerToken"
  value           String    @db.Text                 // sempre string para suportar números grandes + tipos
  effectiveFrom   DateTime                            // 1970-01-01 = linha de base; futuro = agendado
  note            String?   @db.Text                 // motivo declarado pelo admin
  createdById     Int?                                 // FK opcional para User
  createdAt       DateTime  @default(now())
  revokedAt       DateTime?                           // NOVO: timestamp de revogação (cancelar agendamento)
  revokedById     Int?                                // NOVO
  
  @@index([key, effectiveFrom])
  @@unique([key, effectiveFrom, revokedAt])          // NOVO: impede duplicar vigente+revoked
  @@map("config_parameter_values")
}
```

### NOVA tabela: `config_audit_log` (audit dedicado)

```typescript
model ConfigAuditLog {
  id              Int       @id @default(autoincrement())
  key             String
  action          ConfigAction                         // CREATE | READ | EXPORT | ROLLBACK | REVOKE_SCHEDULED
  oldValue        String?
  newValue        String?
  note            String?
  effectiveFrom   DateTime
  ip              String?
  userAgent       String?
  actorId         Int?
  actorRole       String?
  createdAt       DateTime  @default(now())
  
  @@index([key, createdAt])
  @@index([actorId, createdAt])
  @@map("config_audit_log")
}

enum ConfigAction {
  CREATE                      // nova versão criada
  READ                        // GET registrado (auditoria só para exports/keys críticas)
  EXPORT                      // CSV exportado
  ROLLBACK                    // nova versão = valor anterior
  REVOKE_SCHEDULED            // cancelou agendamento futuro
}
```

### Remoções (após migração validada)

- ❌ `system_configs` (model `SystemConfig`) — DROP TABLE na sprint que consolida
- ❌ `finance_config` (model `FinanceConfig`) — DROP TABLE idem

---

## 8. Fluxo de Uso

### 8.1 Happy Path — ADMIN edita uma config

```
[1] ADMIN acessa /admin/config (sidemenu: Percent → Configurações)
[2] Page carrega via useAdminConfigQuery (TanStack Query, staleTime 60s)
    → GET /api/admin/config/parameters
    → retorna 28+ chaves agrupadas (após RF-05)
[3] ADMIN clica em "Compliance Fee" → form inline expande
[4] ADMIN digita novo valor (R$ 2.000,00)
[5] ADMIN escolhe data: HOJE (default) ou FUTURO
[6] ADMIN escreve nota: "Ajuste para cobrir custos do novo KYC automatizado"
[7] ADMIN clica "Agendar alteração" → modal de confirmação para chave CRÍTICA
    (lock 5s + exige digitar "ALTERAR COMPLIANCE_FEE")
[8] mutation.mutate() → POST /api/admin/config/parameters
    → backend cria nova ConfigParameterValue
    → backend invalida cache Redis (DEL financial_configs + por chave)
    → backend grava ConfigAuditLog
    → se CRITICAL_KEY, dispara email para DPO/CTO via NotificacaoWorker
[9] UI mostra toast verde + item entra em "Agendado: R$ 2.000 a partir de DD/MM"
[10] Próximo request de cálculo já lê o novo valor (cache invalidado)
```

### 8.2 Fluxo de Rollback

```
[1] ADMIN clica em chave → vê histórico expansível
[2] Vê versão N-1 = R$ 1.500, vigente de 2024-01-01 a 2026-08-17
[3] Clica "Reverter" → modal: "Criar nova versão igual a R$ 1.500 a partir de HOJE?"
[4] Confirma → mesma mecânica do item 8.1
[5] Audit log fica com action=ROLLBACK
```

### 8.3 Fluxo DPO audita

```
[1] DPO acessa /compliance/config-audit (ou /admin/config com modo auditoria)
[2] Filtra por chave=COMPLIANCE_FEE, período 2026-01..2026-09
[3] Lista de mudanças com: quem, quando, valor anterior, novo, motivo
[4] Exporta CSV
[5] Arquivo vai para pasta de auditoria trimestral
```

---

## 9. Métricas de Sucesso e Telemetria

| KPI | Target | Como medir |
|---|---|---|
| Tempo médio de ADMIN para ajustar uma taxa | < 30s | Analytics na UI (clique → confirmação) |
| % de configs editáveis via UI | 100% após migração | Code scan (zero hardcoded no src/) |
| Taxa de edição no horário de pico | 0 esperado; alerta se > 1/min | Métrica no Datadog/Grafana |
| Latência de propagação | p99 ≤ 60s | APM instrumentando invalidarCache → próximo request |
| Aderência a confirmação dupla para chaves críticas | 100% | Audit log — nenhum registro deve pular etapa |
| NPS interno entre ADMIN/FINANCEIRO/DPO | ≥ 8/10 | Survey após 30 dias |

---

## 10. Riscos e Mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Migração de dados corrompe valores vigentes | Média | Crítico | Backup antes + dry-run em staging; idempotência via effectiveFrom 1970-01-01 |
| R2 | Admin edita config crítica sem perceber impacto | Alta | Alto | Confirmação dupla + indicador de impacto + DPO notificado |
| R3 | Cache Redis fora do ar → cálculo usa valor antigo | Baixa | Médio | Fallback DB + logs warning + degraded mode transparente |
| R4 | Hardcoded R$ 890 fica em 2 lugares (código + DB) por transição | Alta | Médio | Search-and-replace antes de remover hardcoded; flag `legacy: true` durante migração |
| R5 | EFI alterar taxa unilateralmente sem aviso | Baixa | Crítico | Job diário que compara configurações com `Payment.amount` real (detecção drift) |
| R6 | Conflito entre FINANCEIRO (read + Plans) e ADMIN (write) | Média | Médio | RBAC granular + audit log identifica quem tentou |
| R7 | Regra CASE.md precisa de atualização para 3 preços de token (base/reserva/venda) — alinhamento antes da migração | Alta | Médio | DEC-01 força alinhamento antes da migração |

---

## 11. Dependências e Integrações

### Internas
- `Module` de configuração atual (`ConfigService` + `ConfigParameterValue`)
- `Module` admin (`AdminGuard` existente)
- `Module` auditoria (`AuditLogService` deve ganhar método `logConfigChange`)
- `Module` notificações (email + in-app, para alertas DPO)
- Frontend TanStack Query + Design System atual

### Externas
- **EFI** — fee de PIX/boleto (via administração central)
- **Asaas** — fee de boleto (futuro)
- **Email service (AWS SES via Nodemailer)** — alertas DPO

### Squads/Stakeholders
- **DPO (Renata)** — dona da feature C1 (alertas)
- **CTO** — sponsor da migração (evitar duplo estado de dado)
- **Time de Compliance** — auditoria contínua
- **Time Financeiro (Sandra)** — co-dona do escopo de leitura

---

## 12. LGPD & Compliance

| Aspecto | Tratamento |
|---|---|
| Base legal para processar logs de auditoria | Art. 7º V LGPD (obrigação legal/regulatória) + Art. 37 (registro de operações) |
| Retenção | 10 anos (LGPD Art. 16 I + obrigação regulatória CVM) |
| Encriptação em repouso | Sim (DB criptografado já existe) |
| Pseudonimização do `actorId` em exports | Hash SHA-256 + role preservado |
| Direito de revisão (Art. 18) | Não aplicável — administradores são profissionais com obrigação legal |
| Auditoria de quem acessou | CONFIG_AUDIT_LOG guarda IP + userAgent + query (já em outros AuditLogs) |

---

## 13. Out-of-Scope (explícito)

❌ Multi-tenant (whitelabel) — cada tenant tem suas próprias configs (futuro)  
❌ UI para INVESTIDOR visualizar taxas da plataforma  
❌ UI para FOUNDER visualizar cálculo da reserva antes de submeter  
❌ Sincronização com serviços externos bidirecional  
❌ Configs por campanha (campos `Campaign.affiliateCommissionPct` permanecem per-campaign — RF M14)  
❌ Auto-aprovação de valores acima de limite (compliance gate separado)  
❌ Modelagem de "perfis" de config (Conservador / Balanceado / Agressivo) — YAGNI  

---

## 14. Decisões em Aberto

> **DEC-01 (CRÍTICA)**: **Unificar** em uma única tabela (`config_parameter_values`) ou **manter duas** com alias?
> - **Contexto:** Hoje existem 2 tabelas ativas (`system_configs` + `config_parameter_values`) e 1 legada (`finance_config`). O S25 (`config_parameter_values`) já possui versionamento por data, o modelo mais robusto.
> - **Recomendação:** Unificar tudo no S25. Mark `system_configs` como deprecated, remover `finance_config` após migração. Todas as leituras usam `ConfigService.getEffective()` que resolve o valor vigente por data.
> - **Impacto:** Elimina duplicidade, garante single source of truth, simplifica cache e UI.

> **DEC-02**: Migrar todos os valores hardcoded (R$ 890 selo, R$ 5k early access, faixas de estágio) **agora** ou em **sprint separada**?
> - Recomendação: Sprint dedicada, evitar migração dupla no mesmo release.

> **DEC-03**: Cache invalidation ao mudar config — **Redis pub/sub** (multi-worker síncrono) ou **TTL curto** (best effort)?
> - Recomendação: Pub/sub (mantém O5 ≤ 60s).

---

## 15. Referências Investigadas (Estudo)

### Documentos
- `CASE.md` §[Captação] linha 37-58, §[Painel do Fundador], §[Repasse]
- `backendnode/src/api/campaigns/decisions/ADR-008-financial-model.md` (modelo matemático)
- `backendnode/src/api/campaigns/decisions/LGPD-REVIEW-S01.md` (deficit histórico de auditoria)
- `backendnode/src/common/system-config/interfaces/financial-configs.interface.ts` (chaves antigas)
- `backendnode/src/api/config/config.constants.ts` (chaves novas S25)
- `backendnode/prisma/seeds/seed-system-config.ts` (defaults antigos)
- `backendnode/scripts/concluido/PRD_FINANCEIRO_CRUD_PLANOS.md` (PRD relacionado a planos)

### Código investigado
- `backendnode/src/api/admin/admin.controller.ts:245-322` (AdminConfigController)
- `backendnode/src/common/system-config/system-config.controller.ts` (SystemConfigController legado)
- `backendnode/src/common/system-config/system-config.service.ts` (cache Redis 1h)
- `backendnode/src/api/campaigns/service/campaign-financial.helper.ts` (consome SystemConfig)
- `backendnode/src/api/startup/service/startup-crud.service.ts:312` (hardcoded `amount: 890`)
- `backendnode/src/api/startup/service/startup-crud.service.ts:264` (doc "R$ 890")
- `backendnode/src/api/startup/dto/request-verification.dto.ts:9` (doc "R$ 890")
- `backendnode/src/api/startup/startup.controller.ts:210` (doc "R$ 890")
- `backendnode/src/api/admin/admin.service.ts:1399` (EARLY_ACCESS hardcoded)
- `backendnode/prisma/schema.prisma:985-992` (PaymentPurpose enum com SELO = R$ 890)

### UI investigada
- `frontend/app/routes/private/admin-config.tsx` (205 linhas, UI atual)
- `frontend/app/hooks/use-admin-config.ts`
- `frontend/app/hooks/use-update-config-mutation.ts`
- `frontend/app/routes/private/financeiro-config.tsx` (read-only)
- `frontend/app/components/layout/sidebar.tsx:41` (link "Configurações" → /admin/config)

### Banco
- `config_parameter_values` (15 chaves vigentes)
- `system_configs` (9 chaves potenciais, vazia hoje)
- `finance_config` (14 chaves lowercase, fonte intermediária)

---

## 16. Out-of-Scope para Esta PRD (PRD vizinhos)

- PRD de CRUD de Planos (`/financeiro/plans`) — já existe esboço em `concluido/PRD_FINANCEIRO_CRUD_PLANOS.md`
- PRD de multi-tenant (whitelabel)
- PRD de cálculo de IR / impostos sobre repasse
- PRD de integração com gateway de pagamento (atualmente mock)
- PRD de auditoria externa (LGPD-REVIEW-S01 menciona, mas separado)

---

## 17. Próximos Passos

1. **Hoje:** revisar este PRD com stakeholders (DPO, CTO, Financeiro lead)
2. **Esta semana:** resolver DEC-01 a DEC-03 em reunião
3. **Próxima sprint (estimativa: 2 semanas):**
   - Migração de dados (RF-01 a RF-03)
   - Endpoint unificado (RF-04)
   - Migração de hardcoded (RF-05)
   - UI atualizada (RF épico D)
4. **Sprint seguinte:** alertas críticos + audit log + export CSV (épico C)
5. **Sprint +2:** métricas + GA + load test (épico validação)

---

**Aprovações necessárias para próxima sprint:**
- [ ] CTO (Alex)
- [ ] DPO (Renata)
- [ ] Financeiro lead (Sandra)
- [ ] Sponsor Comercial (definir impacto nas campanhas existentes em captação)

**Versão:** 0.1 (Rascunho) — 2026-08-17  
**Próxima revisão:** Após DEC-01..03 resolvidas (~3 dias)
