# PRD 3 — Painel do Compliance: Revisão de Startups e Campanhas

**Data:** 15/08/2026  
**Última revisão:** 2026-08-15 (gaps de coerência corrigidos)  
**Autor:** Agente IA  
**Status:** Rascunho (revisado)  
**Prioridade:** Alta  
**Módulo:** Frontend + Backend — Compliance  

---

## Histórico de Revisões

| Data | Mudança |
|------|---------|
| 2026-08-15 | Correções aplicadas: (1) §2.2 revisado — `PENDING_REVIEW`/`NEEDS_REVISION` **NÃO adicionados** ao enum `CampaignStatus` (mantém-se 6 status); revisão de compliance é tratada por `complianceFeedback` em vez de status novo; (2) §1 — adicionado `/compliance/repasses` à lista "Hoje existe"; (3) §6.1 — contratos backend detalhados (`/admin/startups/:id/{campaigns,timeline,data-change-requests,documents}`); (4) §5 + §10 — distinção explícita entre o que `notifications/*` JÁ provê (READ API) e o que FALTA implementar (emissor + templates Compliance); (5) §7.1 — adicionados `GET /admin/compliance/campaigns` (lista) e `GET /admin/startups/:id/documents` (presigned URLs); (6) §4.3 — cita módulo `termo-adesao` como base; (7) §10 — meta-referência corrigida (`§2.2` em vez de `§7.1`). |

---

## 1. Contexto

O compliance officer é responsável por revisar e aprovar startups e suas campanhas de captação antes de ficarem disponíveis no marketplace. Hoje existe:

- `/compliance/dashboard` — KPIs e atalhos (funcionando)
- `/compliance/users` — Lista de usuários KYC com decisão
- `/compliance/user-detail/:id` (com 9 abas — identidade, endereço, kyc, investimentos, campanhas, notas-selos, auditoria, startups, etc)
- `/compliance/startups` — Lista de startups com filtro (funcionando)
- `/compliance/startups/:id` — Detalhe de startup com decisão Aprovar/Rejeitar (funcionando)
- `/compliance/campaigns` — **STUB vazio** (não implementado — 29 linhas, `data: []` hardcoded)
- `/compliance/change-requests` — Revisão de alterações de dados bloqueados (funcionando — usa `DataChangeRequest`)
- `/compliance/seals` — Gerenciamento de selos (funcionando)
- `/compliance/repasses` — Déliberation de quantidade de parcelas + repasse (`CompliancePanel` criado na sprint FIN-11) ✅ NOVO

**Necessidade:** Criar uma experiência completa onde o compliance veja todas as informações preenchidas pelo founder, avalie campanhas individualmente, e tenha um fluxo estruturado de revisão com notificações.

---

## 2. Fluxo de Revisão

### 2.1 Fluxo Atual (Startup)

```
Founder preenche dados → Status: PENDING_CURATOR_REVIEW
     ↓
Compliance acessa /compliance/startups/:id
     ↓
[Aprovar] → Status: APPROVED (startup elegível para marketplace quando campanha OPEN)
[Rejeitar] → Status: REJECTED (founder pode corrigir e ressubmeter)
```

### 2.2 Fluxo da Campanha (decisão revisada 2026-08-15)

```
Founder configura captação → Campanha: DRAFT
     ↓
Founder submete (action: SUBMIT_FOR_REVIEW) → complianceFeedback: null, submittedAt: now()
     ↓
Compliance acessa /compliance/campaigns/:id
     ↓
[Aprovar]         → Campanha: OPEN  (disponível no marketplace)
[Solicitar Revisão] → Campanha: DRAFT  + complianceFeedback: "<motivo>"  (founder notificado, mantém status DRAFT)
[Rejeitar]        → Campanha: REJECTED  + rejectionReason: "<motivo>"
```

> **Decisão arquitetural revisada:** **NÃO** adicionar `PENDING_REVIEW` nem `NEEDS_REVISION` ao enum `CampaignStatus`. Mantém-se os 6 status atuais (`DRAFT, OPEN, PAUSED, CLOSED, FUNDED, PAID_OUT`).
>
> **Justificativa:**
> 1. `CampaignStatus` representa **o estado operacional** da campanha (rascunho, aberta, pausada, encerrada, financiada, paga). O "workflow de compliance" é um **conceito ortogonal** — não deve ser acoplado a esse enum para evitar cardinalidade inflada (Adicionar 2 valores iria quebrar invariantes testadas em `campaigns-state.service.spec.ts:112-125` e outros).
> 2. `DRAFT` **já** significa "pendente de compliance" implicitamente.
> 3. `REJECTED` + ressubmissão (founder corrige + reenvia) **já** cobre o caso "needs revision" semanticamente.
> 4. O **comentário da revisão** (`complianceFeedback`) é o que de fato diferencia uma campanha DRAFT "sendo editada" vs DRAFT "aguardando compliance corrigir apontamentos". Esse campo é o que precisa ser exposto no painel.
>
> **Campos Prisma a adicionar (sem mexer no enum):**
> ```prisma
> model Campaign {
>   // ... campos existentes ...
>
>   // === REVIEW DE COMPLIANCE (SPRINT COMP-01) ===
>   complianceFeedback        String?   @db.Text  // apontamentos mais recentes do compliance
>   complianceApprovedAt     DateTime?            // quando compliance aprovou (transição DRAFT → OPEN)
>   complianceApprovedByUserId Int?               // quem aprovou (FK User)
>   complianceReviewedAt      DateTime?            // última vez que compliance interagiu
>   complianceReviewedByUserId Int?               // quem interagiu (FK User)
> }
> ```
>
> **Backend:** método `submitForReview(campaignId, userId)` que setta `submittedAt=now` (campo já existe em `createdAt`) + emite notificação in-app ao Compliance; método `decide(campaignId, decision, feedback, userId)` que transiciona `DRAFT → {OPEN, REJECTED}` (ou `DRAFT` permanente se `NEEDS_REVISION`) + setta campos `compliance*`.

---

## 3. Nova Página: Lista de Campanhas (`/compliance/campaigns`)

### 3.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  CAMPANHAS EM REVISÃO                                           │
│  ─────────────────────                                          │
│                                                                 │
│  [Filtros: Todas | Pendentes | Revisão | Aprovadas | Rejeitadas]│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [Logo] TechInnovate                                     │    │
│  │        Campanha #1 · Criada: 10/08/2026                 │    │
│  │        Meta: R$ 500.000 · Tokens: 10.000 · R$ 50/token │    │
│  │        Status: ⏳ Pendente de Revisão                    │    │
│  │                                    [Revisar →]          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [Logo] GreenEnergy                                      │    │
│  │        Campanha #2 · Criada: 05/08/2026                 │    │
│  │        Meta: R$ 1.000.000 · Tokens: 20.000 · R$ 50/tok │    │
│  │        Status: ✅ Aprovada em 07/08/2026                │    │
│  │                                    [Ver detalhes →]     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Nova Página: Detalhe da Campanha (`/compliance/campaigns/:id`)

### 4.1 Estrutura por Abas

| Aba | Conteúdo | Fonte de dados |
|-----|----------|----------------|
| **Visão Geral** | Dados financeiros (meta, valuation, tokenPrice, equity), prazo, progresso (tokensSold/totalTokens) | `Campaign.*` |
| **Tese de Investimento** | Problema, solução, diferencial, modelo receita, mercado-alvo | `Campaign.{problema,solucao,diferencial,modeloReceita,mercadoAlvo}` |
| **Governança** | Sócios, dedicação, compradores, concorrência, investimento prévio | `Startup.{socios,teams,uso_recursos}` + `Campaign.{dedicacao,compradores,investimentoPrevio,concorrencia}` |
| **Recursos** | Distribuição dos recursos (% por categoria) | `CampaignResourceAllocation[]` |
| **Retornos** | Participação nos lucros, benefícios adicionais | `Campaign.{participacaoLucros,faturamentoMinimoLucros,beneficiosAdicionais,beneficiosDescricao}` |
| **Startup** | Link para dados cadastrais da startup (nome, CNPJ, etc.) | `Link para /compliance/startups/:id` |
| **Histórico** | Timeline de alterações, aprovações, rejeições anteriores | `AuditLog` filtrado por `entity=Campaign,entityId=:id` |
| **Termo de Adesão** | Status do termo de adesão digital | `useTermoAdesaoStatus` (já implementado, falta agregar em painel compliance) |

**Nota:** Backend JÁ tem módulo `termo-adesao/*` + `useTermoAdesaoStatus` no frontend. Compliance precisa consultar `Campaign.aceiteTermoRepasse` + (futuro) endpoint dedicado `GET /admin/compliance/campaigns/:id/termo-adesao-status` que retorna assinatura digital + serial + hash.

### 4.2 Painel de Decisão (lateral ou footer fixo)

```
┌─────────────────────────────────────────────────────────────────┐
│  DECISÃO                                                        │
│  ─────────                                                      │
│                                                                 │
│  Checklist de conformidade:                                     │
│  [✓] Meta de captação dentro dos limites                        │
│  [✓] Valuation justificado                                      │
│  [✓] Documentação completa                                      │
│  [✓] Uso de recursos detalhado (soma = 100%)                    │
│  [✓] Dados bancários verificados                                │
│  [✓] Termos de adesão assinados                                 │
│                                                                 │
│  Observações (opcional para [Aprovar], OBRIGATÓRIO para outros):│
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [textarea]                                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [████ APROVAR ████]  [Solicitar Revisão]  [Rejeitar]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Validação do formulário:**
- [Aprovar]: observação **opcional** (Compliance pode só aprovar sem justificar)
- [Solicitar Revisão]: observação **obrigatória** (vai para `complianceFeedback`) — min 10 chars, max 1000
- [Rejeitar]: observação **obrigatória** (vai para `rejectionReason`) — min 10 chars, max 1000

### 4.3 Checklist de Conformidade (sugerido)

| Item | Verificação | Já implementado? |
|------|-------------|-----------------|
| Meta de captação | Dentro dos limites regulatórios (CVM 88: até R$ 15M/ano — ver `SystemConfig.REGULATORY_MAX_RAISE_ANNUAL`) | Backend tem `SystemConfig` com chaves financeiras |
| Valuation | Coerente com estágio da startup (`Startup.etapa` ↔ faixa de valuation esperada) | Validação manual |
| Token price | Coerente com meta ÷ totalTokens (validação aritmética) | Backend pode implementar validação automática |
| Uso de recursos | Soma = 100%, sem categoria zerada | ✅ Validado em `RoundResourcesEditor` (UI founder); compliance só **visualiza** |
| Documentação | Pitch deck, contrato social presentes (lista de uploads da startup via presigned URLs) | ⚠️ Endpoint `GET /admin/startups/:id/documents` proposto em §6.1 |
| Dados bancários | Preenchidos e verificados (`Startup.banco/agencia/conta/digito/tipo_conta/pix_key/titular/documento_titular`) | Backend já tem campos; UI Compliance precisa adicionar seção |
| Termos de adesão | Assinados digitalmente (verificar `Campaign.aceiteTermoRepasse` + `useTermoAdesaoStatus` + serial cert) | ✅ Backend `termo-adesao/*` completo (FIN-09 não mexeu, é módulo S18); faltava expor no painel Compliance |
| Conflitos de interesse | Nenhum identificado (`Startup.socios[]` × `User.id` que é compliance — check futuro) | Validação manual via `DataChangeRequest` |

---

## 5. Notificações e Emails

> **Revisão 2026-08-15:** Distinção clara entre o que `notifications/*` JÁ provê (READ API genérica) vs o que FALTA para este PRD (emissor de eventos + templates Compliance). Email sim, Nodemailer já configurado, templates Compliance ainda não.

### 5.1 Eventos que Geram Notificação

| Evento | Para Quem | Canal | Implementado? |
|--------|-----------|-------|---------------|
| Campanha submetida para revisão | Compliance | Email + Notificação in-app | ⚠️ Backend notifications READ OK; falta emissor + template |
| Campanha aprovada | Founder | Email + Notificação in-app | ⚠️ idem |
| Campanha precisa de revisão | Founder | Email + Notificação in-app | ⚠️ idem |
| Campanha rejeitada | Founder | Email + Notificação in-app | ⚠️ idem |
| Alteração de dados solicitada | Compliance | Notificação in-app | ⚠️ `DataChangeRequest` JÁ existe; falta integração emissor |
| Alteração aprovada | Founder | Email + Notificação in-app | ⚠️ idem |

**Implementação proposta (sprint COMP-01):**
- **Backend:** módulo `compliance-events.module.ts` que registra listeners via `@nestjs/event-emitter` para `campaign.submitted`, `campaign.approved`, `campaign.needs_revision`, `campaign.rejected`, `data-change-request.created` — cada listener chama `notificationsService.create({...})` + `emailService.send(template, ...)` 
- **Templates:** `email/compliance-events/{campaign-submitted,campaign-approved,campaign-needs-revision,campaign-rejected,data-change-approval}.template.ts` — renderizam Handlebars com variáveis `{ startupNome, campaignNome, actionLabel, ctaUrl }`
- **Frontend:**Aproveitar `useNotificationsPageQueryOptions` (já existe em `frontend/app/lib/queries.ts`) para bell icon de Compliance notifications, sem necessidade de UI nova

### 5.2 Template de Email (estrutura)

**Assunto:** `[iSelfToken] Sua campanha {ação} — {nome da startup}`

**Corpo:**
- Saudação personalizada
- Nome da startup + campanha
- Status atual
- Se revisão: motivo/observação do compliance (do campo `complianceFeedback`)
- CTA: "Acessar plataforma" → `link para startupComplianceContextual` ou fundador dashboard
- Aviso LGPD (link para política + canal de privacidade)

---

## 6. Ajustes na Página Existente (`/compliance/startups/:id`)

> **Revisão 2026-08-15:** Detalhamento dos contratos backend propostos para cada item (estavam vagos no rascunho original).

### 6.1 Melhorias Propostas

O detalhe de startup atual já é funcional, mas precisa:

1. **Aba "Campanhas" (dentro do detalhe da startup):**
   - Lista todas as campanhas da startup (não apenas a atual)
   - Mostra progresso, tokensSold, meta, `dataCriacao`, status
   - Link para `/compliance/campaigns/:id` (detalhe individual)

   **Backend:** `GET /admin/startups/:id/campaigns` → retorna `{ campaigns: [{ id, title, status, targetAmount, totalTokens, tokensSold, deadline, createdAt, complianceApprovedAt }] }`. Endpoint NOVO; aproveitar Service existente para mapear.

2. **Aba "Histórico" (timeline):**
   - Quando foi submetida cada campanha
   - Quando foi aprovada/rejeitada cada campanha
   - Ressubmissões
   - Decisões do compliance
   - DataChangeRequests criados/aprovados

   **Backend:** `GET /admin/startups/:id/timeline` → retorna `{ events: [{ timestamp, action, entity, entityId, userId, userName, details }] }` agregado via `prisma.auditLog.findMany({ where: { OR: [{ entity: 'Startup', entityId: :id }, { entity: 'Campaign', entityId: { in: campaignIds } }] } })`. Endpoint NOVO; validação manual da ordem cronológica.

3. **Aba "Documentos" (uploads com presigned URLs):**
   - Lista todos os uploads da startup (pitch deck, contrato social, documentos CVM)
   - Cada item: `originalName`, `mimeType`, `size`, `presignedUrl` (TTL 7d — aproveita `UploadService.getPresignedUrl`)

   **Backend:** `GET /admin/startups/:id/documents` → retorna `{ uploads: [{ id, publicId, originalName, mimeType, sizeBytes, url, expiresAt }] }`. Reaproveita `uploads/*` module (já funcional).

4. **Aba "Dados Bancários" (visíveis para compliance):**
   - Mostra `banco`, `agencia`, `conta`, `digito`, `tipo_conta`, `pix_key`, `titular`, `documento_titular`
   - Só aparece para compliance (NÃO público) — gating via `ComplianceGuard`
   - **NÃO armazena em logs/audit eventos** (LGPD: dados bancários são sensíveis mas empresariais; manter em apenas 1 lugar física)

5. **Aba "Termo de Adesão" (assinatura digital):**
   - Status do termo (`aceito`, `pendente`, `rejeitado`, `expirado`)
   - Data de assinatura
   - Serial do certificado
   - Hash SHA-256 do PDF
   - Link para download do PDF assinado (presigned URL)
   - QR code de verificação (`/verificar/:documentId`, rota pública S18.5)

   **Backend:** `GET /admin/startups/:id/termo-adesao` (NÃO existe ainda — proposto) ou aproveitar endpoint existente `useTermoAdesaoStatus` (fundador) se possível cross-role.

---



## 7. Impacto Técnico

> **Revisão 2026-08-15:** Schema Prisma NÃO precisa adicionar status novos (ver §2.2). Endpoints detalhados para o que compliance precisa ver.

### 7.1 Backend — Sprint `COMP-01`

| Alteração | Detalhe | Status |
|-----------|---------|--------|
| Schema Prisma | Adicionar campos `complianceFeedback`, `complianceApprovedAt`, `complianceApprovedByUserId`, `complianceReviewedAt`, `complianceReviewedByUserId` em `Campaign` (NÃO mexer no enum) | Migration nova |
| Schema Prisma | Adicionar campos `aceiteTermoAdesao CampaignAceiteStatus` + `termoAdesaoSerial String?` em `Campaign` se ainda não houver (verificar) | Possível migration |
| Novo endpoint | `GET /admin/compliance/campaigns?status=...&search=...&page=...&limit=...` (lista com filtros) | NOVO |
| Novo endpoint | `GET /admin/compliance/campaigns/:id` (detalhe completo com includes aninhados) | NOVO |
| Novo endpoint | `POST /admin/compliance/campaigns/:id/submit` (founder submete para review — setta `submittedAt`, emite notificação) | NOVO |
| Novo endpoint | `POST /admin/compliance/campaigns/:id/decide` Body: `{ decision: 'APPROVE'\|'NEEDS_REVISION'\|'REJECT', feedback: string }` (transição + feedback + AuditLog) | NOVO |
| Endpoints auxiliares | `GET /admin/startups/:id/{campaigns, timeline, data-change-requests, documents, termo-adesao}` | NOVO (ver §6.1) |
| Notificações | Módulo `compliance-events.module.ts` escuta 6 eventos via `@nestjs/event-emitter`, chama `notificationsService.create()` + `emailService.send()` | NOVO mas reusa infra |
| Audit log | Já existe modelo `AuditLog` — service já existe — **apenas registrar** com `action: 'CAMPAIGN_SUBMITTED'\|'CAMPAIGN_APPROVED'\|'CAMPAIGN_NEEDS_REVISION'\|'CAMPAIGN_REJECTED'` + `entity: 'Campaign' + entityId` + `userId` + `ip` | Já pronto |
| Email templates | `email/compliance-events/{campaign-submitted,campaign-approved,campaign-needs-revision,campaign-rejected,data-change-approval}.template.ts` (Handlebars) | NOVO |
| LGPD | `rejectionReason` e `complianceFeedback` são internos (NÃO PII); Zero logs de `user.cpf/email/phone` em emails/events (validar com checklist FIN-12 já criado) | Audit script |

### 7.2 Frontend — Sprint `COMP-01`

| Arquivo | Alteração | Status |
|---------|-----------|--------|
| `routes/private/compliance-campaigns.tsx` | **REESCREVER** (hoje é stub de 29 linhas) — implementar lista com filtros reais (Todas / Pendentes / Revisão / Aprovadas / Rejeitadas) | REESCRITA |
| `routes/private/compliance-campaign-detail.tsx` | **NOVO** — Detalhe com 8 abas (Visão Geral, Tese, Governança, Recursos, Retornos, Startup, Histórico, Termo) + painel de decisão no footer | NOVA |
| `routes.ts` | Registrar nova rota `compliance/campaigns/:id` | ATUALIZAR |
| `routes/private/compliance-startup-detail.tsx` | Adicionar 4 novas abas (Campanhas, Histórico, Documentos, Termo de Adesão) — backend endpoints propostos em §6.1 | ATUALIZAR |
| `components/layout/sidebar.tsx` | Já existe link "Campanhas" no menu COMPLIANCE ✅ — **NÃO mexer** | INTOCADO |
| `components/compliance/` | Pasta JÁ tem `compliance-user-detail-*`; **criar**: `campaigns-list-card.tsx`, `campaign-decision-panel.tsx`, `campaign-tabs-shell.tsx`, `compliance-feedback-banner.tsx`, `document-list.tsx`, `termo-adesao-card.tsx`, `timeline-event.tsx`, `data-change-request-list.tsx` | NOVOS |

### 7.3 API Routes (BFF) — Sprint `COMP-01`

| Rota | Proxy para |
|------|-----------|
| `GET /api/compliance/campaigns` | `GET /admin/compliance/campaigns` |
| `GET /api/compliance/campaigns/:id` | `GET /admin/compliance/campaigns/:id` |
| `POST /api/compliance/campaigns/:id/submit` | `POST /admin/compliance/campaigns/:id/submit` (founder) |
| `POST /api/compliance/campaigns/:id/decide` | `POST /admin/compliance/campaigns/:id/decide` (compliance) |
| `GET /api/admin/startups/:id/campaigns` | `GET /admin/startups/:id/campaigns` |
| `GET /api/admin/startups/:id/timeline` | `GET /admin/startups/:id/timeline` |
| `GET /api/admin/startups/:id/documents` | `GET /admin/startups/:id/documents` |
| `GET /api/admin/startups/:id/termo-adesao` | `GET /admin/startups/:id/termo-adesao` (ou reuso do founder existente) |

---

## 8. Critérios de Aceite

- [ ] **AC-01:** Página `/compliance/campaigns` lista campanhas com filtros por status (`DRAFT` / `OPEN` / `PAUSED` / `CLOSED` / `FUNDED` / `PAID_OUT`)
- [ ] **AC-02:** Cada item mostra: startup, meta, tokens, preço token, status, data criação
- [ ] **AC-03:** Botão "Revisar" leva ao detalhe da campanha (`/compliance/campaigns/:id`)
- [ ] **AC-04:** Detalhe da campanha mostra todas as 8 abas (Visão Geral, Tese, Governança, Recursos, Retornos, Startup, Histórico, **Termo de Adesão**)
- [ ] **AC-05:** Painel de decisão com 3 ações: Aprovar, Solicitar Revisão, Rejeitar
- [ ] **AC-06:** Observação **opcional** para [Aprovar], **obrigatória** (≥10 chars) para [Solicitar Revisão] e [Rejeitar]
- [ ] **AC-07:** Ao aprovar, campanha muda para `OPEN` e startup aparece no marketplace (preserva `closedAt` imutável)
- [ ] **AC-08:** Ao solicitar revisão, campanha **permanece** em `DRAFT` + `complianceFeedback` populado; founder recebe email + notificação in-app
- [ ] **AC-09:** Timeline/histórico de decisões visível no detalhe (audit log agregado)
- [ ] **AC-10:** Dados bancários da startup visíveis para compliance (em aba dedicada, com gating `ComplianceGuard`)
- [ ] **AC-11:** Documentos (pitch deck, etc.) acessíveis/baixáveis via presigned URLs (TTL 7d)
- [ ] **AC-12:** Checklist de conformidade funcional (mesmo que visual, sem regras duras na v1)
- [ ] **AC-13 (NOVO):** Validador de soma 100% no `uso_recursos` é exposto no painel (apenas visual — backend JÁ valida na escrita do founder)
- [ ] **AC-14 (NOVO):** Validador `tokenPrice × totalTokens = targetAmount` (arithmetic consistency) é exibido warning na aba Visão Geral
- [ ] **AC-15 (NOVO):** LGPD audit script valida que NENHUM payload de notificação/email inclui `user.cpf/email/phone` (extension de `repasse-LGPD-checklist.md`)
- [ ] **AC-16 (NOVO):** `Campaign.aceiteTermoRepasse = true` é exigido para aprovar (gate `complianceEventsService.decide()` rejeita se falso — regra dura)

---

---

## 9. Fora de Escopo

- **EXT-01: Prorrogação de campanha** pelo compliance (`POST /campaigns/:id/extend`) — escopo de sprint futura (ver PRD 1 §2.4 → renomeado para `EXT-01` na revisão 2026-08-15). Contrato e regras já documentados.
- **Notificações fora do escopo Compliance**: notificações para Founder/Investidor sobre campanhas aprovadas serão geradas via Compliance (eventos); notificações sobre pré-aprovação Founder (envio de documentos, etc.) ficam para PRD separado
- **Dashboard KPIs do compliance** — já existe em `/compliance/dashboard`; **manter** (não duplicar)
- **Gerenciamento de selos** — já existe em `/compliance/seals`; **manter**
- **DataChangeRequests listing** — já existe em `/compliance/change-requests`; **integração** com aba Histórico de startup está em §6.1
- **Sistema interno de Anti-fraude / Conflitos de interesse** — fora deste PRD (pode ser PRD separado)

---

## 10. Dependências

> **Revisão 2026-08-15:** Enum `CampaignStatus` **NÃO precisa ser atualizado** (ver §2.2). Notificações in-app existem como READ API mas faltam emissor + templates. Tabela mais explícita sobre o que está pronto vs o que falta.

| Dependência | Status Real | Sprint destino |
|-------------|-------------|-----------------|
| Enum `CampaignStatus` | **INTOCADO** (manter 6 status) | N/A |
| Campos Prisma auxiliares em `Campaign` | NOVO: requer migration adicionando `complianceFeedback`, `complianceApprovedAt`, etc. | COMP-01 |
| Sistema de notificações — READ API | Já existe (`notifications/*` controller) | ✅ |
| Sistema de notificações — EMISSOR | **FALTA**: módulo `compliance-events` precisa ser criado escutando `@nestjs/event-emitter` | COMP-01 |
| Sistema de notificações — UI bell icon | `useNotificationsPageQueryOptions` já existe em `frontend/app/lib/queries.ts` | ✅ |
| Sistema de email — Nodemailer | Já configurado | ✅ |
| Sistema de email — Templates Compliance | **FALTA**: 5 templates Handlebars | COMP-01 |
| Audit log — model e service | Já existe (`AuditLog` model + service) | ✅ |
| Audit log — Coverage Compliance | **PARCIAL**: actions `CAMPAIGN_*` precisam ser registradas no service | COMP-01 |
| Termo de adesão — módulo | ✅ existe (`termo-adesao/*` controller, service, PKI integrada) | ✅ |
| Termo de adesão — UI em painel compliance | **FALTA**: precisa criar card/abas específicas | COMP-01 |
| Repasses (`/compliance/repasses`) | ✅ entregue em FIN-11 (decisão de Compliance sobre quantidade de parcelas) | ✅ pronto |
| LGPD — checklist Compliance | **FALTA**: novo `compliance-events-LGPD-checklist.md` (espelho do `repasse-LGPD-checklist.md` de FIN-12) | COMP-01 |
