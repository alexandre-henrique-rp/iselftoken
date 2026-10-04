# Admin Startup Pages — Design Document

**Data:** 2026-09-15
**Páginas:** `/admin/startups` (lista) · `/admin/startups/:id` (detalhe)
**Stack:** React Router 7 (SSR) · Tailwind 4 · shadcn/ui · TanStack Query 5
**Design tokens:** `app/styles/theme.css` — Kinetic Architecture (magenta `#d500f9` · preto puro)

---

## 1. Design Tokens (excerpt)

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#d500f9` | Ações, badges, foco, CTAs |
| `--color-background` | `#000000` | Fundo da app |
| `--color-card` | `#0a0a0a` | Superfície de cards |
| `--color-on-surface` | `#f5f5f5` | Texto principal |
| `--color-muted-foreground` | `#9ca3af` | Texto secundário, labels |
| `--color-danger` | `#ef4444` | Rejeição, erros |
| `--color-warning` | `#fbbf24` | Em análise |
| `--color-success` | `#34d399` | Aprovado (em contextos financeiros) |
| `--radius-3xl` | `2rem` | Bordas dos cards |
| Font | `Inter Variable` | Toda a tipografia |
| Glass | `bg-card/80 + blur` | Cards sobre watermark |

### Status Badge Colors

| Status | BG | Text | Border |
|---|---|---|---|
| Aprovada | `bg-primary/10` | `text-primary` | `border-primary/20` |
| Em análise | `bg-warning/10` | `text-warning` | `border-warning/20` |
| Rejeitada | `bg-destructive/10` | `text-destructive` | `border-destructive/20` |

---

## 2. `/admin/startups` — Lista de Startups

### 2.1 Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│  ═══  Gestão do ecossistema                                        │
│  GESTÃO DE STARTUPS                                                │
│  Acompanhe cadastros, revise a curadoria e mantenha a vitrine      │
│  do ecossistema organizada.                                        │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─ FILTROS (GET form) ─────────────────────────────────────────┐  │
│  │ Pesquisa [____]  Status [___▼]  Segmento [___▼]  [Aplicar][⟳]│  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌─ CONTEÚDO (4 estados) ──────────────────────────────────────┐  │
│  │                                                                │  │
│  │  LOADING:   skeleton table (6 linhas, 7 colunas)             │  │
│  │  ERROR:     alert + ícone + "Tentar novamente"              │  │
│  │  EMPTY:     ícone + mensagem + CTA "Limpar filtros"          │  │
│  │  DATA:      table responsiva + paginação                     │  │
│  │                                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes

| Component | File | Lines | Role |
|---|---|---|---|
| `AdminStartupHeader` | `admin-startup-header.tsx` | 19 | Eyebrow + h1 + subtitle |
| `AdminStartupFilters` | `admin-startup-filters.tsx` | 156 | Filtros GET: search, status, segmento |
| `AdminStartupsContent` | `admin-startups-content.tsx` | 101 | Shell: 4 estados (loading/error/empty/data) |
| `AdminStartupTable` | `admin-startup-table.tsx` | 478 | Tabela responsiva + ações + 3 modais |
| `AdminStartupTableSkeleton` | `admin-startup-table-skeleton.tsx` | 90 | Skeleton sem zeros fabricados |
| `AdminStartupEmptyState` | `admin-startup-empty-state.tsx` | 65 | 2 variantes (sem/com filtros) |
| `AdminStartupDialogs` | `admin-startup-dialogs.tsx` | 325 | Modais: editar, rejeitar, selos |
| **Route shell** | `admin-startups.tsx` | 47 | Meta + loader + layout (✅ ≤40) |

### 2.3 Tabela — Colunas

| Coluna | Desktop | Mobile card | Tipo |
|---|---|---|---|
| ID | `#000123` (mono, primary) | Logo + `#000123` | mono |
| Startup | Nome + logo/initials | Nome + badge status | text |
| Fundador | Nome (truncate) | Fundador: Nome | muted |
| Segmento | Chip (lg+) | Segmento: texto | badge |
| Status | Badge colorido | Badge colorido | badge |
| Cadastro | DD/MM/AA | Cad: DD/MM/AA | date |
| Ações | 5 ícones (👁 ✏️ 🛡 ✅ ❌) | 5 ícones | actions |

### 2.4 Ações por linha

| Ícone | Ação | Condição | Modal |
|---|---|---|---|
| 👁 | Ver detalhes | Sempre | Link → `/admin/startups/:id` |
| ✏️ | Editar | Sempre | Editar Startup (nome, segmento, estágio, score) |
| 🛡 | Gerenciar selos | Sempre | Selos (catálogo + assign/remove) |
| ✅ | Aprovar | `status ∈ {pending, em_analise}` | Inline form (POST) |
| ❌ | Rejeitar | `status ∈ {pending, em_analise}` | Rejeitar (motivo obrigatório) |

### 2.5 Filtros

| Campo | Tipo | Opções | Comportamento |
|---|---|---|---|
| Pesquisa | `search` input | Texto livre | On submit (não real-time) |
| Status | `select` | Todos, Em análise, Aprovada, Rejeitada | On change (auto-submit) |
| Segmento | `select` | 12 segmentos (Fintech, SaaS, AI, etc.) | On change (auto-submit) |
| Aplicar | `submit` button | — | Primary CTA (glow) |
| Limpar | `button` | — | Navigate to `/admin/startups` (rotate icon) |

### 2.6 Paginação

| Elemento | Estilo |
|---|---|
| Anterior | `◀` icon button, disabled na p1 |
| Página atual | `bg-primary text-black` pill |
| "de X" | `text-muted-foreground uppercase tracking-widest` |
| Próxima | `▶` icon button, disabled na última |
| Info | "Mostrando 1–3 de 3 startups" |

### 2.7 Modais (AdminStartupDialogs)

#### Editar Startup
- **Trigger:** ✏️ button
- **Tamanho:** `max-w-md`
- **Campos:** Nome (required), Segmento, Estágio, Score (0–100, number)
- **Hidden:** `startupId`, `intent: edit-startup`
- **Botões:** Cancelar / Salvar (primary)

#### Rejeitar Startup
- **Trigger:** ❌ button (apenas pendente)
- **Tamanho:** `max-w-md`
- **Campos:** Motivo (textarea required, min 1 linha, placeholder: "Ex.: documentação societária incompleta…")
- **Hidden:** `startupId`, `intent: reject-startup`
- **Botões:** Cancelar / Confirmar rejeição (destructive)
- **Validação:** Zod no server action (min 20 chars — veja `POST /admin/startups/:id/pin` pattern)

#### Selos da Startup
- **Trigger:** 🛡 button
- **Tamanho:** `max-w-lg`, scrollável (`max-h-[85vh]`)
- **Conteúdo:** Lista catálogo de selos (name + category), cada um com Aplicar/Remover toggle
- **Badge contador:** Selos atribuídos mostrados no 🛡 icon (badge red com count)
- **Hidden:** `startupId`, `intent: assign-seal|remove-seal`, `sealSlug|sealId`

### 2.8 Estados de loading / error / empty

| Estado | Indicador | CTA |
|---|---|---|
| Loading | Skeleton table (6 placeholder rows, pulse, zero dados reais) | — |
| Error | `AlertCircle` icon + "Não foi possível carregar startups" | "Tentar novamente" |
| Empty (sem filtros) | `Rocket` icon + "Nenhuma startup cadastrada" | — |
| Empty (com filtros) | `Rocket` icon + "Nenhuma startup encontrada" | "Limpar filtros" |

---

## 3. `/admin/startups/:id` — Detalhe da Startup

### 3.1 Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│  ← Voltar à gestão de startups         AdminStartupHeader           │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─ Coluna principal (2/3) ──────────────────────────────────────┐ │
│  │                                                                │ │
│  │  ┌─ IDENTIDADE ───────────────────────────────────────────┐  │ │
│  │  │ [Logo/Iniciais]  Nome da Startup                       │  │ │
│  │  │          Razão Social    Badge Status   Badge Área     │  │ │
│  │  │          Score: XX                                     │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌─ INFORMAÇÕES CADASTRAIS ──────────────────────────────┐  │ │
│  │  │  ID interno · CNPJ · Área · Estágio · Fundação · Cadastro  │ │
│  │  └────────────────────────────────────────────────────────────┘ │ │
│  │                                                                │ │
│  │  ┌─ CONTATO (conditional) ──────────────────────────────┐  │ │
│  │  │  Site · Email · Telefone (se existirem)              │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌─ DADOS BANCÁRIOS (conditional) ──────────────────────┐  │ │
│  │  │  Banco · Tipo Conta · Agência/Conta · PIX · Titular  │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌─ FUNDADOR ───────────────────────────────────────────┐  │ │
│  │  │  Nome · Email · ID do Fundador                       │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌─ CAMPANHAS (conditional) ──────────────────────────┐  │ │
│  │  │  Lista: Nome · Status · Meta (formatBRLCompact)    │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌─ PITCH & NEGÓCIO (conditional) ────────────────────┐  │ │
│  │  │  Descrição · Problema · Solução · Modelo Receita ·   │  │ │
│  │  │  Diferencial · Mercado-alvo · + 8 campos           │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌─ BENEFÍCIOS & LUCROS (conditional) ────────────────┐  │ │
│  │  │  Oferece lucros/benefícios + descrições             │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌─ ESTRUTURA (conditional, JSON) ────────────────────┐  │ │
│  │  │  Sócios · Times · Uso dos recursos (pre formatado) │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌─ DOCUMENTOS ───────────────────────────────────────┐  │ │
│  │  │  [Logo] [Cover] [MIE] [Contrato Social] [CNPJ]    │  │ │
│  │  │  (DocumentThumbnails com modal preview)            │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌─ DETALHES DAS CAMPANHAS (conditional) ────────────┐  │ │
│  │  │  Per-campaign: Status · Meta · Mín · Valuation ·   │  │ │
│  │  │  Preço/token · Deadline (grid 2 colunas)           │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  ┌─ Colateral (1/3) ──────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  ┌─ RESUMO ─────────────────────────────────────────────┐ │ │
│  │  │  Status · Segmento · Estágio · Score · Fundada em    │ │ │
│  │  │  Campanhas: N · CNPJ (masked: 12.345.xxx/xxxx-xx)   │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                                │ │
│  │  ┌─ DETALHES AVANÇADOS ───────────────────────────────┐ │ │
│  │  │  → Perfil completo (Compliance)                     │ │ │
│  │  │    7 abas: documentos, KYC, campanhas, etc.         │ │ │
│  │  │    Link: /compliance/startups/:id                   │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Componentes inline / sub-components

| Section | Condição | Cards | Linhas Info |
|---|---|---|---|
| Identidade | Sempre | 1 card | Nome, Razão Social, Status badge, Área badge, Score |
| Informações cadastrais | Sempre | 1 card | ID, CNPJ, Área, Estágio, Fundação, Cadastrada em |
| Contato | Se site/telefone/email existem | 1 card | Site (link), Email (mailto), Telefone |
| Dados bancários | Se dados existem | 1 card | Banco, Tipo, Agência/Conta, PIX, Titular, Documento |
| Fundador | Se founder existe | 1 card | Nome, Email, ID |
| Campanhas | Se `campaigns.length > 0` | 1 card | Lista com nome, status, meta |
| Pitch & Negócio | Se qualquer campo preenchido | 1 card | Até 12 InfoRow (descrição, problema, solução, modelo receita, diferencial, mercado-alvo, espera alcançar, dedicação, compradores, investimento prévio, concorrência, vídeo pitch) |
| Benefícios & Lucros | Se oferta lucros/benefícios | 1 card | Lucros Sim/Não + desc, Benefícios Sim/Não + desc |
| Estrutura | Se socios/teams/uso_recursos | 1 card | 3 JsonInfoRow (JSON formatado, max-h-40 scroll) |
| Documentos | Se logo/cover/mie/contrato/cnpj existem | 1 card | `DocumentThumbnails` component (modal preview) |
| Detalhes das Campanhas | Se `campaigns.length > 0` | 1 card | Grid 2-col por campanha (status, meta, mín, valuation, token price, deadline) |
| Resumo | Sempre | 1 card (sidebar) | Status, Segmento, Estágio, Score, Fundação, Campanhas, CNPJ masked |
| Detalhes avançados | Sempre | 1 card (sidebar) | Link para compliance detail |

### 3.3 Helper components

| Helper | Função |
|---|---|
| `Card` | `glass-panel rounded-3xl p-4 sm:p-8 space-y-4` + título + ícone |
| `Badge` | `text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border` (primary/destructive/warning) |
| `InfoRow` | Flex row com ícone (primary/70) + label (uppercase 10px muted) + value (14px foreground) |
| `JsonInfoRow` | InfoRow com `<pre>` JSON formatado (max-h-40, overflow auto) |
| `StatRow` | Flex justify-between label (muted 12px) + value (foreground 14px black) |
| `FounderCard` | Card com nome/email/ID do fundador |
| `safeDateTime` | Formata `Intl.DateTimeFormat pt-BR` com hora |
| `safeDateOnly` | Formata `Intl.DateTimeFormat pt-BR` sem hora |
| `maskCnpj` | `12.345.xxx/xxxx-xx` (LGPD-safe) |

### 3.4 Watermark

- `DashboardBackgroundWatermark` component (`founder/dashboard-background-watermark.tsx`)
- Posição: `fixed`, opacidade `[0.02]`, logotipo iSelfToken
- Camada base para todos os cards (cards acima via `z-index`)

### 3.5 Responsive

| Breakpoint | Layout |
|---|---|
| Mobile (< 1024px) | Coluna única, cards empilhados, sidebar abaixo |
| Desktop (≥ 1024px) | Grid 2/3 + 1/3, cols fixas |

### 3.6 UX Patterns

| Padrão | Implementação |
|---|---|
| Navegação | Breadcrumb "← Voltar à gestão de startups" (link para `/admin/startups`) |
| LGPD | CNPJ mascarado, sem CPF/email/telefone em texto livre |
| Acessibilidade | `aria-hidden` em ícones decorativos, `aria-label` em botões, roles em cards |
| Coerência | Mesmo padrão visual do admin-dashboard (glass-panel, 3xl radius, magenta) |
| Estado vazio | Cards condicionais não renderizam (não mostram "—" para seções vazias) |

---

## 4. Rotas e BFFs

| Página | Route file | BFF proxy |
|---|---|---|
| `/admin/startups` | `routes/private/admin-startups.tsx` | `GET /api/admin/startups` |
| `/admin/startups/:id` | `routes/private/admin.startup-detail.tsx` | `GET /api/admin/startups/:id` |
| Editar startup | POST (via `admin-startup-action.server.ts`) | `PATCH /api/admin/startups/:id` |
| Aprovar startup | POST (form inline na table) | `POST /api/admin/startups/:id/status` |
| Rejeitar startup | POST (via modal) | `POST /api/admin/startups/:id/status` |
| Gerenciar selos | POST (via modal) | `POST /api/admin/seals/startup/:startupId` |

---

## 5. Relação com Documentos de Negócio

| Documento | Seção | Relevância |
|---|---|---|
| `CASE.md` | [Captação], [Configuração Financeira], [Investimento] | Regras de status, fluxo de aprovação |
| `scripts/startups/PRD_STARTUP_PUBLICA_PRIVADA.md` | §12 (Admin/Compliance) | Contexto do admin na captação |
| `scripts/startups/PRD_RECEBIMENTO_CAPTACAO.md` | §12.1 | Gestão de pagamentos (separate page `/admin/startups/:id/pagamentos`) |
| `scripts/startups/fluxo_startup.md` | §4B | Visão Admin/Compliance — validação/auditoria por etapa (gate via pagamento) |

---

## 6. Decisões de Design

| Decisão | Justificativa |
|---|---|
| Tabela responsiva (cards mobile + table desktop) | shadcn/ui pattern; melhora UX em telas pequenas |
| Glass panels (3xl radius) | Brand identity iSelfToken; diferencia de templates SaaS genéricos |
| Skeleton sem zeros fabricados | Anti-mock: se não há dado do banco, mostrar placeholder (pulse) |
| Status badges com 3 cores (primary/warning/destructive) | Emerald reservado para semântica financeira (repasse/KYC) |
| Modal rejeição com motivo obrigatório | LGPD: justificativa para decisão administrativa |
| CNPJ mascarado no detalhe | LGPD: não expor CNPJ completo na listagem |
| Sidebar com link para `/compliance/startups/:id` | Separação de visões: admin = overview, compliance = análise profunda |
| Watermark `opacity-[0.02]` | Identidade visual consistente com founder dashboard |
| Form filtros via GET (não POST) | Compartilhável via URL, funciona com browser back/forward |

---

## 7. Pendências / Melhorias futuras

| Item | Prioridade | Notas |
|---|---|---|
| KPIs no header da lista | Baixa | Ex: "23 startups · 5 em análise · 2 rejeitadas" |
| Bulk actions na lista | Baixa | Selecionar múltiplas → aprovar/rejeitar em lote |
| Ordenação da tabela | Média | Por nome, status, data de cadastro |
| Exportar CSV | Média | Para compliance/auditoria |
| Paginação melhorada | Média | Jump-to-page, page size selector |
| Filtro avançado (date range, score) | Baixa | Expandir filtros GET |
| Drag-and-drop para reorder | Baixa | Reorder da fila de curadoria |
| Notificações de ação | Média | Toast/modal quando startup aprovada |

---

## 8. Documentos relacionados

| Documento | Local | Conteúdo |
|---|---|---|
| Redesenho das Fases | `scripts/startups/admin-startup-phases-design.md` | Fase 1/2/3 gates, tabela, página Fase 1 |
| Gestão de Payouts | `scripts/startups/admin-payout-management.md` | /admin/payouts — captação finalizada + solicitações de parcela |
