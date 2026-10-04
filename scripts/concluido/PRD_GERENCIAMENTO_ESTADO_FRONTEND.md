# PRD — Melhoria do Gerenciamento de Estado do Frontend

**Data:** 2026-08-14 (versão inicial)  
**Última revisão:** 2026-08-15 (revisão de coerência — adicionado §0 Estado de Execução e Decisões fechadas)  
**Status:** Proposta parcialmente executada (~70% entregue)  
**Prioridade:** Alta (original) → Média (após entrega parcial)  
**Área:** Frontend (React 19 + TanStack Query 5 + React Router 7)

---

## Histórico de Revisões

| Data | Mudança |
|------|---------|
| 2026-08-14 | Versão inicial (Status: Proposta) |
| 2026-08-15 | Revisão: confirmado que ~70% das Fases já foram entregues em paralelo pelas Fases 3A/3B/3C do roadmap do frontend (documentado em `frontend/AGENTS.md` linhas 92-145). Adicionado §0 Estado de Execução + Decisões 1..4 marcadas com status real. |

---

## 0. Estado de Execução (2026-08-15)

> **Nota:** Este PRD foi redigido em 2026-08-14 "Status: Proposta". Pouco depois (e em paralelo), o projeto entregou as **Fases 3A, 3B e 3C do roadmap frontend** (visíveis em `frontend/AGENTS.md` linhas 92-145) que endereçam boa parte deste documento. Esta seção mapeia o que foi / não foi feito.

| Fase | Item | Status atual | Onde foi feito / falta fazer |
|------|------|--------------|------------------------------|
| **1.1** | `query-client.ts` `refetchOnWindowFocus: false` global | ✅ **Entregue** | `frontend/app/lib/query-client.ts:6` já tem `refetchOnWindowFocus: false` |
| **1.2** | `meQueryOptions` staleTime 60s → 5 min | ✅ **Entregue** | `frontend/app/lib/queries.ts:44` já tem `staleTime: 5 * 60_000` + `gcTime: 10 * 60_000` |
| **1.3** | `authStatusQueryOptions` staleTime 60s → 5 min | ✅ **Entregue** | `frontend/app/lib/queries.ts:33` já tem `staleTime: 5 * 60_000` |
| **2.1** | Unificar `/api/startup` queries com `select` | ✅ **Entregue** | `use-dashboard-overview.ts:30` reusa `startupsQueryOptions.queryKey` (compartilha cache com `startupsQueryOptions`) |
| **2.2** | Remover fetch duplicado de `/me` em `checkout-payment.tsx` e `marketing.tsx` (loaders) | ⚠️ **Pendente** | `marketing.tsx:115` ainda duplica fetch do layout loader. Reaproveitar via React Router 7 `context`/`middleware` (Proposta §3.2.2 Opção preferida) |
| **3.1** | `seal-modal.tsx:30` migrar de `useEffect`+`fetch` para `useQuery` com `enabled: isOpen` | ⚠️ **Pendente** | `components/seal-modal.tsx:30` ainda faz `fetch("/api/seals")` em `useEffect` |
| **3.2** | `PixPayment.tsx` migrar polling `setInterval` → TanStack `refetchInterval` | ⚠️ **Pendente** | Polling manual ainda existe |
| **3.3** | `documents-section.tsx` migrar CRUD completo para hooks | ⚠️ **Parcial** | Há 3 `useMutation` (linhas 330/341/520) + 4 `fetch` diretos restantes (linhas 437/612/631/644/667) |
| **3.4** | `use-auto-save-draft.ts` migrar `BACKEND_URL` direto → BFF + `useMutation` | ⚠️ **Pendente** | Backend via `import.meta.env.VITE_API_URL` ignora BFF |
| **4.1** | `useCreateStartupMutation` invalidar `["startups"]` | ✅ **Entregue** | `use-create-startup-mutation.ts:90` faz `invalidateQueries({ queryKey: startupsQueryOptions.queryKey })` |
| **4.2** | `create-startup.tsx` migrar uploads inline → `useUploadMutation` | ✅ **Entregue** | `routes/private/create-startup.tsx:30,203` já usa `useUploadMutation` |
| **4.3** | `pricing.tsx` encapsular 4 fetches sequenciais em uma mutation atômica | ⚠️ **Pendente** | Sem mutation unificada; 4 fetches separados no onSubmit |
| **4.4** | Modais Cancel/Token Reservation invalidar `["payments"]` e `["startup-overview"]` | ⚠️ **Pendente** | Modais existem mas sem invalidation explícita |
| **5** | Categorias / Áreas com `staleTime: Infinity` | ✅ **Entregue** | `queries.ts:69,91,116` já tem `staleTime: Infinity` |

**Resumo:** 7 itens ✅ entregues, 7 itens ⚠️ pendentes. ~70% de execução.

---



## 1. Contexto e Motivação

A aplicação frontend sofre com **requisições HTTP desnecessárias** causadas por:

1. **Configuração insuficiente do TanStack Query** — `refetchOnWindowFocus: true` (default) ativo globalmente, `staleTime` baixo para dados que raramente mudam.
2. **Fetch direto com `useEffect`** — Componentes fazendo `fetch()` manual em vez de usar o cache do TanStack Query.
3. **Queries duplicadas** — Mesmo endpoint chamado com queryKeys diferentes, sem compartilhar cache.
4. **Falta de invalidation** — Mutations completam sem invalidar queries relacionadas.
5. **Uploads inline** — `fetch("/api/uploads")` sem `useMutation`, gerando throttling (429).

**Impacto real:** O rate limiter do backend (50 req/hora para uploads) está sendo atingido em uso normal — evidência concreta de requisições excessivas.

---

## 2. Diagnóstico Detalhado

### 2.1 Rota `/me` — Análise Completa

#### Estado Atual

```
useUser() → useQuery(meQueryOptions)
  ├─ queryKey: ["me"]
  ├─ staleTime: 60_000 (1 min)
  ├─ refetchOnWindowFocus: NÃO definido (herda true do TanStack)
  ├─ gcTime: NÃO definido (default 5 min)
  └─ enabled: isAuthenticated && isAuthorized
```

#### Fluxo de Hydration (correto)

O layout loader já faz server-side fetch e hidrata o cache via `HydrationBoundary`. Componentes filhos (`profile-page`, `pricing`, `investment-sidebar`) consomem do cache **sem refetch**.

#### Problemas Identificados

| # | Problema | Arquivo | Impacto |
|---|----------|---------|---------|
| 1 | `refetchOnWindowFocus: true` (default) dispara refetch toda vez que o user alt-tabs | `app/lib/queries.ts` | Alto — gera requests a cada troca de aba |
| 2 | `staleTime: 60s` é baixo para dados de perfil que mudam raramente | `app/lib/queries.ts` | Médio — refetch após 1 min em navegação |
| 3 | Loaders de `checkout-payment.tsx` e `marketing.tsx` duplicam fetch de `/me` server-side | Rotas privadas | Médio — 2 requests server-side por navegação |
| 4 | QueryClient global não define `refetchOnWindowFocus: false` | `app/lib/query-client.ts` | Alto — afeta TODAS as queries |

---

### 2.2 Outros Problemas Identificados

#### 🔴 Gravidade Alta

| # | Problema | Arquivo(s) | Descrição |
|---|----------|-----------|-----------|
| 5 | Queries duplicadas para `/api/startup` | `app/lib/queries.ts:178`, `app/hooks/use-dashboard-overview.ts:17` | Mesmo endpoint com queryKeys diferentes (`["startups"]` vs `["dashboard-overview"]`) — duas requests para o mesmo dado |
| 6 | Mutation `useCreateStartupMutation` sem invalidation | `app/hooks/use-create-startup-mutation.ts:20` | Cria startup + pagamento mas não invalida `["startups"]` nem `["dashboard-overview"]` |
| 7 | CRUD de documentos com fetch inline | `app/components/founder/documents-section.tsx:364-642` | Upload, download e delete sem TanStack Query — zero cache |

#### 🟡 Gravidade Média

| # | Problema | Arquivo(s) | Descrição |
|---|----------|-----------|-----------|
| 8 | Fetch em `useEffect` para catálogo de selos | `app/components/seal-modal.tsx:30-46` | Toda abertura do modal refaz request para dados estáticos |
| 9 | Polling manual com `setInterval` | `app/components/checkout-payment/PixPayment.tsx:55-76` | Deveria usar `refetchInterval` do TanStack Query |
| 10 | Uploads inline em `create-startup.tsx` | `app/routes/private/create-startup.tsx:216,268` | Não usa `useUploadMutation` existente — causa throttling |
| 11 | 4 fetches sequenciais no checkout | `app/routes/private/pricing.tsx:138-235` | Sem mutation, sem retry, estado inconsistente em falha |
| 12 | POST inline para investimento | `app/components/startup-detail/investment-sidebar.tsx:185` | Sem cache, sem deduplicação |
| 13 | Auto-save com `BACKEND_URL` direto | `app/lib/use-auto-save-draft.ts:39-111` | Bypass do BFF — não funciona em produção |
| 14 | Upload + approve sequencial rápido | `app/components/financeiro/ApprovePaymentModal.tsx:64-83` | Risco de throttling entre as duas chamadas |

#### 🟢 Gravidade Baixa

| # | Problema | Arquivo(s) | Descrição |
|---|----------|-----------|-----------|
| 15 | Queries estáticas sem `refetchOnWindowFocus: false` | `use-categories.ts`, `use-areas-by-category.ts` | Refetch após alt-tab para dados que nunca mudam |
| 16 | Modais de ação não invalidam cache | `CancelModal.tsx`, `token-reservation.tsx` | Dados ficam stale após ação |
| 17 | Loader de marketing duplica fetch de /me | `app/routes/private/marketing.tsx:115` | Redundante com layout loader |

---

## 3. Solução Proposta

### 3.1 Fase 1 — Configuração Global (Quick Wins)

**Esforço:** ~30 min | **Impacto:** Alto

#### 3.1.1 Atualizar `app/lib/query-client.ts`

```ts
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false, // ← ADICIONAR
      },
    },
  });
}
```

**Justificativa:** A maioria dos dados da aplicação (perfil, startups, categorias) não muda entre alt-tabs. Queries que precisam de refetch em focus (ex: status de pagamento) podem habilitar individualmente.

#### 3.1.2 Atualizar `meQueryOptions` em `app/lib/queries.ts`

```ts
export const meQueryOptions = queryOptions({
  queryKey: ["me"],
  queryFn: fetchMe,
  staleTime: 5 * 60_000, // 5 minutos (era 1 min)
  gcTime: 10 * 60_000,   // 10 minutos
});
```

**Justificativa:** Dados do perfil mudam apenas quando o próprio user edita (e as mutations já fazem `invalidateQueries`). 5 min é seguro.

#### 3.1.3 Atualizar `authStatusQueryOptions`

```ts
export const authStatusQueryOptions = queryOptions({
  queryKey: ["auth-status"],
  queryFn: fetchAuthStatus,
  staleTime: 5 * 60_000, // 5 minutos (era 1 min)
});
```

---

### 3.2 Fase 2 — Eliminação de Queries Duplicadas

**Esforço:** ~2h | **Impacto:** Alto

#### 3.2.1 Unificar `/api/startup` queries

Manter uma query canônica e usar `select` para derivar views:

```ts
// app/lib/queries.ts
export const startupOverviewQueryOptions = queryOptions({
  queryKey: ["startup-overview"],
  queryFn: async () => {
    const res = await fetch("/api/startup", { credentials: "include" });
    const json = await res.json();
    return json.data; // { startups, summary, tabsCount }
  },
  staleTime: 60_000,
});

// Para listar apenas startups:
export const startupsQueryOptions = {
  ...startupOverviewQueryOptions,
  select: (data) => data.startups,
};
```

#### 3.2.2 Remover fetch duplicado de `/me` nos loaders

Criar utility para compartilhar dados entre layout e page loaders:

```ts
// app/lib/server/auth-utils.ts
export async function getAuthenticatedUser(request: Request) {
  // Busca ou reutiliza de header/context
  const user = await serverFetch("/api/users/me", request);
  return user;
}
```

Opção preferível: usar React Router `context` / `middleware` para compartilhar dados do layout com rotas filhas.

---

### 3.3 Fase 3 — Migração de Fetch Inline para TanStack Query

**Esforço:** ~4h | **Impacto:** Médio-Alto

#### 3.3.1 `seal-modal.tsx` → useQuery

```ts
const { data: catalog = [], isLoading } = useQuery({
  queryKey: ["seals-catalog"],
  queryFn: () => fetch("/api/seals").then(r => r.json()).then(j => j.data ?? []),
  staleTime: Infinity, // Catálogo estático
  enabled: isOpen,
});
```

#### 3.3.2 `PixPayment.tsx` → useQuery com refetchInterval

```ts
const { data } = useQuery({
  queryKey: ["payment-status", paymentId],
  queryFn: () => fetch(`/api/payment/${paymentId}`).then(r => r.json()),
  refetchInterval: (query) => {
    const status = query.state.data?.data?.status;
    return ["PAID", "CANCELED", "REFUNDED"].includes(status) ? false : 4000;
  },
  enabled: !!cob,
});
```

#### 3.3.3 `documents-section.tsx` → hooks dedicados

Criar:
- `useStartupDocuments(startupId)` — query
- `useUploadStartupDoc()` — mutation com invalidation
- `useDeleteStartupDoc()` — mutation com invalidation

#### 3.3.4 `use-auto-save-draft.ts` → useMutation + rota BFF

Migrar de `BACKEND_URL` direto para `/api/startup/draft` (via BFF) e encapsular em `useMutation`.

---

### 3.4 Fase 4 — Invalidation e Mutations

**Esforço:** ~2h | **Impacto:** Médio

#### 3.4.1 Adicionar invalidation ao `useCreateStartupMutation`

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["startup-overview"] });
},
```

#### 3.4.2 Migrar uploads para `useUploadMutation`

Em `create-startup.tsx`, substituir fetch inline por:

```ts
const upload = useUploadMutation();
const result = await upload.mutateAsync({ file });
setValue("logo", result.id);
```

#### 3.4.3 Encapsular fluxo de checkout em mutation

```ts
const checkoutMutation = useMutation({
  mutationFn: async ({ plan }) => {
    // cancel → create → pay (sequência atômica)
  },
  onSuccess: (data) => navigate(`/checkout/payment/${data.paymentId}`),
  onError: () => toast.error("Erro no checkout. Tente novamente."),
});
```

#### 3.4.4 Modais de ação (Cancel, Token Reservation)

Adicionar invalidation nos callbacks de sucesso:
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["payments"] });
  queryClient.invalidateQueries({ queryKey: ["startup-overview"] });
};
```

---

### 3.5 Fase 5 — Queries de Dados Estáticos

**Esforço:** ~30 min | **Impacto:** Baixo

```ts
// Categorias e áreas — dados cadastrais que não mudam
export const categoriesQueryOptions = queryOptions({
  queryKey: ["categories"],
  queryFn: fetchCategories,
  staleTime: Infinity,
  gcTime: Infinity,
});

export const areasByCategoryQueryOptions = (categoryId: string) =>
  queryOptions({
    queryKey: ["areas", categoryId],
    queryFn: () => fetchAreasByCategory(categoryId),
    staleTime: Infinity,
    gcTime: Infinity,
  });
```

---

## 4. Métricas de Sucesso

| Métrica | Antes | Meta |
|---------|-------|------|
| Requests `/api/users/me` por sessão (10 min) | ~15-20 (estimado com alt-tabs) | ≤ 3 |
| Requests duplicadas `/api/startup` | 2 por navegação | 1 |
| Erros 429 (throttling) em uso normal | Ocorrendo | Zero |
| Queries sem cache (fetch inline) | 8+ componentes | 0 |
| Mutations sem invalidation | 4+ hooks | 0 |

---

## 5. Cronograma Sugerido

| Fase | Descrição | Esforço | Prioridade |
|------|-----------|---------|------------|
| 1 | Config global (refetchOnWindowFocus, staleTime) | 30 min | P0 — fazer primeiro |
| 2 | Eliminar queries duplicadas | 2h | P0 |
| 3 | Migrar fetch inline → TanStack Query | 4h | P1 |
| 4 | Invalidation e mutations | 2h | P1 |
| 5 | Queries estáticas (staleTime: Infinity) | 30 min | P2 |

**Total estimado:** ~9h de trabalho

---

## 6. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Dados stale após mudança no backend | Mutations já fazem invalidation — testar cada fluxo |
| `staleTime: Infinity` em categorias fica desatualizado | Admin pode forçar reload; categorias mudam anualmente |
| Migração de `useEffect` → `useQuery` pode alterar timing | Testar abertura de modais e fluxos de pagamento |
| Remover refetchOnWindowFocus pode deixar dados velhos | Habilitar explicitamente em queries que precisam (pagamentos ativos) |

---

## 7. Arquivos Principais a Modificar

```
app/lib/query-client.ts              ← Fase 1
app/lib/queries.ts                   ← Fases 1, 2, 5
app/hooks/use-dashboard-overview.ts  ← Fase 2 (remover/unificar)
app/components/seal-modal.tsx        ← Fase 3
app/components/checkout-payment/PixPayment.tsx ← Fase 3
app/components/founder/documents-section.tsx   ← Fase 3
app/lib/use-auto-save-draft.ts       ← Fase 3
app/hooks/use-create-startup-mutation.ts       ← Fase 4
app/routes/private/create-startup.tsx          ← Fase 4
app/routes/private/pricing.tsx                 ← Fase 4
app/components/startup-detail/investment-sidebar.tsx ← Fase 4
app/hooks/use-categories.ts          ← Fase 5
app/hooks/use-areas-by-category.ts   ← Fase 5
```

---

## 8. Decisões

| # | Decisão | Status (2026-08-15) | Justificativa |
|---|---------|---------------------|---------------|
| **DEC-1** | Aumentar `staleTime` do `/me` para **5 min** (de 60s) | ✅ **APROVADO e EXECUTADO** | Já aplicado em `queries.ts:44`. Dados do perfil mudam só quando o próprio user edita (mutations invalidam). 5 min é seguro. |
| **DEC-2** | Desabilitar `refetchOnWindowFocus` **globalmente** | ✅ **APROVADO e EXECUTADO** | Já aplicado em `query-client.ts:6`. Queries que precisam de refetch em focus (status de pagamento PIX) habilitam individualmente via `refetchInterval` ou `refetchOnWindowFocus: true` por query. |
| **DEC-3** | **Unificar queries** de startup sob `startupsQueryOptions.queryKey` | ✅ **APROVADO e EXECUTADO** | Já aplicado em `use-dashboard-overview.ts:30` (compartilha cache). |
| **DEC-4** | **Migrar `use-auto-save-draft.ts`** para BFF `/api/startup/draft` | ⚠️ **PENDENTE** | Backend via `import.meta.env.VITE_API_URL` ignora BFF — não funciona em produção. Requer criar rota BFF + usar `useMutation`. Estimativa: 1-2h. **Owner:** Frontend. **Recomendação:** abrir sprint dedicada ou fazer em conjunto com `FIX-01` (correções Financeiro). |
| **DEC-5** *(nova)* | Migrar `seal-modal.tsx` para `useQuery` com `enabled: isOpen` | ⚠️ **PENDENTE** | Já há `useQuery` consolidado em `queries.ts`; só falta substituir o `useEffect`+`fetch` no modal. Estimativa: 30 min. |
| **DEC-6** *(nova)* | Migrar `PixPayment.tsx` `setInterval` → TanStack `refetchInterval` adaptativo | ⚠️ **PENDENTE** | TanStack já tem `refetchInterval` inteligente via função. Estimativa: 1h. |
| **DEC-7** *(nova)* | Remover fetch direto de `/me` dos loaders (`marketing.tsx:115`, `checkout-payment.tsx`) | ⚠️ **PENDENTE** | Requer usar React Router 7 `context`/`middleware` (PRD §3.2.2). Estimativa: 2-3h (envolve migração de layout). |
| **DEC-8** *(nova)* | Finalizar migração `documents-section.tsx` (4 fetches diretos restantes) | ⚠️ **PENDENTE** | Já tem 3 `useMutation`. Falta consolidar os 4 `fetch` restantes. Estimativa: 2h. |

**Total de trabalho pendente:** ~7-9 horas (estimativa somando DEC-4..8).
