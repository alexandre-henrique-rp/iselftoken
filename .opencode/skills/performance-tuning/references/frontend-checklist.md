# Frontend Checklist — Verificações por Página

Checklist F1–F13 aplicada a **cada rota** do iSelfToken. Para cada item, há comando `ripgrep` ou `inspect` específico que a skill executa durante a Fase 1 (Recon) e Fase 3 (Diagnose).

> **Convenção:** rotas privadas ficam em `frontend/app/routes/private/` (e aninhadas); públicas em `frontend/app/routes/public/`; BFFs em `frontend/app/routes/api/`.

---

## F1 — Loader SSR com Hidratação Completa

**Critério:** Toda rota privada com dados deve ter `loader` + `queryClient.setQueryData` + `dehydrate` + `<HydrationBoundary>` no componente.

**Comando:**
```bash
rg -l "HydrationBoundary" frontend/app/routes/private/ frontend/app/routes/public/
```

**Anti-pattern:**
```typescript
// ERRADO — loader busca mas não hidrata
export async function loader({ request }) {
  const data = await fetch("/api/foo");
  return { data };
}
// Causa waterfall: 1 request no SSR + 1 request no client após hidratação
```

**Correto (padrão canônico):**
```typescript
export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = createQueryClient();
  const res = await serverFetch(request, "/api/foo");
  const data = await res.json();
  queryClient.setQueryData(fooQueryOptions.queryKey, data);
  return { dehydratedState: dehydrate(queryClient) };
}

export default function Page({ loaderData }) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <FooContent />
    </HydrationBoundary>
  );
}
```

**Severidade:** Bloqueante — qualquer rota privada que retorna dados sem `HydrationBoundary` recebe flag vermelho.

---

## F2 — Layout é Fonte Única de Sessão

**Critério:** Rota filha nunca chama `/api/users/me` ou `/api/auth/status` no próprio loader.

**Comando:**
```bash
rg -n 'fetch.*"/api/users/me"|fetch.*"/api/auth/status"' frontend/app/routes/
rg -n 'serverFetch.*"/api/users/me"|serverFetch.*"/api/auth/status"' frontend/app/routes/private/
```

**Correto:** usar `useUser()` ou `useAuthStatus()` (hooks lêem cache populado pelo layout).
**Severidade:** Bloqueante.

---

## F3 — Query Keys Centralizadas

**Critério:** Toda `queryKey` reside em `frontend/app/lib/queries.ts` ou via helper `queryKeys.*`. Proibido strings mágicas inline.

**Comando:**
```bash
rg -n 'queryKey.*\["' frontend/app/routes/ frontend/app/hooks/ | grep -v 'lib/queries.ts'
```

**Severidade:** Alta.

---

## F4 — staleTime Apropriado

**Critério:**
- Padrão global: `60_000` (definido em `lib/query-client.ts`)
- Dados quase estáticos (Países, Planos, Categorias, Tipos de Documento): `staleTime: Infinity`
- Sessão (`me`, `auth-status`): `60_000` (invalidados só por mutações)
- `refetchOnWindowFocus: false` global

**Comando:**
```bash
rg -B1 "staleTime" frontend/app/lib/queries.ts | rg -A1 "Infinity|60_000|30_000|5 \* 60_000"
```

**Severidade:** Média — páginas com `staleTime: 0` disparam refetch desnecessário.

---

## F5 — Sem `fetch` Solto em `useEffect`

**Critério:** Proibido `useEffect(() => { fetch(...) }, [])` para dados de servidor.

**Comando:**
```bash
rg -B1 -A3 "useEffect" frontend/app/routes/ frontend/app/components/ | rg -B1 "fetch\("
```

**Severidade:** Bloqueante.

---

## F6 — BFF Próprio (Sem BACKEND_URL Direto)

**Critério:** Loaders e hooks nunca chamam `${BACKEND_URL}` direto. Sempre passam por `serverFetch(request, "/api/...")` ou rotas em `app/routes/api/*`.

**Comando:**
```bash
rg -n 'BACKEND_URL' frontend/app/routes/layout/ frontend/app/routes/private/
rg -n 'VITE_API_URL' frontend/app/routes/
```

**Severidade:** Bloqueante.

---

## F7 — Loaders Paralelos (Promise.all)

**Critério:** Loaders que fazem múltiplos fetches devem usar `Promise.all`. Sequencial é anti-pattern.

**Comando:**
```bash
rg -B1 -A5 "async function loader" frontend/app/routes/ -g '*.tsx' | rg -A4 "await serverFetch"
```

**Severidade:** Média — cada `await` sequencial adiciona latência cumulativa.

---

## F8 — Code Splitting por Chunk

**Critério:** Cada rota deve gerar seu próprio chunk JS (RR7+Vite 8 fazem isso automaticamente). Verificar que chunks não compartilham dependências pesadas.

**Comando:**
```bash
ls frontend/build/client/assets/*.js | wc -l
ls -la frontend/build/client/assets/ | awk '{print $5, $9}' | sort -n | tail -20
```

**Severidade:** Média — bundle > 200KB por rota é red flag.

---

## F9 — Componentes Pesados com Lazy/Suspense

**Critério:** Componentes pesados (charts, editor TipTap, player de vídeo) devem usar `React.lazy` ou `<Suspense>` para evitar bloquear first paint.

**Comando:**
```bash
rg -n "React\.lazy|lazy\(" frontend/app/components/
rg -n "<Suspense" frontend/app/components/ frontend/app/routes/
```

**Severidade:** Média — gráfico de chart.js sem lazy bloqueia render inicial.

---

## F10 — shouldRevalidate Otimizado

**Critério:** Layout deve revalidar apenas em mutations, não em navegações GET (evita waterfall em rotas filhas).

**Comando:**
```bash
rg -B1 -A8 "shouldRevalidate" frontend/app/routes/layout/
```

**Severidade:** Baixa — afeta UX em navegação rápida.

---

## F11 — Imagens com loading="lazy"

**Critério:** `<img>` abaixo da dobra devem ter `loading="lazy"` + `width`/`height` explícitos (evita CLS).

**Comando:**
```bash
rg -n '<img ' frontend/app/components/ | rg -v 'loading="lazy"' | head -20
rg -n '<img ' frontend/app/components/ | rg -v 'width=' | head -20
```

**Severidade:** Média — sem `width`/`height` causa layout shift (CLS ruim para LCP).

---

## F12 — Fontes Preloadadas

**Critério:** Fonte Inter deve estar pré-carregada no `<head>` para evitar FOUT e melhorar LCP.

**Comando:**
```bash
rg -n 'rel="preload"' frontend/app/root.tsx
rg -n 'font-display' frontend/app/
```

**Severidade:** Média — afeta LCP diretamente.

---

## F13 — Prefetch em Links Quentes

**Critério:** `<Link>` para rotas muito acessadas deve usar `prefetch="intent"` ou `prefetch="render"` (RR7).

**Comando:**
```bash
rg -B1 -A1 "<Link " frontend/app/components/layout/ | rg -v 'prefetch'
```

**Severidade:** Baixa — otimização incremental.

---

## Procedimento de Auditoria por Página

Para cada rota priorizada:

1. Identificar arquivo: `frontend/app/routes/<path>.tsx`
2. Rodar F1–F13 (comandos acima com escopo `--iglob "<arquivo>.tsx"`)
3. Medir TTFB/FCP/LCP via Lighthouse
4. Listar queries TanStack disparadas e seus `staleTime`
5. Listar BFFs chamados (cross-ref `backend-checklist.md`)
6. Listar chunks JS consumidos e seu tamanho
7. Gerar entrada na seção "Detalhamento por página" do relatório

---

## Métricas por Página (template)

```markdown
### Página: /admin/dashboard
- **Path**: frontend/app/routes/private/admin/dashboard.tsx
- **Tipo**: SSR private (role: ADMIN)
- **Loader**: `requireAuthorizedUser` + 0 fetches paralelos
- **Chunks JS**: admin.dashboard-BvRk9kiK.js (47 KB gzip)
- **TTFB**: 1850ms | **FCP**: 1800ms | **LCP**: 2800ms | **CLS**: 0.05
- **TanStack queries**: 4 (staleTime: 0 — refetch imediato)
- **BFFs chamados**: /api/admin/dashboard/summary (30+ agregados)
- **F1**: OK | **F2**: OK | **F3**: OK | **F4**: FALHA (staleTime 0) | **F5**: OK | **F6**: OK | **F7**: FALHA (sequencial) | **F8**: OK | **F9**: N/A | **F10**: OK | **F11**: OK | **F12**: OK | **F13**: N/A
```
