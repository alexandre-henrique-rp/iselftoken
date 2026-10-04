# PRD — Página de Transparência da Startup (Atualizado)

**Data:** 16/09/2026
**Autor:** Agente IselfToken
**Status:** Draft v2 — Com wireframes e plano de melhoria
**Versão base:** `scripts/concluido/PRD_PAGINA_TRANSPARENCIA.md` (rascunho original)
**Complementa:** `scripts/concluido/PRD_PAGINA_TRANSPARENCIA.md` + análise de gaps + wireframes

> **Documentação viva:** Este documento reflete o ESTADO ATUAL do código e o PLANO DE MELHORIAS. Decisões de design estão em 🔑.

---

## 1. Contexto e Estado Atual

### 1.1 O que já existe no código

| Página | Rota | Status |
|--------|------|--------|
| Transparência — Fundador | `/founder/startups/:id/transparencia` | ✅ Implementado (com bugs) |
| Transparência — Lista do Investidor | `/investor/transparencia` | ✅ Implementado (lista de startups) |
| Startup Detail | `/startups/:id` | ✅ Implementado (**sem link** para transparência) |
| Wallet (investidor) | `/wallet` | ✅ Link no asset row (🔵 botão) |
| Founder Dashboard | `/founder/dashboard` | ✅ Links em startup-card, startup-grid-card, startup-actions-cell |
| Sidebar Admin | `/admin` | ✅ "Gestão de Repasse" (repasse, não transparência) |

### 1.2 Componentes existentes em `frontend/app/components/transparency/`

| Componente | Função | Estado |
|------------|--------|--------|
| `transparency-shell.tsx` | Orquestra header + FeaturedReport + Tabs + Posts/Discussion | ⚠️ Bugs (P1, P4) |
| `transparency-featured-report.tsx` | Post vigente em destaque | ⚠️ Melhorias visuais (Fase 3) |
| `transparency-tabs.tsx` | TabNav Atualizações/Discussão | 🔴 Bug (P1) |
| `transparency-posts-list.tsx` | Orquestrador da aba Atualizações | ✅ Funcional |
| `post-card.tsx` | Card de post na lista | ⚠️ Melhorias visuais (Fase 3) |
| `post-detail.tsx` | View de detalhe do post | ✅ Funcional |
| `post-editor.tsx` | Criar/editar post | ✅ Funcional |
| `access-denied-card.tsx` | CTA "Quero investir" para sem token | ⚠️ Correção cor (Fase 1) |
| `filter-chips.tsx` | Chips de filtro por tipo | ✅ Funcional |
| `empty-state.tsx` | Estado vazio | ✅ Funcional |
| `pagination.tsx` | Paginação | ✅ Funcional |
| `discussion-feed.tsx` | Orquestrador da aba Discussão | ✅ Funcional |
| `discussion-card.tsx` | ThreadCard | ⚠️ Melhorias visuais (Fase 3) |
| `discussion-list.tsx` | Lista de threads | ✅ Funcional |
| `discussion-thread-view.tsx` | Thread expandida | ✅ Funcional |
| `discussion-search-bar.tsx` | Busca + sort + categoria | ✅ Funcional |
| `discussion-sticky-pin.tsx` | Badge "Fixada" | ✅ Funcional |
| `discussion-upvote-toggle.tsx` | Toggle upvote | ✅ Funcional |
| `discussion-replies.tsx` | Replies + form | ✅ Funcional |
| `discussion-editor.tsx` | Modal criar/editar thread | ✅ Funcional |
| `discussion-confirm-pin.tsx` | Modal confirm pin | ✅ Funcional |
| `discussion-confirm-delete.tsx` | Modal confirm delete | ✅ Funcional |
| `_shared.ts` | Constantes + formatters | 🔴 Cores incompatíveis (P2, P3) |

### 1.3 Bugs críticos

| # | Bug | Impacto | Correção |
|---|------|---------|----------|
| **P1** | `transparency-shell.tsx:235` — `onChange={() => {}}` no TransparencyTabs | **Usuário não consegue navegar para aba Discussão** | Trocar por `onChange={setTab}` |
| **P2** | `_shared.ts:18-22` — TYPE_COLORS usa blue/amber/slate | Viola STYLE_GUIDE §3.4 (só magenta + emerald financeiro) | Recolores para magenta-based |
| **P3** | `_shared.ts:34-37` — CATEGORY_COLORS usa violeta | Viola STYLE_GUIDE §3.4 | Recolores para magenta-based |
| **P4** | Sem "Postar thread" na aba Discussão | Founder não pode criar discussões pela aba Discussão | Adicionar botão condicional |
| **P5** | `ComprovanteCard` não existe | PRD exige comprovantes no relatório | Criar componente (Fase 2) |
| **P6** | `transparency-featured-report.tsx:146` — "Excluir" usa `bg-red-600` sem `variant="destructive"` | Inconsistente com STYLE_GUIDE §5.1 | Trocar para destructive styling |
| **P7** | `transparency-featured-report.tsx:95` — `line-clamp-6` no markdown | Pode cortar conteúdo importante do relatório | Remover, usar scroll |

---

## 2. Wireframes

### 2.1 Fundador — `/founder/startups/:id/transparencia`

#### Desktop (≥1024px)

**Header**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ← Voltar                          [Postar atualização]                 │
│    (magenta, 11px, uppercase)         (bg-primary, white, rounded-lg)    │
│                                                                          │
│  TRANSPARÊNCIA                                                          │
│  [InitialsImage h-12 w-12]  Startup Nome Fantasia                       │
│                              Segmented · Financiada · R$ 300K captados │
│                                                                          │
│  Atualizações financeiras, marcos de produto e mudanças societárias       │
│  publicadas pelo fundador para os investidores com tokens.                │
└──────────────────────────────────────────────────────────────────────────┘
```

**FeaturedReportCard**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                               │
│  │ POST │  Relatório Financeiro    Jun/2026                             │
│  │VIGENTE│                                                               │
│  └──────┘                                                               │
│                                                                          │
│  Relatório do Mês — Resultados e Perspectivas                            │
│  Publicado em 05/07/2026 por João Silva                                 │
│                                                                          │
│  ╔══════════════════════════════════════════════════════════╗          │
│  ║ shadow-[0_0_18px_rgba(213,0,249,0.1)]                     ║          │
│  ║                                                          ║          │
│  ║  ## Introdução                                           ║          │
│  ║  texto em markdown renderizado...                         ║          │
│  ║                                                          ║          │
│  ║  ## Métricas Financeiras                                 ║          │
│  ║  │ Receita │ Custo │ Lucro │                            ║          │
│  ║  │ R$50K   │ R$30K │ R$20K │                            ║          │
│  ║                                                          ║          │
│  ║  ## Marcos                                               ║          │
│  ║  texto...                                                ║          │
│  ║                                                          ║          │
│  ╚══════════════════════════════════════════════════════════╝          │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ 📁 2 anexos                                                  │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ COMPROVANTES                                  [Editar] [Excluir] │  │
│  │ ┌────────────────────────────────────────────────────────┐     │  │
│  │ │ 📄 relatorio_cashflow_jun.pdf                          │     │  │
│  │ │    24/07/2026 · 1.2MB · [📥 Download]                  │     │  │
│  │ │                                                         │     │  │
│  │ │ 📄 balanco_patrimonial_jun.pdf                         │     │  │
│  │ │    24/07/2026 · 890KB · [📥 Download]                  │     │  │
│  │ └────────────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Tabs**

```
  ┌──────────────────────────────────────────────────┐
  │ Atualizações    Discussão                         │
  │ ▀▀▀▀▀▀▀▀▀▀▀     (border-b-2 border-primary)    │
  └──────────────────────────────────────────────────┘
```

**Aba Atualizações**

```
  ┌──────────────────────────────────────────────────────────────────┐
  │  [📄 FINANCIAL_REPORT] [🚀 PRODUCT_MILESTONE] [🏢 CORPORATE]  │
  │  Relatório Financeiro   Marco de Produto  Mudança Societária     │
  │  (bg-primary/10, text-primary, border-primary/30)                 │
  └──────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  📄 Relatório Financeiro — Jun/2026    05/07/2026 · 2 anexos     │
  │  Relatório do Mês — Resultados e Perspectivas                   │
  │  ═════════════════════════════════════════════                  │
  │  hover: -translate-y-0.5 + shadow-[0_0_18px_rgba(213,0,249,.08)]│
  └──────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  🚀 Marco de Produto — MVP Alcançado   15/08/2026 · 0 anexos     │
  │  Lançamos a versão 2.0 com novas funcionalidades...               │
  │  ═════════════════════════════════════════════                  │
  │  hover: -translate-y-0.5 + shadow-[0_0_18px_rgba(213,0,249,.08)]│
  └──────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  ← Anterior    Página 1 de 3    Próxima →                       │
  └──────────────────────────────────────────────────────────────────┘
```

**Aba Discussão**

```
  ┌──────────────────────────────────────────────────────────────────┐
  │  [🔍 Buscar threads...]  [Recentes ▾]  [Geral ▾]                │
  └──────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  📌 Thread Fixada (admin/founder)                                 │
  │  "Dúvidas sobre o relatório do mês?"                            │
  │  Fundador · 02/07/2026 · 💬 5 · ▲ 12                             │
  └──────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  💬 Dúvida sobre projeção de receita Q3                          │
  │  Investidor Ana · 03/07/2026 · 💬 3 · ▲ 8                         │
  │  "A projeção de crescimento..."                                   │
  │  [Ver thread →] [▲] [💬 3]                                       │
  └──────────────────────────────────────────────────────────────────┘
```

#### Mobile (<640px)

```
  ← Voltar

  TRANSPARÊNCIA

  [InitialsImage] Startup Nome
                     Segmented · Financiada

  Atualizações financeiras, marcos...

  [Postar atualização] (full width)

  ┌─────────────────────────────────┐
  │ POST VIGENTE                     │
  │ Relatório Financeiro · Jun/2026  │
  │                                  │
  │ Relatório do Mês...              │
  │ (scrollável sem corte)           │
  └─────────────────────────────────┘

  Atualizações | Discussão (text-xs, full width)
  ▀▀▀▀▀▀▀▀▀    (border-b-2)

  ┌─────────────────────────────────┐
  │ [Magenta Badge] Jun/2026         │
  │ Relatório Financeiro             │
  │ preview texto...                 │
  │ 📁 2 anexos                      │
  │ hover: lift + glow               │
  └─────────────────────────────────┘
```

---

### 2.2 Investidor — `/investor/startups/:id/transparencia` (NOVA ROTA)

#### Desktop (≥1024px)

**Header com KPI Strip**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ← Voltar                                                                │
│                                                                          │
│  TRANSPARÊNCIA                                                          │
│  [InitialsImage h-12 w-12]  Startup Nome Fantasia                       │
│                              Segmented · Financiada · R$ 300K captados  │
│                                                                          │
│  Acompanhe relatórios mensais e participe das discussões.                │
│                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │
│  │ Investido    │ │ Tokens       │ │ Status       │                   │
│  │ R$ 15.000    │ │ 750          │ │ Financiada   │                   │
│  └──────────────┘ └──────────────┘ └──────────────┘                   │
│                                                                          │
│  [🔄 Atualizar]   (Atualizado 14:30:25)                                │
└──────────────────────────────────────────────────────────────────────────┘
```

**FeaturedReportCard (read-only)**

```
  (Mesmo layout do fundador, SEM botões Editar/Excluir,
   SEM seção "Postar atualização")

  ┌──────────────────────────────────────────────────────────────────┐
  │  POST VIGENTE  Relatório Financeiro  Jun/2026                     │
  │  Relatório do Mês...                                              │
  │  Publicado em 05/07/2026 por João Silva                          │
  │  [markdown renderizado]                                            │
  │                                                                    │
  │  ┌────────────────────────────────────────────────────────────┐│
  │  │ 📄 relatorio_cashflow_jun.pdf                                ││
  │  │    24/07/2026 · 1.2MB · [📥 Download]                        ││
  │  └────────────────────────────────────────────────────────────┘│
  └──────────────────────────────────────────────────────────────────┘
```

**Aba Discussão (read-only)**

```
  (Mesma layout do fundador, MAS:)
  - [Postar thread] REMOVIDO
  - Upvote funciona
  - Respostas read-only (decisão pendente — D1)
  - Sem pins (admin/founder only)
```

#### Mobile

```
  ← Voltar

  TRANSPARÊNCIA

  [InitialsImage] Startup Nome
                     Financiada

  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ Investido    │ │ Tokens       │ │ Status       │
  │ R$ 15.000    │ │ 750          │ │ Financiada   │
  └──────────────┘ └──────────────┘ └──────────────┘
  (1 col cada, stacked)

  [🔄 Atualizar]

  (FeaturedReportCard + Tabs + Cards — same as founder)
```

---

### 2.3 ComprovanteCard (Novo Componente)

Renderizado DENTRO do FeaturedReportCard, abaixo do markdown:

```
  ┌──────────────────────────────────────────────────────────────┐
  │  📋 Comprovantes                                              │
  │  Anexos do Financeiro para este relatório                    │
  │                                                                  │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │  📄 relatorio_cashflow_jun.pdf                           │  │
  │  │     24/07/2026  ·  1.2 MB  ·  application/pdf        │  │
  │  │     [📥 Download]  (bg-primary/10, text-primary,      │  │
  │  │                      rounded-full, px-3 py-1)            │  │
  │  └────────────────────────────────────────────────────────┘  │
  │                                                                  │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │  📄 balanco_patrimonial_jun.pdf                          │  │
  │  │     24/07/2026  ·  890 KB  ·  application/pdf        │  │
  │  │     [📥 Download]                                        │  │
  │  └────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘

  Se não houver comprovantes: não renderiza nada (coerente com
  FeaturedReportCard — sem placeholder).
```

---

### 2.4 Mapa de Botões — Onde Colocar na Startup Detail

#### Startup Detail (`/startups/:id`) — Investidor

```
┌────────────────────────────────────────────────────────────┐
│                                                              │
│  StartupHero (logo, nome, tagline, CTA investir)            │
│                                                              │
│  PitchVideo                                                  │
│                                                              │
│  MetricsGrid (valuation, preço, tokens, investidores)       │
│                                                              │
│  BusinessSummary                                             │
│                                                              │
│  TeamSection                                                 │
│                                                              │
│  RiskDocs                                                    │
│                                                              │
│  RealInvestors ──┐                                           │
│                  ├── POSSÍVEL LOCAL PARA BOTÃO           │
│                  └── "Ver Transparência" (se token holder)│
│                                                              │
│  InvestorForum ──── TAMBÉM POSSÍVEL                         │
│                     (link para discussão existente)        │
│                                                              │
│  ┌─ InvestmentSidebar (sticky right) ──┐                   │
│  │  INVESTIR AGORA                     │ ← NÃO tem token  │
│  │  ou                                 │                   │
│  │  VER TRANSPARÊNCIA                  │ ← TEM token      │
│  │  (bg-accent/20, border-primary/20,  │                   │
│  │   text-primary, rounded-full)       │ ← RECOMENDADO    │
│  │                                       │                   │
│  └───────────────────────────────────────┘                   │
└────────────────────────────────────────────────────────────┘
```

**Decisão 🔑 D2:** InvestmentSidebar é o melhor local (visibilidade, consistência com wallet).

#### Fundador Dashboard (`/founder/dashboard`)

**Já existe** — links em 3 componentes:
- `startup-card.tsx:211` — Link "Transparência"
- `startup-grid-card.tsx:142` — Link "Transparência"
- `startup-actions-cell.tsx:145` — Link "Transparência"

#### Investor Dashboard (`/investor/transparencia`)

**Já existe** — `invested-startup-card.tsx:150` → `/startups/:id/transparencia`

> ⚠️ Atualmente aponta para `/startups/:id/transparencia` que não existe. Deve apontar para `/investor/startups/:id/transparencia` após Fase 3.

#### Wallet (`/wallet`)

**Já existe** — `wallet.tsx:430` — 🔵 botão circular no asset row → `/transparencia`

---

## 3. Análise de Cores — Badges (STYLE_GUIDE Compliant)

### Post Types (Pós-Fase 1)

```
┌────────────────────────────────────────────────────┐
│ FINANCIAL_REPORT → emerald (semântica financeira) │
│   bg-emerald-500/10 text-emerald-700 border-emerald-200
│   "Relatório Financeiro"                            │
│                                                     │
│ PRODUCT_MILESTONE → primary/magenta                │
│   bg-primary/10 text-primary border-primary/30     │
│   "Marco de Produto"                                │
│                                                     │
│ CORPORATE_CHANGE → primary/magenta                 │
│   bg-primary/10 text-primary border-primary/30     │
│   "Mudança Societária"                              │
│                                                     │
│ GENERAL → primary/magenta                          │
│   bg-primary/10 text-primary border-primary/30     │
│   "Geral"                                           │
└────────────────────────────────────────────────────┘
```

### Discussion Categories

```
┌────────────────────────────────────────────────────┐
│ FINANCEIRO → emerald (semântica financeira)         │
│ GERAL → primary/magenta                            │
│ PRODUTO → primary/magenta                          │
│ SOCIETARIO → primary/magenta                       │
│ DUVIDA → primary/magenta                           │
└────────────────────────────────────────────────────┘
```

### Invested Startup Card Status (I3)

```
ANTES (viola STYLE_GUIDE):      DEPOIS (STYLE_GUIDE):
  OPEN → emerald-400              OPEN → primary/magenta
  FUNDED → blue-400               FUNDED → primary/magenta
  FAILED → red-400                FAILED → destructive (red)
  PAUSED → amber-400              PAUSED → warning (amber permitido como status)
```

> **Justificativa:** STYLE_GUIDE §3.4: "Captado", "Aprovada", "Aberta", "Ativo" são destaques de plataforma → magenta. Emerald é APENAS para semântica financeira terminal (repasse concluído, pagamento confirmado). Blue/violet NÃO são permitidos como acento decorativo.

---

## 4. Fluxo de Acesso

```
                    ┌─ Tem token na startup? ── SIM ──► Página per-startup
                    │                                   (investor mode)
                    │
Usuário logado ────┤
                    │                                    NÃO ──► AccessDeniedCard
                    │                                   (CTA "Quero investir")
                    │
                    └─ ADMIN? ──► Mesma página + permissões totais
                    └─ FUNDADOR ──► Página com editar + postar
                    └─ SEM TOKEN ──► AccessDeniedCard
```

---

## 5. Decisões de Design

| # | Decisão | Recomendação | Impacto |
|---|---------|-------------|---------|
| 🔑 D1 | Investidor pode RESPONDER threads? | **Não** (read-only + voto). Menor risco, LGPD mais simples. Define escopo Fase 3. | Fase 3 |
| 🔑 D2 | Botão "Ver Transparência" no Startup Detail — InvestmentSidebar ou RealInvestors? | **InvestmentSidebar** (visibilidade, consistência com wallet). Degrada para RealInvestors em mobile. | Fase 4 |
| 🔑 D3 | Investidor Transparency per-startup usa `EditorialWalletShell` ou `TransparencyShell`? | **EditorialWalletShell** (padrão investidor: watermark, refresh button, KPI strip) com internals do TransparencyShell. | Fase 3 |
| 🔑 D4 | KPI strip no header da transparência mostra investimento do USUÁRIO LOGADO? | **Sim** (investido, tokens, status) — via `/api/investments/my-startups` data. | Fase 3 |
| 🔑 D5 | `line-clamp-6` no FeaturedReportCard → substituir por scroll? | **Sim** (cortar conteúdo é ruim para relatórios financeiros). | Fase 2 |
| 🔑 D6 | Badges de status no InvestedStartupCard: emerald=open, blue=funded → magenta? | **Sim** (STYLE_GUIDE). Emerald mantém só para financeiro-terminal. | Fase 1 |
| 🔑 D7 | Rota investidor per-startup: `/investor/startups/:id/transparencia` ou `/startups/:id/transparencia` com mode? | **`/investor/startups/:id/transparencia`** (URL explícita, SEO melhor, fácil de entender). | Fase 3 |

---

## 6. Plano de Implementação

### Fase 1 — Correções de Conformidade (~2h)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 1.1 | Corrigir `onChange` do TransparencyTabs | `transparency-shell.tsx:235` | 15min |
| 1.2 | Recolores TYPE_COLORS para magenta-based | `_shared.ts:18-22` | 30min |
| 1.3 | Recolores CATEGORY_COLORS | `_shared.ts:34-37` | 30min |
| 1.4 | Corrigir "Excluir" para destructive variant | `transparency-featured-report.tsx:146` | 15min |
| 1.5 | Atualizar InvestedStartupCard status colors | `invested-startup-card.tsx:71-136` | 30min |

### Fase 2 — ComprovanteCard (~3h)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 2.1 | Criar `comprovante-card.tsx` | `transparency/comprovante-card.tsx` | 1h |
| 2.2 | Integrar em FeaturedReportCard | `transparency-featured-report.tsx` | 1h |
| 2.3 | Remover `line-clamp-6` (scrollável) | `transparency-featured-report.tsx:95` | 15min |

### Fase 3 — Per-Startup Investor Page (~6h)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 3.1 | Criar rota `/investor/startups/:id/transparencia` | `routes.ts` + novo arquivo | 30min |
| 3.2 | Criar investor shell (EditorialWalletShell + KPI strip) | `investor-startup-transparencia.tsx` | 1h |
| 3.3 | Reutilizar TransparencyShell com `investorMode` | `transparency-shell.tsx` | 1h |
| 3.4 | Atualizar "Ver Relatórios" → nova rota | `invested-startup-card.tsx:150` | 15min |
| 3.5 | Investor FeaturedReportCard (read-only, sem editar) | `transparency-featured-report.tsx` | 1h |
| 3.6 | Mobile responsive pass | Todos | 1h |

### Fase 4 — Botão na Startup Detail (~3h)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 4.1 | Adicionar "Ver Transparência" no InvestmentSidebar | `investment-sidebar.tsx` | 1h |
| 4.2 | Degradar para RealInvestors em mobile | `investment-sidebar.tsx` | 30min |
| 4.3 | Tests e ajustes | — | 1h |

### Fase 5 — Polish Visual (~4h)

| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 5.1 | FeaturedReportCard glow + refinements | `transparency-featured-report.tsx` | 1h |
| 5.2 | PostCard hover animation | `post-card.tsx` | 30min |
| 5.3 | DiscussionCard magenta accents | `discussion-card.tsx` | 30min |
| 5.4 | Mobile checkpoint (STYLE_GUIDE §4.3) | Todos | 2h |

---

## 7. Wireframe — Navegação no Contexto da Sidebar

### Sidebar Investidor (em `/wallet`)

```
  ┌────────────┬─────────────────────────────────────────────────┐
  │            │ ← Notificações                                    │
  │  Carteira  │                                                   │
  │  Investir  │ ┌─────────────────────────────────────────────┐ │
  │  Histórico │ │ Extrato de Transações                         │ │
  │  Transparência│ │ [Investido R$15K] [Tokens 750] [Status] │ │
  │  ...       │ │                                               │ │
  │            │ │ [🔵 Transparency Button] → /transparencia   │ │
  │            │ └─────────────────────────────────────────────┘ │
  └────────────┴─────────────────────────────────────────────────┘
```

### Startup Detail com Transparency Button

```
  ┌────────────────────────────────────────────────────────────┐
  │                                                              │
  │  [Logo] Startup Nome    Segmented · Financiada                │
  │  Investidores reais da rodada:                                │
  │  ┌────┐ ┌────┐ ┌────┐                                        │
  │  │Ana │ │Carlos│ │Maria│                                      │
  │  └────┘ └────┘ └────┘                                        │
  │  [Ver Transparência] ← NOVO (bg-accent/2, border-primary/20)│
  │                                                              │
  │  ┌─ InvestmentSidebar (sticky) ──┐                           │
  │  │                                  │                           │
  │  │  Investir Agora                   │ ← sem token          │
  │  │  ou                             │                           │
  │  │  Ver Transparência              │ ← com token (DEFAULT)  │
  │  │  (kinetic-gradient, shadow)    │                           │
  │  │                                  │                           │
  │  │  Ao clicar, concorda com...     │                           │
  │  └──────────────────────────────────┘                           │
  └────────────────────────────────────────────────────────────┘
```

---

## 8. Comparação Visual — Antes vs Depois

### PostCard

```
ANTES:                    DEPOIS:
┌─────────────────┐     ┌─────────────────┐
│ bg-card border  │     │ bg-card border-  │
│ border-border   │     │   white/5        │
│ [Badge azul]    │     │ shadow-lg        │
│ Jun/2026        │     │ hover:           │
│ Relatório Fin.  │     │   shadow-[0_0_18px│
│ preview...      │     │   rgba(213,0,249,│
│                 │     │   0.08)]         │
└─────────────────┘     │ [Badge magenta]  │
                        │ 📄 Relatório Financeiro │
                        │ Jun/2026  ·  📁 2 anexos │
                        │ preview...       │
                        │ transition-      │
                        │   duration-500   │
                        └─────────────────┘
```

### DiscussionCard

```
ANTES:                    DEPOIS:
┌─────────────────┐     ┌─────────────────┐
│ [Badge slate]   │     │ [Badge magenta]  │
│ 03/07/2026      │     │ 03/07/2026       │
│ Título           │     │ Título (hover:   │
│ preview...       │     │   text-primary)  │
│ Author|▲8|💬3   │     │ Author|[▲8]*|💬3│
└─────────────────┘     └─────────────────┘
                          * = bg-primary/10 if active, bg-card if not
```

---

## 9. Critérios de Aceite Atualizados

```gherkin
Funcionalidade: Transparência da Startup

Cenário: Founder posta atualização
  Dado um founder autenticado da startup X
  Quando acessa /founder/startups/X/transparencia e clica "Postar atualização"
  E preenche título, conteúdo (markdown), tipo e período
  E clica "Publicar"
  Então o post aparece no topo do feed
  E o FeaturedReportCard é atualizado (se é o post vigente)

Cenário: Investor com token vê a página
  Dado um investor que comprou tokens da startup X
  Quando acessa /investor/startups/X/transparencia
  Então vê o header com KPI (investido, tokens, status)
  E vê o FeaturedReportCard (se houver post vigente)
  E pode navegar entre Atualizações e Discussão
  E pode votar em discussões

Cenário: Investor SEM token recebe 403
  Dado um investor logado que NÃO tem tokens da startup X
  Quando tenta acessar /investor/startups/X/transparencia
  Então recebe AccessDeniedCard
  E vê CTA "Quero investir" → link para /startups/X

Cenário: Investidor sem token tenta postar
  Dado um investor logado sem tokens da startup X
  Quando tenta clicar "Postar atualização"
  Então o botão NÃO é exibido

Cenário: Markdown é sanitizado
  Dado um founder posta conteúdo com "<script>alert('xss')</script>"
  Quando um investor abre o post
  Então o script NÃO é executado

Cenário: Comprovantes aparecem no relatório
  Dado um post vigente com anexos do financeiro
  Quando o investidor acessa a página
  Então vê a seção "Comprovantes" com download links

Cenário: Tabs funcionam
  Dado um usuário na página de transparência
  Quando clica na aba "Discussão"
  Então a view troca para a lista de discussões
  E a URL contém ?tab=discussao
```

---

## 10. Definição de Done

### Must-have (bloqueia release)

- [ ] Fase 1: Correções de conformidade (P1-P3, I3)
- [ ] Fase 2: ComprovanteCard funcional
- [ ] Fase 3: Rota `/investor/startups/:id/transparencia` funcional
- [ ] Fase 3: Tabs navegáveis (P1 corrigido)
- [ ] Markdown sanitizado (zero XSS)
- [ ] Botão "Ver Transparência" na Startup Detail (InvestmentSidebar)
- [ ] TYPE_COLORS e CATEGORY_COLORS STYLE_GUIDE compliant
- [ ] InvestedStartupCard status colors STYLE_GUIDE compliant
- [ ] Testes E2E frontend cobrem fluxo principal

### Nice-to-have (follow-up)

- [ ] Investidor pode responder threads (D1)
- [ ] Glow e animações visuais (Fase 5)
- [ ] Notificações ao publicar
- [ ] Audit log de compliance

---

## 11. Anexo — Localização de Arquivos

### Arquivos a Criar

| Arquivo | Fase | Descrição |
|---------|------|-----------|
| `frontend/app/routes/private/investor-startup-transparencia.tsx` | 3 | Route: investor per-startup transparency |
| `frontend/app/components/transparency/investor-transparency-shell.tsx` | 3 | Shell com KPI strip + EditorialWalletShell |
| `frontend/app/components/transparency/comprovante-card.tsx` | 2 | Card de comprovantes |

### Arquivos a Modificar

| Arquivo | Fase | Descrição |
|---------|------|-----------|
| `frontend/app/components/transparency/transparency-shell.tsx` | 1, 3 | Fix onChange, investorMode |
| `frontend/app/components/transparency/_shared.ts` | 1 | Recolores badges |
| `frontend/app/components/transparency/transparency-tabs.tsx` | 1 | Testar onChange |
| `frontend/app/components/transparency/transparency-featured-report.tsx` | 2, 3 | Comprovantes, glow, remove line-clamp |
| `frontend/app/components/transparency/post-card.tsx` | 3 | Hover animation |
| `frontend/app/components/transparency/discussion-card.tsx` | 3 | Magenta accents |
| `frontend/app/components/transparency/access-denied-card.tsx` | 1 | Fix button style |
| `frontend/app/components/investor/invested-startup-card.tsx` | 1, 3 | Status colors, link destination |
| `frontend/app/components/investor/investor-startup-transparencia-shell.tsx` | 3 | NEW (KPI strip) |
| `frontend/app/components/startup-detail/investment-sidebar.tsx` | 4 | Transparency button |
| `frontend/app/routes.ts` | 3 | Register new route |
| `frontend/app/components/founder/startup-card.tsx` | — | Verify link (exists) |
| `frontend/app/components/founder/startup-grid-card.tsx` | — | Verify link (exists) |
| `frontend/app/components/founder/startup-actions-cell.tsx` | — | Verify link (exists) |

### Arquivos de Referência

| Arquivo | Uso |
|---------|-----|
| `frontend/STYLE_GUIDE.md` | Design system v1.2 (magenta + preto puro) |
| `frontend/app/components/wallet/editorial-wallet-shell.tsx` | Shell editorial (watermark, header pattern) |
| `frontend/app/components/investor/invested-startup-card.tsx` | Padrão de card de investimento |
| `scripts/concluido/PRD_PAGINA_TRANSPARENCIA.md` | PRD original (contexto + arquitetura backend) |
| `scripts/startups/PRD_RECEBIMENTO_CAPTACAO.md` §10 | Especificação da página de transparência |
| `frontend/app/components/transparency/AGENTS.md` | Documentação do módulo transparency |

---

## 12. Histórico de Versões

| Data | Versão | Autor | Mudança |
|------|--------|-------|---------|
| 2026-08-14 | Original | Usuário | Ideia vaga: relatórios + tópicos |
| 2026-08-14 | Draft 1 | Agente | PRD completo com Gherkin, backend, frontend |
| 2026-09-16 | v2 | Agente | **Atualizado**: análise de estado atual, wireframes, bugs, plano de melhoria, faseamento, decisões documentadas |
