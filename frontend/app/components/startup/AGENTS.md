# AGENTS.md - app/components/startup

## Propósito
Componentes para fluxo de startup — dropdown em cascata Categoria → Áreas (ADR-007 §3.2).

## Dependências
- Internas: `~/hooks/use-categories`, `~/hooks/use-areas-by-category`
- Externas: `@tanstack/react-query`

## Mapa de Arquivos

[startup-cascata-select.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup/startup-cascata-select.tsx) (NOVO — dropdown Categoria → Áreas), [startup-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup/startup-form.tsx) (NOVO — wrapper de integração com react-hook-form)

## Conceitos

### ADR-007 §3.2 — Dropdown em cascata
- Categoria: agrupamento amplo (Fintech, Edtech, etc.) — busca `GET /api/categories`
- Área: nicho específico belonging to Category — busca `GET /api/categories/:id/areas`
- Trocar categoria LIMPA área selecionada (força reescolha)
- Validação cruzada: área deve pertencer à categoria selecionada

### Hooks TanStack Query
- `useCategories()` — query por `/api/categories`, staleTime 5min
- `useAreasByCategory(categoryId)` — query por `/api/categories/:id/areas`, enabled !!categoryId, staleTime 5min
