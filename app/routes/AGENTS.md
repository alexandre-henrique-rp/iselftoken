# ROUTES KNOWLEDGE BASE

**Generated:** 2026-03-21
**Scope:** frontend/app/routes/

## OVERVIEW

React Router v7 file-based routing: 14 page routes + 24 API resource routes (server-side proxies to NestJS backend).

## STRUCTURE

```
routes/
├── api/              # 24 resource routes (server-side only)
│   ├── auth/         # login, register, logout, token, 2FA, refresh
│   ├── payment/      # pix, card, checkout, transactions, cancel
│   ├── plans/        # findall, subscription
│   ├── startups/     # list-my, post, update
│   ├── user/         # me, update, upload-doc
│   ├── document/     # upload
│   └── geral/        # paises, estados, cidade, cep, cnpj
├── layout/           # Auth-guarded layout wrapper (sidebar + breadcrumb)
├── page/             # Public pages (index, startup detail)
├── private/          # Auth-protected pages (home, plans, perfil, startups/*)
└── public/           # Unauthenticated pages (login, cadastro, checkout, 2FA)
```

## ROUTING

Config in `routes.ts` using `@react-router/dev/routes` helpers:
- `index()` for root route
- `route(path, file)` for explicit paths
- `layout(file, [...])` for nested auth-guarded routes

Private routes wrapped by `layout/index.tsx` which validates JWT via `getValidToken()`, redirects to `/login` if invalid.

## API PROXIES

Resource routes (no UI) that forward requests to `process.env.API_URL`. Pattern:
1. Validate request method + body with Zod
2. Extract/validate auth token from cookies
3. `fetch()` to backend API with Bearer token
4. Return `Response.json()` with backend data

External APIs: `API_BRASIL` for CEP/CNPJ/location lookups.

## PATTERNS

**Page routes** export:
- `meta()` for SEO tags
- `loader()` for server data fetching (GET)
- `action()` for form mutations (POST/PUT/DELETE)
- `default` component for UI

**API routes** export:
- `action()` for POST mutations (login, payment, upload)
- `loader()` for GET queries (cep, cnpj, plans)

**Auth flow:**
- Login sets HTTP-only cookies (token, refreshToken) via `createLoginCookies()`
- Layout loader checks `getValidToken()` before rendering private routes
- 2FA uses encrypted cookie + redirect to `/auth/:hash`

**Common imports:**
- `~/filter/auth.filter` - token validation, cookie checks
- `~/context/AuthContext` - cookie creation helpers
- `~/lib/special-functions` - encryption utilities
- `~/types/*` - TypeScript interfaces
