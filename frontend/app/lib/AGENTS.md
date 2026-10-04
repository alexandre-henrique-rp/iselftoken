# AGENTS.md - app/lib

## OVERVIEW

Utilities hub — Tailwind helpers, input formatters, SSR fetch helper, e schemas Zod compartilhados.

## WHERE TO LOOK

| Task                      | Location                         | Notes                                                                                                                            |
| ------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind utilities        | `app/lib/utils.ts`               | cn() class merger                                                                                                                |
| Mask utilities            | `app/lib/mask-utils.ts`          | Input formatters                                                                                                                 |
| SSR fetch helper          | `app/lib/server-fetch.ts`        | Loader-side fetch with cookie propagation                                                                                        |
| Backend URL único         | `app/lib/api-config.ts`          | `BACKEND_URL` constant (resolvido em build via `import.meta.env.VITE_API_URL`); todos os 17 BFFs em `routes/api/` importam daqui |
| Login schema (Zod)        | `app/lib/login-schema.ts`        | Validação client-side de email + senha no `LoginForm`                                                                            |
| Startup schema (Zod)      | `app/lib/startup-schema.ts`      | Validação de criação/edição de startup                                                                                           |
| Fund transfer types (B12) | `app/lib/fund-transfer-types.ts` | `RepasseStatus`, `FundTransferInstallment`, `NotaFiscal`, `aggregateStatus()`                                                    |
| Query client factory      | `app/lib/query-client.ts`        | `createQueryClient()` — staleTime 60s, retry 1 (Fase 3A)                                                                         |
| Query options + fetchers  | `app/lib/queries.ts`             | `authStatusQueryOptions`, `meQueryOptions` (cliente) e `fetchAuthStatusServer`/`fetchMeServer` (loaders SSR)                     |

## UTILS STRUCTURE

| Symbol | Type     | Location                     | Role |
| ------ | -------- | ---------------------------- | ---- |
| cn()   | Function | clsx + tailwind-merge merger |

## MASK-UTILS STRUCTURE

| Symbol           | Type     | Location           | Role |
| ---------------- | -------- | ------------------ | ---- |
| formatCNPJ()     | Function | CNPJ formatter     |
| formatCPF()      | Function | CPF formatter      |
| formatPhone()    | Function | Phone formatter    |
| formatCurrency() | Function | Brazilian currency |
| formatCEP()      | Function | CEP formatter      |

## SERVER-FETCH STRUCTURE

| Symbol        | Type     | Role                                                     |
| ------------- | -------- | -------------------------------------------------------- |
| serverFetch() | Function | Same-origin fetch with cookie forwarding for SSR loaders |

## API-CONFIG STRUCTURE

| Symbol      | Type            | Role                                                     |
| ----------- | --------------- | -------------------------------------------------------- |
| BACKEND_URL | Constant string | URL base do backend NestJS; resolvida em build pelo Vite |

## SCHEMAS (Zod)

| Symbol                                                                                 | File                        | Role                                                                                               |
| -------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| loginSchema, LoginInput                                                                | `login-schema.ts`           | Schema de email + senha do `LoginForm`                                                             |
| startupSchema                                                                          | `startup-schema.ts`         | Schema de criação/edição de startup                                                                |
| AdminDashboardSummary, AdminDashboardKpis, AdminPendingRedemption, AdminActiveCampaign | `queries.ts`                | Tipos do resumo executivo /admin/dashboard (8 KPIs + 2 séries + 2 filas)                           |
| Candidatura, CandidaturaStatus                                                         | `affiliate-types.ts`        | Tipos compartilhados entre páginas e componentes de afiliados (triagem do fundador, admin)         |
| SealItem, SealAssignment                                                               | `seal-types.ts`             | Tipos compartilhados para `/compliance/seals` (catálogo + atribuições)                             |
| ComplianceUser                                                                         | `compliance-types.ts`       | Tipos compartilhados para `/compliance/users` (lista paginada + filtros)                           |
| AuditLogEntry, StartupDocumentItem                                                     | `audit-types.ts`            | Tipos compartilhados para timeline de auditoria + checklist de documentos CVM                      |
| DocumentRequestItem                                                                    | `document-request-types.ts` | Tipos compartilhados para solicitações de documentos extras (AC-07)                                |
| PlanItem, PlanStats, DEFAULT_BENEFITS                                                  | `plan-types.ts`             | Tipos compartilhados para o painel de Planos (Financeiro/Admin) + array de sugestões de benefícios |

## QUERY (TanStack Query — Fase 3A)

| Symbol                                                           | File              | Role                                                                   |
| ---------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| createQueryClient                                                | `query-client.ts` | Factory — singleton no client, per-request no SSR loader               |
| authStatusQueryOptions                                           | `queries.ts`      | `["auth-status"]` queryOptions client-side                             |
| meQueryOptions                                                   | `queries.ts`      | `["me"]` queryOptions client-side; consumir via `useUser()`            |
| planQueryOptions(id)                                             | `queries.ts`      | `["plan", id]` factory; staleTime 5min (Fase 3B.1)                     |
| countriesQueryOptions                                            | `queries.ts`      | `["countries"]` staleTime Infinity (Fase 3B.3)                         |
| notificationsPageQueryOptions(page)                              | `queries.ts`      | `["notifications", page]` factory (Fase 3B.4)                          |
| notificationsUnreadCountQueryOptions                             | `queries.ts`      | `["notifications-unread-count"]` com `refetchInterval` 30s (Fase 3B.4) |
| fetchAuthStatusServer                                            | `queries.ts`      | Helper SSR para loaders (recebe `request`); reservado pra Fase 3       |
| fetchMeServer                                                    | `queries.ts`      | Idem                                                                   |
| AuthStatus, PlanRaw, Country, NotificationRaw, NotificationsPage | `queries.ts`      | Tipos exportados                                                       |

## CONVENTIONS

- Mask formatters retornam string; sem validação interna (validação separada)
- Input mask pattern: `\D+` removal + pattern application
- Brazilian locale focus (BRL currency, CEP, CNPJ, CPF)
- Schemas Zod com mensagens em PT-BR

## ANTI-PATTERNS

- Não validar dentro de formatters (validação separada)
- Não declarar `BACKEND_URL` em cada BFF — sempre importar de `api-config.ts`
- Não misturar `process.env` com nomes `VITE_*` (Vite só substitui `import.meta.env.X`)
