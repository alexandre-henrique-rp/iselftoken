# PRD — Marketplace: Regras de Seleção e Posicionamento

**Data:** 2026-08-17  
**Status:** Rascunho (aguardando validação com stakeholders)
**Prioridade:** ALTA — bloqueia visibilidade de startups em captação
**Módulo:** Backend (`marketplace`, `startup`) + Frontend (landing e dashboards)
**Sprint alvo:** PRD-ANALYSIS-MARKETPLACE (tasks MKT-01..MKT-08 no `todo/todo.json`)
**Pré-requisito:** nenhuma implementação sem antes fechar `DEC-MKT-01..03`
**Origem:** conversa com stakeholder + análise do codebase

---

## 1. Contexto

A home pública (`/`) e o marketplace autenticado (`/home`) precisam mostrar startups **em captação** (`Campaign.status = OPEN`) de forma justa, transparente e compreensível para o fundador.

### 1.1 Achados do diagnóstico (estado atual)

| Camada | O que existe hoje | Onde está | Gap |
|---|---|---|---|
| **Schema** | `startups.score` (Int 0-100) já existe | `backendnode/prisma/schema.prisma` | ❌ **nunca é populada no seed** — todas as 23 startups ficam com `score=0` |
| **Schema** | `startups.isAccelerated` (Boolean) já existe | schema | ❌ Selo "acelerada" não é atribuído em nenhum lugar por padrão |
| **Schema** | `Startups.selos` + `StartupSeal` (M:N) + enum `SealCategory` (STAGE/VERIFICATION/PARTNERSHIP/ACHIEVEMENT/CUSTOM) | schema | ✅ infra pronta mas **não populada** |
| **Backend** | `PATCH /admin/startups/:id/score` (`admin.service.ts:updateStartupScore`) | já existe | ✅ endpoint existe, mas só aceita **score manual** (sem quebrar pra baixo automaticamente) |
| **Backend** | Cálculo de score KYC-derived (`admin.service.ts:525-565`) já implementado | mas é chamado **manualmente** por Compliance | ❌ nunca roda automaticamente em seed ou mudança de docs |
| **Endpoint público** | `/api/startups/featured` (usado pela home) — `startup-query.service.ts:findByMarketplaceSection` | ordena por `score DESC, createdAt DESC`, top 10 | ✅ pronto mas dependente de score populado |
| **Endpoint público** | `/api/marketplace/featured` (duplicado) — `marketplace.service.ts:getFeatured` | top N por score desc, take=10 | ⚠️ segundo sistema, com filtros extras e caching diferente |
| **Config** | `marketplace.featured_limit`, `marketplace.opportunities_limit`, `marketplace.recent_limit` | tabela `finance_config` | ✅ já configurável |

### 1.2 Estados observados no banco (antes do reset)

| Slug | Score | Status | Aparece em Featured? |
|---|---|---|---|
| TechInnovate (founder@iselftoken.com) | **0** | OPEN | ❌ Nunca (score=0 fica atrás dos outros) |
| GreenEnergy | 0 | FUNDED | ❌ |
| FintechPro | 0 | DRAFT | ❌ |
| NeuralForge (blueprint) | 92 | OPEN | ✅ top 1 |
| PaySwift (blueprint) | 88 | OPEN | ✅ top 2 |
| ~18 outros blueprints | 0..82 | OPEN/CLOSED/FUNDED | ordenado por score desc |

### 1.3 Problema de negócio

- **TechInnovate (o "caso do founder")** é a startup do `founder@iselftoken.com`, está com campanha **OPEN** no valor de **R$ 5M**, e **NUNCA aparece** em `/home` ou em `/featured` porque tem score=0.
- **Founder não sabe** que isso acontece nem o que pode fazer para ficar bem posicionado.
- O fundador ativa fica perdido: como impulsionar minha startup, se o algoritmo não está claro?

---

## 2. Objetivo

Criar **uma única regra de posicionamento** que seja:

1. **Transparente** — founder entende olhando o painel dele
2. **Educacional** — founder sabe exatamente o que fazer para subir
3. **Auditável** — DPO/Compliance conseguem explicar qualquer posição
4. **Justa** — combines "qualidade automática" + "human-curated" sem favorecer sóVIP
5. **Estável** — não oscila diariamente, founder consegue planejar

---

## 3. Algoritmo Proposto (transparente, em 3 níveis)

A **home page** deve mostrar uma única lista ranqueada composta por:

### 3.1 Estrutura da lista final

```
┌─────────────────────────────────────────────────┐
│ [Pinned 1]      ← ADMIN/COMPLIANCE escolheu
│ [Pinned 2]      ← ADMIN/COMPLIANCE escolheu
│ [Pinned 3]      ← ADMIN/COMPLIANCE escolheu  (máx 3)
├─────────────────────────────────────────────────┤
│ [Auto #1]   score 92 · NeuralForge          │
│ [Auto #2]   score 88 · PaySwift             │
│ [Auto #3]   score 75 · TechInnovate   ⓘ    │
│ [Auto #4]   score 71 · CloudPilot           │
│ ... até N                                     │
└─────────────────────────────────────────────────┘
   ⓘ = tooltip explica "Seu score é 75 porque..."
```

### 3.2 Regras por nível

#### Nível 1 — Pinned (manual)
- **Quantidade:** máximo **3**
- **Quem pina:** apenas `ADMIN` (full) ou `COMPLIANCE` (com auditoria obrigatória)
- **Como:**
  - Novo campo no schema: `Startup.manuallyPinned: Boolean` + `Startup.manuallyPinnedBy: Int?` + `Startup.manuallyPinnedAt: DateTime?`
  - Novo endpoint `POST /admin/startups/:id/pin` + `DELETE /admin/startups/:id/pin`
  - Log obrigatório no `AuditLog` (`action='PIN_STARTUP'` ou `UNPIN_STARTUP`)
- **Por que?** Permite destaque manual para fundadores estratégicos (parceria, early-stage, acelerado), sem quebrar a regra automática
- **Justiça:** Máximo 3 impede abuso. Decisão sempre fica auditada com justificativa

#### Nível 2 — Score de qualidade (automático, calculável)
- **Range:** 0..100, **calculado automaticamente** em background
- **Quem calcula:** job diário (cron 03:00 BRT) que recalcula para todas as startups APPROVED com campanha OPEN
- **Inputs (pesos):**

| Peso | Item | Quem contribui | Como founder ganha pontos |
|---|---|---|---|
| **20** | Documentos CVM obrigatórios enviados (MIE + ContratoSocial + CNPJ + Balanço + DeclaraçãoVeracidade + Ata) | Founder (uploads) | Enviar 6 documentos CVM obrigatórios |
| **15** | KYC do founder aprovado (avatar + documento + comprovante + biofacial) | Compliance | Completar verificação biométrica |
| **10** | Campanhas concluídas com sucesso (`Campaign.status IN (FUNDED, PAID_OUT)`) | Sistema | Levar uma captação até `FUNDED` |
| **10** | Selo `VERIFIED` (Startup Verificada — termo de adesão assinado) | Compliance atrelar | Solicitar verificação documental |
| **10** | Selo `PARTNERSHIP` (acelerada por programa parceiro) | ADMIN atrelar | Conseguir parceria com aceleradora |
| **10** | Engajamento (`tokensSold/totalTokens >= 50%` da campanha ativa) | Sistema (volume) | Atingir 50%+ vendido |
| **15** | Documentos adicionais enviados (PROJECOES, PITCH_DECK, MODELO_CONTRATO_OFERTA, COMPROVANTE_ENDERECO, DECLARACAO_RECEITA) | Founder | Enviar docs recomendados (bonus) |
| **5** | `pitch.youtube_url` preenchido + documentos de mídia | Founder | Adicionar vídeo + capa |
| **5** | `redes_sociais` com 3+ canais preenchidos | Founder | LinkedIn, Instagram, site, YouTube |
| **0** (negativo) | Reportagens/complaints? | Sistema | (futuro) |
| **TOTAL** | **100** | | |

**Fórmula:**
```
score = clamp(0, 100,
  documentos_cvm_obrigatorios[count/6] * 20
  + kyc_founder[count/4] * 15
  + campanhas_funded[0..1+] * 10
  + selo_verified * 10
  + selo_partnership * 10
  + engajamento_cap_atual * 10
  + documentos_extras[count/5] * 15
  + midia_preenchida * 5
  + redes_sociais[count/3] * 5
)
```

#### Nível 3 — Recência (desempate)
- `ORDER BY score DESC, updatedAt DESC` (não `createdAt DESC` — startups atualizadas recentemente sobem)
- Penalidade leve: `-score * 0.1` por dia sem atualização (>30 dias)
  - Founder recebe alerta: "Sua startup está parada há 45 dias, isso afeta visibilidade"

### 3.3 Limites práticos (já configurados em `finance_config`)

```
marketplace.featured_limit      = 10  (pinned 3 + auto 7 default)
marketplace.opportunities_limit = 16  (resto do catálogo paginado)
marketplace.recent_limit        =  5  (aba "Recém-adicionados")
```

---

## 4. Personas e histórias de usuário

### P1 — Founder (João, `founder@iselftoken.com`)
- **Quero:** ver minha startup na home `/`, na aba "Rodadas em Destaque"
- **Quero:** entender por que estou em tal posição e como subir
- **Quero:** que o cálculo seja justo e eu consiga agir para melhorar
- **Frustração atual:** "mandei meus documentos, segui o checklist, mas não sei se apareceu"

**Histórias:**
- **H1.** Como founder, quero ver no **painel `/founder/dashboard`** um card "Posição no Marketplace" mostrando:
  - Posição atual em "Rodadas em Destaque" (#X de N)
  - Score atual e breakdown (ex: "Documentos CVM: 20/20 · KYC: 15/15 · Engajamento: 0/10 porque captação em 45%")
  - Botão "Como melhorar minha posição?" → tutorial com checklist
- **H2.** Como founder, quando envio um documento novo, quero que minha posição **possa subir** no próximo ciclo (até 24h)

### P2 — ADMIN/COMPLIANCE (Alex/Renata)
- **Quero:** destacar manualmente até 3 startups estratégicas
- **Quero:** justificar por que pinei (motivo obrigatório)
- **Quero:** auditoria de quem pineou/unqueou e quando
- **Histórias:**
- **H3.** Como ADMIN, quero `POST /admin/startups/:id/pin` com body `{ reason: string }` que:
  - Marca `startups.manuallyPinned = true`
  - Grava `AuditLog{action:'PIN_STARTUP', reason, actorId}`
  - Retorna erro se já há 3 pinned
- **H4.** Como ADMIN, quero ver uma lista `GET /admin/marketplace/pinned` com os 3 pinos ativos + justificativas

### P3 — Visitante / Investidor (Pedro)
- **Quero:** ver uma lista de qualidade na home, sem precisar entender ranking
- **História:**
- **H5.** Como visitante, ao ver "Rodadas em Destaque", quero ver um **tooltip no card** explicando "Esta startup está em destaque por: selo X, documento Y". Transparente, sem expor algoritmo

---

## 5. Requisitos Funcionais

### 5.1 Backend

| ID | RF | Prioridade |
|---|---|---|
| RF-01 | Adicionar colunas `Startups.manuallyPinned (Boolean)`, `manuallyPinnedBy (Int?)`, `manuallyPinnedAt (DateTime?)`, `manuallyPinnedReason (String?)` | MUST |
| RF-02 | `POST /admin/startups/:id/pin` — body `{ reason }`, valida máx 3 pinos ativos, retorna 409 se exceder | MUST |
| RF-03 | `DELETE /admin/startups/:id/pin` — body opcional `{ reason }`, audit | MUST |
| RF-04 | `GET /admin/marketplace/pinned` — retorna lista atual + permissões (Admin/Compliance) | MUST |
| RF-05 | Endpoint público `GET /api/startups/featured` retorna lista consolidada: 3 pinned + N ordenados por score, total = `marketplace.featured_limit` | MUST |
| RF-06 | Job `RecalculateMarketplaceScore` (cron 03:00 BRT) recalcula score de todas `Startup.APPROVED + tem campanha OPEN ou grace period 10d` | MUST |
| RF-07 | Job dispara também em eventos: upload de documento, KYC aprovado, selo atrelado, campanha mudou status para OPEN/FUNDED/PAID_OUT | MUST |
| RF-08 | Sistema de score retorna breakdown explicativo (campo `scoreBreakdown: { cvmDocs: number, kyc: number, ... }`) | MUST |
| RF-09 | Endpoint `/api/startups/:id/marketplace-info` retorna: score, breakdown, posição atual, sugestão de melhoria | MUST |
| RF-10 | Audit log dedicado para pin/unpin (LGPD Art. 37 — registro de operações) | MUST |

### 5.2 Frontend

| ID | RF | Prioridade |
|---|---|---|
| RF-11 | `/founder/dashboard` ganha card **"Posição no Marketplace"** com score atual + breakdown | MUST |
| RF-12 | Tooltip em cada item do breakdown explica "Como ganhar mais pontos" | MUST |
| RF-13 | Página `/admin/marketplace` (nova) para ADMIN/COMPLIANCE pinear/despinear | MUST |
| RF-14 | Home pública `/` mostra tooltip no card featured "Em destaque por: <motivo>" (quando pined) ou "Score alto" (quando auto) | MUST |
| RF-15 | Re-ordenação automática: bumping de posição NÃO depende de manter pressionado botão "refresh" | MUST |

### 5.3 Transparência

- **Cada card público** exibe `data-score` no HTML para auditores externos
- Página pública `/marketplace/algoritmo` (sem auth) explica em linguagem simples como funciona
- Cada startup tem **página `/startups/:slug/algorithm`** mostrando seu score pessoal (privado para founders)

---

## 6. Requisitos Não-Funcionais

| Categoria | Requisito |
|---|---|
| **Performance** | `GET /api/startups/featured` retorna ≤ 200ms (p99) com 23+ startups |
| **Performance** | Job de recálculo leva ≤ 60s para 1000 startups |
| **Equidade** | 3 startups pinned sempre acima das auto, mas o score ainda informa posição real dentro das auto |
| **Auditabilidade** | Toda pinning/unpinning gera AuditLog com IP + userAgent + actorId + reason (LGPD Art. 7º V) |
| **Estabilidade** | Score não muda em < 24h a menos que haja evento (upload/kyc) |
| **Detecção de abuso** | Se uma startup pinar 3x/dia ou score subir 30+ pontos/dia → alerta DPO |
| **Privacidade** | Score breakdown é visível só para o founder da startup, ADMIN e COMPLIANCE |

---

## 7. Modelo de Dados (esquemático — NÃO executar)

### Tabela `Startups` (extensão)

```prisma
model Startup {
  // ... campos existentes
  
  // NOVO: pinning manual
  manuallyPinned     Boolean   @default(false)
  manuallyPinnedBy   Int?
  manuallyPinnedAt   DateTime?
  manuallyPinnedReason String? @db.VarChar(500)
  
  // NOVO: score cache (calculado por job)
  scoreLastCalculatedAt DateTime?
  scoreBreakdown     Json?     // { cvm:20, kyc:15, funded:10, verified:10, partnership:10, engagement:10, extras:15, midia:5, redes:5 }
  
  @@index([manuallyPinned, score])
}
```

### AuditLog (já existe, adicionar action)

```prisma
// AuditLog.action enum ganha:
enum AuditAction {
  // ... existing
  PIN_STARTUP
  UNPIN_STARTUP
  SCORE_RECALCULATED
}
```

---

## 8. Fluxos de Uso

### 8.1 Founder quer saber sua posição

```
Founder login → /founder/dashboard
  → Card "Posição no Marketplace":
      "Você está em #3 de 10 na lista de Destaque (atualizado há 2h)"
      "Score atual: 75/100"
      "Breakdown: 
         - Documentos CVM: 20/20 ✅
         - KYC: 15/15 ✅
         - Campanhas concluídas: 0/10 (continue assim!)
         - Selo Verificada: 10/10 ✅
         - Engajamento: 0/10 (atingiu 45% — falta 5%)
         - Documentos extras: 15/15 ✅
         - Mídia: 0/5 (adicione vídeo no pitch!)
         - Redes sociais: 5/5 ✅"
      "Próxima recalculação: em 6h"
      Botão: "Como melhorar?"  → checklist explicativo
```

### 8.2 ADMIN pina uma startup estratégica

```
Admin login → /admin/marketplace
  → Vê lista atual de 10 featured + 3 pins disponíveis
  → Clica "Pinar" → modal:
      "Escolha a justificativa (mín. 20 chars):"
      [select: parceria-aceleradora / early-access / estratégica-comercial / outra]
      [textarea: descrição]
      → POST /admin/startups/:id/pin { reason }
  → Se já tem 3 pins: erro 409 + lista dos pins atuais
  → AuditLog + email DPO
  → Home atualiza em ≤60s (cache invalidation)
```

### 8.3 Job noturno recalcula scores

```
03:00 BRT - CronJob dispara
  → RecalculateMarketplaceScoreService.execute()
    SELECT id FROM Startup 
    WHERE status = APPROVED 
      AND EXISTS campanha OPEN ou grace period 10d
    → Para cada uma:
      - Calcula breakdown
      - UPDATE startups SET score=X, scoreLastCalculatedAt=NOW(), scoreBreakdown=Y
    → AuditLog: SCORE_RECALCULATED (N startups)
  → Alerta DPO se score mudou > 30 pontos para alguma startup
```

---

## 9. Risco e Compliance

| Risco | Mitigação |
|---|---|
| ADMIN pina startup de amigo | motivo obrigatório (≥20 chars) + DPO notificado + audit + limite 3 |
| Score mudou drasticamente (erro de cálculo) | job noturno + DPO detecta outliers (>30pt/dia) |
| Founder tenta burlar score (criar documentos fake) | Compliance valida CVM docs + KYC antifraude |
| Startup 1 abusa de pinning removendo/refazendo rápido | AuditLog tem rate-limit + alerta DPO |
| Score vaza para concorrentes | exposto só ao founder da startup, admin, compliance |

---

## 10. Métricas de Sucesso

- **% de startups com score > 50** após 30 dias → meta 70%
- **Tempo médio para founder entender seu score** → < 30s
- **% de founders que enviaram docs CVM obrigatórios** → meta 80%
- **N de startups pinned** → máx 3 (limite rígido)
- **Diversidade no Featured** → máx 1 startup por categoria em Destaque, se possível

---

## 11. Decisões em Aberto (DEC-MKT)

> **DEC-MKT-01**: Limite de 3 startups pinned é razoável? **Recomendação:** sim (3 é equilíbrio entre curadoria e justiça).  
> **DEC-MKT-02**: Score aparece público para visitantes ou só na home? **Recomendação:** só na home (em tooltip). Detalhe só para founder.  
> **DEC-MKT-03**: Quando recalcular score — só cron 03:00 ou também em eventos (upload/kyc)? **Recomendação:** ambos (eventos para agilidade + cron para correção).

---

## 12. Out-of-Scope

- ❌ Sistema de "boost" pago (startup paga para subir)
- ❌ A/B testing de variantes de algoritmo
- ❌ Personalização por perfil de investidor
- ❌ Notificação por email de mudanças de score
- ❌ "Leaderboard" público de founders

---

## 13. Próximos Passos (análise — ZERO código)

1. **Reunião** com founder (representante) + ADMIN + COMPLIANCE para fechar DEC-MKT-01..03
2. Validar pesos do score com sample real (23 startups seed)
3. Decidir se UI mostra score publico (DEC-MKT-02)
4. Mapear impactos: 8 campos novos no schema? Migration aditiva (sim)
5. Apenas **depois** disso, gerar tasks técnicas no `todo/todo.json` (MKT-01..MKT-08)

---

## 14. Referências Investigadas

- `backendnode/src/api/marketplace/marketplace.service.ts` (Featured + Recently-added + Opportunities)
- `backendnode/src/api/startup/service/startup-query.service.ts:findByMarketplaceSection` (filtros por seção: featured/verified/accelerated/approval)
- `backendnode/src/api/startup/startup.controller.ts:@Get('marketplace/featured|verified|accelerated|approval|all')`
- `backendnode/src/api/admin/admin.service.ts:525-565` (cálculo de compliance score KYC-based)
- `backendnode/src/api/admin/admin.service.ts:updateStartupScore` (PATCH manual)
- `backendnode/src/api/admin/admin-other.controller.ts:@Patch(':id/score')` (endpoint admin)
- `backendnode/prisma/seeds/blueprints.ts:99-756` (22 blueprints com score de 0..92 hardcoded)
- `backendnode/prisma/schema.prisma:Startups:score` + `isAccelerated` (já existem)
- `backendnode/prisma/schema.prisma:Seal` + `StartupSeal` + `SealCategory` (já existem)
- `finance_config` (marketplace.featured_limit, opportunities_limit, recent_limit)
- `frontend/app/routes/api/startups-featured.ts` (BFF para home)
- `frontend/app/components/landing/featured-rounds.tsx` + `recently-added.tsx` + `opportunities.tsx`

---

**Versão:** 0.1 (Análise — 2026-08-17)
**Próxima revisão:** Após DEC-MKT-01..03 fechadas
