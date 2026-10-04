# AGENTS.md - app/routes/layout

## Propósito
Layout root que envolve todas as rotas autenticadas — loader server-side faz gating (`serverFetch("/api/auth/status")` + `"/api/users/me"`), redireciona para `/login`/`/2fa`/`/pricing` quando necessário. Hidrata cache de Query via `setQueryData` + `dehydrate`.

## Dependências
- Internas: `app/components/layout/*` (sidebar/top-navbar/floating-cta), `app/lib/server-fetch`, `app/lib/queries`
- Externas: `react-router`, `@tanstack/react-query`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [index.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/layout/index.tsx) | Layout root + loader de auth gating + `<HydrationBoundary>` |