# FRONTEND KNOWLEDGE BASE

**Project:** iSelfToken Frontend
**Stack:** React Router v7 + React 19 + Tailwind v4 + shadcn/ui

## OVERVIEW

React Router v7 SPA with SSR. 14 page routes + 24 API proxy routes forwarding to backend at `localhost:7077`. Client-side auth via encrypted cookies and `jose` JWT handling.

## STRUCTURE

```
app/
├── routes/
│   ├── api/              # 24 resource routes (BFF proxy)
│   ├── layout/           # Auth-guarded private layout
│   ├── page/             # Public pages
│   ├── private/          # Authenticated pages
│   └── public/           # Login, register, checkout
├── components/           # shadcn/ui + startup cards + layouts
├── context/              # AuthContext.tsx
├── filter/               # auth.filter.ts (server-side guards)
├── constants/            # Cookie definitions
├── lib/                  # Utils + special functions
├── hooks/                # use-mobile.ts
├── types/                # 13 .d.ts definitions
└── root.tsx              # App shell
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Route definitions | `app/routes.ts` |
| API proxy pattern | `app/routes/api/auth/login.ts` (example) |
| Auth context (client) | `app/context/AuthContext.tsx` |
| Auth guard (server) | `app/filter/auth.filter.ts` |
| Private layout + loader | `app/routes/layout/index.tsx` |
| Cookie encryption | `app/constants/cookies.ts` |
| UI primitives | `app/components/ui/` (19 shadcn components) |
| Type definitions | `app/types/` (13 files) |
| Theme config | `app/root.tsx` (ThemeProvider + dark mode script) |

## CONVENTIONS

- **Routing:** React Router v7 file-based. `routes.ts` maps paths. Use `loader` for data, `action` for mutations.
- **API proxies:** Routes in `routes/api/` act as BFF. Validate with Zod, forward to backend, set encrypted cookies.
- **Auth:** `AuthContext` wraps app in `root.tsx`. Private routes use layout loader with `getValidToken()`.
- **Components:** shadcn/ui primitives in `components/ui/`. Import via `~/components/ui/button`.
- **Styling:** Tailwind v4 + `cn()` from `lib/utils.ts` + dark mode via `next-themes`.
- **Forms:** react-hook-form + Zod (client/server).
- **Toasts:** Sonner. **Types:** `.d.ts` in `types/`. **Language:** PT-BR.

## AUTH FLOW

Login form → POST `/api/auth/login` (resource route) → Zod validate → backend JWT → encrypt tokens into httpOnly cookies → `AuthContext` fetches `/api/user/me` → layout loader checks `getValidToken()` → redirect if invalid.

Cookies: `token` (30min), `refreshToken` (7d), encrypted with `jose`.

## STYLING

- **Tailwind v4** + CSS variables + dark mode via `next-themes`
- **shadcn/ui** (19 components): button, card, dialog, input, select, sidebar, etc.
- **Radix UI** primitives, **Lucide** icons, **Inter** font

## ANTI-PATTERNS

- **Zero test setup** — no test runner configured
- **TODO comments** for incomplete features (2FA, plan logic)
- **Bare `catch` blocks** without error typing
- **`console.log`** in production code
- **No route-level error boundaries** (only root)
