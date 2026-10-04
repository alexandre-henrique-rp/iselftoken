# Plano: Algoritmo de Exibição + UX das Páginas de Startups

> **Data:** 2026-09-16  
> **Status:** Planejamento (aguardando aprovação)  
> **Prioridade:** Alta  
> **Estimativa:** ~20h (algoritmo) + ~12h (UX) = ~32h

---

## 1. Contexto

As regras de exibição definidas em `scripts/marketplace/marketplace.md` (Seções `/` e `/home`) **não estão sendo aplicadas** no frontend. As páginas `/` e `/home` usam ordenações genéricas (score DESC, createdAt DESC) que ignoram:

- Filtro de **captação ativa**
- Threshold de **selos** (>4)
- Posicionamento por **score** (>85 random, >98 top)
- Janelas temporais para **Recém-Adicionadas** (<20 dias) e **Picks da Semana** (<7 dias)
- Limites de **15 itens** por seção

Paralelamente, a UX das páginas pública (`/`), privada (`/home`) e de detalhe de startup precisa de melhorias identificadas na análise (bugs P1-P7, gaps de navegação, inconsistências entre rotas).

---

## 2. Algoritmo de Exibição — Estado Atual vs. Regras Marketplace.md

### 2.1 Tabela de Discrepâncias

| Regra marketplace.md | Backend atual | Frontend atual | Necessário |
|---|---|---|---|
| **Rodadas em Destaque** (max 15): captação ativa, >4 selos, score>85 random, score>98 top | `/api/startups/featured` → top 10 por `score DESC, createdAt DESC` — sem filtro de selos, sem regras de score | Nenhum | Backend: filtrar captação ativa, >4 selos, aplicar regras de score. Frontend: limitar a 15, exibir badges |
| **Recém-Adicionadas** (max 15): captação ativa, <20 dias, ordenar por selos desc | `/api/startups/recently-added` — sem filtro de dias, sem ordenação por selos | Nenhum | Backend: filtrar <20 dias captação ativa, ordenar por selos desc. Frontend: limitar a 15 |
| **Oportunidades de Investimento** (sem limite específica): sem filtros definidos | `/api/startups/opportunities` — sem filtros | Nenhum | Definir regras (se houver) ou manter como está |
| **Rodadas Quentes** (max 15): mesma lógica de Destaque | `/home` usa mesmo endpoint que `/` (featured) | `/home` chama via `serverFetch` sem cache compartilhado com `/` | Unificar endpoint + cache, aplicar mesmas regras de Destaque |
| **Acesso Antecipado** (max 15): captação ativa, <20 dias, selos desc | `/home` tem seção mas usa endpoint diferente | Seção existe mas dados não seguem regra | Mesma lógica de Recém-Adicionadas |
| **Picks da Semana** (max 15): captação ativa, <7 dias, mais antiga primeiro | Não existe endpoint dedicado | Seção `/home` usa dados genéricos | Criar endpoint ou aplicar filtro no frontend |
| **Startups por Categorias** | `/marketplace/categories` | Funcional sem filtros | Manter, adicionar count de rodadas |

### 2.2 Abordagem Recomendada

**Camada Backend (prioridade 1):**
- `/api/startups/featured`: aplicar filtros de marketplace.md (captação ativa, >4 selos, score thresholds)
- `/api/startups/recently-added`: aplicar filtro <20 dias + ordenação por selos
- Criar `/api/startups/curated-picks` (ou estender existing): <7 dias, mais antiga primeiro
- Unificar: `/` e `/home` usam mesmo endpoint BFF com cache Redis compartilhado
- Score >85 e >98: backend calcula e retorna campo `score` no payload

**Camada Frontend (prioridade 2):**
- Limitar visual a 15 itens por seção (defensive coding)
- Exibir badges de score (e.g., "★ Destaque" para >98, "★ Popolar" para >85)
- Aplicar filtro de captação ativa nos cards (hide se inativa)

---

## 3. Wireframes UX — Página Pública `/` (Landing)

### 3.1 Layout Atual (7 seções) vs. Proposto

```
┌─────────────────────────────────────────────────┐
│  NAVBAR + HERO (mantido)                        │
├─────────────────────────────────────────────────┤
│  ★ Rodadas em Destaque (CARROSSEL 3D)           │
│  → Filtrado: captação ativa + >4 selos          │
│  → Score>98 no top, score>85 random             │
│  → Max 15 cards com badge de score              │
├─────────────────────────────────────────────────┤
│  ★ Recém-Adicionadas (CARROSSEL 3D)             │
│  → Filtrado: captação ativa + <20 dias          │
│  → Ordenado por selos desc                      │
│  → Max 15 cards com badge "NOVO"                │
├─────────────────────────────────────────────────┤
│  ★ Oportunidades de Investimento (GRID + filtro)│
│  → Filtros: categoria, estágio, ordenação       │
│  → Cards com selos + transparência link         │
├─────────────────────────────────────────────────┤
│  FOOTER (mantido)                               │
└─────────────────────────────────────────────────┘
```

### 3.2 Mudanças-chave em `/`

1. **Rodadas em Destaque**: aplicar regras marketplace.md + badge de score nos cards
2. **Recém-Adicionadas**: aplicar regras marketplace.md + badge "Novo" (<20 dias)
3. **Oportunidades**: adicionar link "Ver Transparência" em cada card (D2)
4. **Seção removida?**: considerar consolidar "Parceiros e Selos" — é marketing, não conversão. Manter apenas se métrica justifica.
5. **Seção removida?**: "Rodadas Encerradas" e "Últimas Oportunidades" — baixo tráfego, consolidar em uma só ou remover (ver decisão D3)
6. **Hero CTA**: direcionar para `/marketplace` (máxima conversão) — já está, confirmar
7. **Transparency button**: adicionar condicionalmente nos cards de startup (visível para investidores autenticados)

### 3.3 Wireframe — Card de Startup (Rodadas em Destaque)

```
┌────────────────────────────────┐
│  [Logo] [Selo×5] [★ Score 92] │  ← badge score
│────────────────────────────────│
│                                │
│  Nome da Startup               │
│  Categoria · Estágio           │
│                                │
│  Descrição curta...            │
│                                │
│  Valor Captado / Meta  [45%]  │
│  ████████░░░░░░░░░            │
│                                │
│  [Investir Agora] [Transparência] │ ← transparência button (D2)
└────────────────────────────────┘
```

---

## 4. Wireframes UX — Página Privada `/home` (Marketing)

### 4.1 Layout Proposto (6 seções)

```
┌─────────────────────────────────────────────────┐
│  NAVBAR (mantido)                               │
├─────────────────────────────────────────────────┤
│  ★ Banner rodada específica (semanal)           │  ← unificar com Destaque
├─────────────────────────────────────────────────┤
│  ★ Rodadas Quentes (CARROSSEL 3D, auto-rot.)   │  ← regras Destaque
│  → Score>85 random, >98 top, max 15             │
├─────────────────────────────────────────────────┤
│  ★ Startups Grid (Paginado)                     │  ← regras catálogo
│  → Filtros funcionais (seção fixa)              │
│  → Badges: selos, score, status captação        │
│  → [Transparência] em cada card                 │
├─────────────────────────────────────────────────┤
│  ★ Acesso Antecipado (GRID 3 cols)              │  ← regras Recém-Adicionadas
│  → <20 dias captação ativa, selos desc          │
│  → Badge "ACESSO ANTECIPADO"                    │
├─────────────────────────────────────────────────┤
│  ★ Picks da Semana (GRID 3 cols)                │  ← regra específica
│  → <7 dias captação ativa, mais antiga primeiro │
│  → Badge "PICK" + "NOVO"                        │
├─────────────────────────────────────────────────┤
│  ★ Startups por Categorias                      │  ← manter
│  → Expandir: mostrar count de rodadas abertas   │
│  → Click → filtra grid acima                    │
├─────────────────────────────────────────────────┤
│  FOOTER (mantido)                               │
└─────────────────────────────────────────────────┘
```

### 4.2 Mudanças-chave em `/home`

1. **Banner + Rodadas Quentes**: unificar — Banner mostra a rodada destaque, HotRounds mostra lista. Ou manter separado se Banner é visual.
2. **StartupGrid**: adicionar badges (selos, score, status), botão Transparência, melhorar responsividade mobile
3. **Acesso Antecipado**: aplicar regras marketplace.md (<20 dias, selos desc), organizar em grid 3 cols (não só grid)
4. **Picks da Semana**: **MELHORIA VISUAL** — grid 3 cols com destaque visual (magenta border, badge "PICK")
5. **CategoryGrid**: mostrar count de startups abertas por categoria, clickable para filtro
6. **Parceiros**: manter (autoridade)

### 4.3 Wireframe — StartupGrid Card (versão /home)

```
┌────────────────────────────────┐
│  [Capa/Logo] ★ Score 92       │
│  [Selo×5] [ACESSO ANTICIPADO] │
│────────────────────────────────│
│  Nome da Startup              │
│  Categoria · Estágio          │
│                                │
│  ████████░░░░ 45% / R$ 2M    │
│                                │
│  [Transparência] [Investir]   │
└────────────────────────────────┘
```

### 4.4 Wireframe — Picks da Semana

```
┌────────────────────────────────────┐
│  ⭐ PICK DA SEMANA                │  ← header diferenciado
│  ┌──────────────────────────────┐  │
│  │ [Capa] ★ Score 95          │  │
│  │ Badge "NOVO" + "PICK"       │  │
│  │                              │  │
│  │ Nome da Startup             │  │
│  │ Categoria · Estágio         │  │
│  │                              │  │
│  │ ████████░░░░ 45% / R$ 2M   │  │
│  │                              │  │
│  │ [Transparência] [Investir]  │  │
│  └──────────────────────────────┘  │
│  (máx 15 cards, border magenta)    │
└────────────────────────────────────┘
```

---

## 5. Unificação de Rotas de Startup

### 5.1 Problema

Existem **3 rotas** para ver detalhes de startup, cada uma com componentes diferentes:

| Rota | Componente | Tipo Startup | Público |
|---|---|---|---|
| `/startup/:slug` | `public/startup.tsx` → `StartupOpportunityView mode="public"` | `StartupPublicOpportunity` | Qualquer um |
| `/marketplace/startup/:slug` | `private/marketplace-startup.tsx` → `StartupOpportunityView mode="private"` | `StartupPrivateOpportunity` | Autenticado |
| `/startups/:id` | `private/startup-detail.tsx` → `StartupDetailContent` | Mapeado via API | Autenticado (legacy) |

### 5.2 Decisões Pendentes (D8-D10)

| Decisão | Opção A | Opção B | Recomendação |
|---|---|---|---|
| **D8**: Unificar `/startup/:slug` + `/marketplace/startup/:slug`? | Mesmo componente com mode prop | Manter separado (roles diferentes) | A — Um componente, modo depende do auth |
| **D9**: `/startups/:id` continua? | Redirect para `/marketplace/startup/:slug` | Manter legacy indefinido | A — Redirect 301, descontinuar |
| **D10**: Startup detail como página visitável (investidor)? | `/marketplace/startup/:slug` sem login | Login obrigatório | A — Visitável + CTAs para login quando necessário |

### 5.3 Wireframe — Unificação

```
/user/startup/:slug  (visitante)
  → StartupOpportunityView mode="public"
  → Hero + pitch + problem/solution + team
  → CTA: "Criar conta para investir" → /signup
  → Link: "Ver Transparência" → /startup/:slug/transparencia

/user/marketplace/startup/:slug  (investidor autenticado)
  → StartupOpportunityView mode="private"  
  → Mesmo hero + pitch + problem/solution + team
  → Sidebar: Investir Agora (KYC check) + Auditada
  → Link: "Ver Transparência" → /startup/:slug/transparencia

/admin/startups/:id  (legado)
  → Redirect 301 → /marketplace/startup/:slug
```

---

## 6. Wireframe — Página de Transparência (Referência)

Baseado em `scripts/startups/PRD_PAGINA_TRANSPARENCIA.md`:

### 6.1 Desktop

```
┌─────────────────────────────────────────────────────┐
│  [Navbar]                                           │
├─────────────────────────────────────────────────────┤
│  Título: Transparência                            │
│  Subtítulo: Dados financeiros, métricas de captação │
│  [Período filter: 6M | 12M | All-time]             │
├─────────────────────────────────────────────────────┤
│  ┌─────── Startup Hero ────────┐ ┌──── Sidebar ────┐│
│  │ [Logo] Nome · Selos         │ │ [Investir CTA]  ││
│  │ Descrição                   │ │ [Transparência] ││
│  │ [Transparência sub-page ↗]  │ │ [Acesso API ↗]  ││
│  └─────────────────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────┤
│  ┌─── Gráfico Valor Captado ──────────────────┐    │
│  │                                             │    │
│  │  R$ 5M                                      │    │
│  │  R$ 3M           ██                          │    │
│  │  R$ 1M   ██      ██                         │    │
│  │  R$ 0    Jan Feb Mar Abr Mai Jun Jul Ago    │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  ┌─── Progresso da Campanha ─────────────────┐     │
│  │ Rodada: Series A · Meta: R$ 5M · 62%      │     │
│  │ ████████░░░░░░░░░░░░░░░░                  │     │
│  │ Selos: 5/8                               │     │
│  └──────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────┤
│  ┌─── Timeline ──────────────────────────────┐     │
│  │ [Investimento] → Fechamento → Atual       │     │
│  │ Jan → Mar → Abr                           │     │
│  └───────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────┤
│  ┌─── Acesso à API ─────────────────────────┐      │
│  │ Documentação + URL + Token               │      │
│  └──────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────┤
│  [Footer]                                           │
└─────────────────────────────────────────────────────┘
```

### 6.2 Mobile (Simplificado)

```
┌─────────────────────┐
│ [Navbar]            │
├─────────────────────┤
│ Título + Sub        │
│ [Filter periodo ▾]  │
├─────────────────────┤
│ [Logo] Nome         │
│ [Selos]             │
├─────────────────────┤
│ [Investir] [API]    │
├─────────────────────┤
│ Gráfico             │
├─────────────────────┤
│ Progresso           │
├─────────────────────┤
│ Timeline            │
├─────────────────────┤
│ Acesso API          │
├─────────────────────┤
│ [Footer]            │
└─────────────────────┘
```

### 6.3 Componentes Críticos

| Componente | Status | Bugs | Prioridade |
|---|---|---|---|
| `transparency-shell.tsx` | Existente | P1: onChange no-op, P5: scroll reset | Alta |
| `transparency-table.tsx` | Existente | P3: colunas truncadas, P4: sem scroll horizontal | Alta |
| `ComprovanteCard.tsx` | **A criar** | — | Média |
| Chart (Recharts) | Existente | P2: responsividade | Alta |

---

## 7. Investimento Sidebar — Ajustes

### 7.1 Atual

```
┌─────────────────────────────────┐
│ Rodada · Series A               │
│ Meta: R$ 5M                     │
│ 62% captado                     │
│                                 │
│ ████████░░░░                    │
│                                 │
│ [INVESTIR AGORA] ← magenta      │
│                                 │
│ KYC: Necessário [Concluir agora]│
│ Auditada: Sim                   │
└─────────────────────────────────┘
```

### 7.2 Proposto — Adicionar transparência link

```
┌─────────────────────────────────┐
│ Rodada · Series A               │
│ Meta: R$ 5M · 62% captado      │
│ 47 dias restantes               │
│ ████████░░░░                    │
│                                 │
│ [INVESTIR AGORA]                │
│                                 │
│ KYC: Necessário [Concluir]      │
│ ────────────────────────────    │
│ [Ver Transparência da Rodada] ← NOVO (D7)
│ [Acesso ao API/Docs] ← NOVO    │
│                                 │
│ Auditada · 5 selos验证         │
└─────────────────────────────────┘
```

### 7.3 Estados especiais (manter)

- **Rodada não iniciada**: placeholder com data prevista
- **Rodada encerrada**: CTA desabilitado + Selos aplicados com overlay
- **KYC reprovado**: link "Reenviar documento"
- **Preview mode**: banner informativo + CTAs desabilitados

---

## 8. Priorização de Decisões

### 8.1 Decisões que Precisam de Aprovação

| # | Decisão | Impacto | Sugestão |
|---|---|---|---|
| **D1** | Investidor pode responder threads transparência? | Backend + UI | **Não** por enquanto — só admin/fundador (simplifica v1) |
| **D2** | Transparency button nos cards de startup? | Frontend | **Sim** — link direto para página de transparência |
| **D3** | Consolidar "Parceiros" + "Últimas Oportunidades" em `/`? | UX | **Não consolidar** — manter separado (autoridade + conversão) |
| **D4** | Seção "Rodadas Encerradas" em `/`? | UX | **Remover** da landing — baixa conversão, ir para /home |
| **D5** | Filtro de categoria em `/home` StartupGrid aplica visual? | UX | **Sim** — border highlight + scroll |
| **D6** | Seções de transparência em startup detail? | UX | **Somente na sub-página** `/startup/:slug/transparencia` |
| **D7** | Links no InvestmentSidebar? | UX | **Sim** — Transparência + API Docs |
| **D8** | Unificar `/startup/:slug` + `/marketplace/startup/:slug`? | Arquitetura | **Sim** — um componente, mode por auth |
| **D9** | `/startups/:id` redirect? | Arquitetura | **Sim** — 301 para `/marketplace/startup/:slug` |
| **D10** | Startup detail visitável sem login? | UX | **Sim** — visitável, CTAs para login |

### 8.2 Decisões que o Agente PODE Tomar

- Aplicar badges de score nos cards (e.g., ★ para >98, ○ para >85)
- Limitar a 15 itens por seção no frontend (defensive)
- Adicionar scroll horizontal para tabela de transparência em mobile
- Melhorar acessibilidade dos filtros (aria-labels, keyboard navigation)
- Atualizar breadcrumbs nas páginas de startup detail

---

## 9. Plano de Execução (Estimativa)

### Fase 1: Algoritmo Backend (~8h)
1. Endpoint `/api/startups/featured` — aplicar regras marketplace.md (filtro captação ativa, >4 selos, score thresholds)
2. Endpoint `/api/startups/recently-added` — aplicar filtro <20 dias + selos desc
3. Criar endpoint `/api/startups/curated-picks` — <7 dias, mais antiga primeiro
4. Cache Redis compartilhado entre `/` e `/home`
5. Campo `score` no payload das startups

### Fase 2: Frontend `/` Landing (~4h)
6. Aplicar regras de exibição nos carrosséis (Destaque + Recém-Adicionadas)
7. Adicionar badges de score nos cards
8. Adicionar botão Transparência nos cards (D2)
9. Remover seção "Rodadas Encerradas" (D4)
10. Limitar a 15 itens por seção

### Fase 3: Frontend `/home` Marketing (~4h)
11. Aplicar regras Rodadas Quentes + Acesso Antecipado
12. Criar seção Picks da Semana (grid 3 cols, visual diferenciado)
13. Adicionar badges + transparência nos cards StartupGrid
14. Melhorar CategoryGrid (count + clickable)
15. Melhorar responsividade mobile

### Fase 4: Unificação Rotas Startup (~3h)
16. Criar componente unificado (mode prop: public/private/preview)
17. Atualizar `/startup/:slug` e `/marketplace/startup/:slug` para usar componente unificado
18. Redirect `/startups/:id` → `/marketplace/startup/:slug` (D8-D9-D10)

### Fase 5: Transparência UX (~3h)
19. InvestmentSidebar — adicionar links Transparência + API Docs (D7)
20. Tabela transparência — scroll horizontal mobile + responsividade (P3, P4)
21. Shell transparência — fix onChange + scroll reset (P1, P5)
22. Criar `ComprovanteCard` component (da PRD transparência)

### Fase 6: QA + Polish (~4h)
23. Testes visuais em 320px, 768px, 1440px
24. E2E flows: landing → card → transparência → investir
25. Typecheck + lint
26. Documentação atualizada (AGENTS.md mudanças)

---

## 10. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Score não existe no DB (all zeros from seed) | Alta | Backend não pode calcular thresholds | Mock scores para dev, calcular apenas com dados reais |
| Backend não suporta novos filtros rapidamente | Média | Bloqueia Fase 1 | Aplicar filtros no frontend como workaround temporário |
| Unificação de rotas quebra links existentes | Média | SEO, bookmarks | Redirect 301, atualizar todos os links internos |
| Performance com 15+ itens por seção + filtros | Baixa | Latência | Cache Redis + paginação lazy |

---

## 11. Próximos Passos

1. **[AGUARDANDO]** Aprovação das decisões D1-D10 pelo usuário
2. **[PENDENTE]** Definir se backend é necessário ou se frontend resolve (tradeoff tempo vs robustez)
3. **[PENDENTE]** Iniciar Fase 1 (assumindo aprovação)

---

*Documento criado em: 2026-09-16*  
*Baseado em: `scripts/marketplace/marketplace.md`, `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md`, análise de código frontend v2*
