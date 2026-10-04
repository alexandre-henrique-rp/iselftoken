---
name: frontend-reviewer
description: >-
  Skill de auditoria e code review para inspecionar, revisar e garantir o cumprimento rigoroso da arquitetura frontend (eliminação de requests duplicados / TanStack Query) e do Design System oficial (Inter, magenta #d500f9, preto puro, shadcn/ui).
---

# Frontend Reviewer — Guardião de Arquitetura e Consistência Visual

Esta skill audita a qualidade, performance e estilo do frontend do **iSelfToken**, certificando o cumprimento de:
- **[frontend-architecture](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/.agents/skills/frontend-architecture/SKILL.md)** (SSR Hydration, sem requests duplicados)
- **[frontend-style-guide](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/.agents/skills/frontend-style-guide/SKILL.md)** (Design System oficial: Inter, Magenta `#d500f9`, preto puro, 4 estados de tela).
- **[frontend/STYLE_GUIDE.md](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/STYLE_GUIDE.md)** (documento mestre do design system).

> **Atualização T126:** paleta primária consolidada em **magenta `#d500f9`**
> sobre **preto puro `#000000`**. Emerald é reservado para semântica financeira
> estrita (repasse concluído, documento verificado) — não usar como acento
> decorativo de plataforma.

---

## Checklist de Auditoria

| Item | Critério de Aceite | Status em Falha |
|---|---|---|
| **Fonte Inter** | Toda tipografia deve usar a família **Inter** (`font-sans` configurada para Inter) e seguir a escala de `Display` (36-48px) a `Extra Small` (12px). | 🚨 **Bloqueante**: Corrigir font-family para Inter. |
| **Paleta Oficial — Magenta** | Cor primária deve ser Magenta (`#d500f9` / `bg-primary`). Cores semânticas: `success` emerald (somente contexto financeiro), `warning` amber, `error` red. | 🚨 **Bloqueante**: Substituir `#2563eb` (azul legado) ou `#a855f7` (violeta legado) por `#d500f9`. |
| **Preto Puro** | Background da página deve ser `#000000` (token `--color-background`). Evitar `#0a0a0a` exceto onde explicitamente justificado. | ⚠️ **Alerta**: Migrar para o token correto. |
| **Sem emerald decorativo** | Verde (emerald-400/500) é proibido para badges/pílulas de status de plataforma. Reservar para Repasse pago / Verificação de documento / KYC aprovado. | 🚨 **Bloqueante**: Trocar `text-emerald-400` por `text-primary` em contexto de marca. |
| **Cards neutros** | Cards de KPI usam preto/cinza neutro (`bg-accent/20`, `#202020`) e magenta somente como destaque. O card Captado usa `from-primary/10 via-accent/30 to-accent/10`. | 🚨 **Bloqueante**: Remover verde, azul ou violeta decorativo de cards de métricas. |
| **Sem sombras hardcoded** | Shadows magenta/violet hardcoded (`rgba(168,85,247,...)` ou `rgba(213,0,249,...)`) são proibidos — usar `shadow-[0_0_18px_rgba(213,0,249,0.25)]` (alinhado ao token) ou tokens semânticos. | ⚠️ **Alerta**: Substituir por valor consistente com `--color-primary`. |
| **4 Estados de Tela** | A tela trata **Loading** (com Skeleton), **Empty** (com ícone e CTA), **Error** (com retry) e **Data**? | 🚨 **Bloqueante**: Implementar estados ausentes. |
| **SSR Hydration** | Loaders de rotas devem usar `queryClient.setQueryData` + `dehydrate` e a página deve envolver com `<HydrationBoundary>`. | 🚨 **Bloqueante**: Adicionar hidratação SSR. |
| **Propagação de Layout** | Proibido rotas filhas fazerem fetch duplicado de sessão (`/api/users/me` ou `/api/auth/status`). | 🚨 **Bloqueante**: Usar `useUser()` ou dados de layout. |
| **BFF próprio** | Loaders e hooks nunca chamam `${BACKEND_URL}` direto. Sempre passam por `serverFetch(request, "/api/...")` ou BFFs em `app/routes/api/*`. | 🚨 **Bloqueante**: Criar BFF em `app/routes/api/` + queryOptions em `lib/queries.ts`. |
| **`setQueryData` para TODOS os dados do loader** | Todo payload buscado no loader deve hidratar `queryClient.setQueryData` antes do `dehydrate` (zero waterfall). | 🚨 **Bloqueante**: Hidratar via `setQueryData` mesmo para dados que parecem ser "view-specific". |
| **Tipos compartilhados** | `InvestedStartup`, `InvestedStartupsResponse`, `DashboardMetrics`, etc. residem em `lib/queries.ts` ou `types/` — nunca redeclarados em rotas/hooks. | ⚠️ **Alerta**: Mover para single source of truth. |
| **Feedback de Botão** | Botões com ação assíncrona exibem `disabled` + spinner durante carregamento? | ⚠️ **Alerta**: Adicionar estado de loading. |
| **SEO & A11y** | Rota exporta meta tags com títulos claros e possui contraste WCAG AA. | ⚠️ **Alerta**: Adicionar meta tags. |
| **Spacing editorial** | Páginas autenticadas seguem o shell Wallet real: `pt-28 pb-12 px-6 lg:px-12`, `pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0`, `max-w-7xl xl:max-w-[1400px]`, header `mb-6 md:mb-8` e bento `mb-8 md:mb-10`. | ⚠️ **Alerta**: Remover padding duplicado ou corrigir breakpoint. |
| **Breakpoints** | A tela foi conferida em mobile (<640px), tablet (640–1023px) e desktop (>=1024px), sem overflow, compressão, quebra de ações ou componente crítico dependente apenas de `lg:`? | 🚨 **Bloqueante**: Corrigir responsividade antes de concluir. |
| **Limite de linhas da rota** | Rotas em `app/routes/private/*` devem ter ≤ 40 linhas (AGENTS.md). Acima disso, decompor em componentes em `app/components/<feature>/` e hooks em `app/hooks/`. | 🚨 **Bloqueante**: Refatorar — extrair markup e lógica para componentes focados. |
| **Watermark de fundo** | Páginas autenticadas com hero podem usar watermark de logo "iSelfToken" gigante em `opacity-[0.02]`. **PROIBIDO** grid quadriculado ou patterns visíveis. | ⚠️ **Alerta**: Substituir grid por watermark de marca. |

---

## Procedimento de Auditoria

1. **Carregar contexto** — Ler `frontend/AGENTS.md` e `frontend/app/routes/<feature>/AGENTS.md` para entender convenções locais.
2. **Verificar paleta** — Procurar por `#2563eb` (azul legado), `#a855f7` (violeta legado) e `emerald-400/500` em arquivos modificados. Decidir contexto: marca → magenta, semântica → manter emerald se for financeiro terminal.
3. **Verificar SSR** — Toda rota privada deve ter loader + `setQueryData` + `dehydrate` + `<HydrationBoundary>`.
4. **Verificar BFF** — Procurar `fetch(`${BACKEND_URL}` ou `fetch("http://localhost:7077"` em loaders/hooks. Se existir, criar BFF.
5. **Verificar limites** — `wc -l` em arquivos de rota; > 40 linhas é red flag.
6. **Verificar estado vazio/error** — Toda query deve ter fallback explícito para `isLoading`, `isError`, `data == null`.
