# PROJECT KNOWLEDGE BASE — FRONTEND

**Last updated:** 2026-09-30 (Sprint S34 — CSRF allowedActionOrigins + SQLite `mode: 'insensitive'` fix)
**Stack:** React Router 7.14 (SSR) + React 19 + TypeScript strict + Tailwind 4 + TanStack Query 5 + Vite 8
**Roles:** INVESTOR, FOUNDER, ADMIN, COMPLIANCE, FINANCEIRO, AFFILIATE, SUPPLIER (ver `app/lib/roles.ts`)

## OVERVIEW

Frontend SPA para plataforma fintech iSelftoken. Cookies HTTP-only para sessão (sem `localStorage` para tokens). BFFs em `app/routes/api/*` proxiam o backend NestJS, todos importando `BACKEND_URL` de `app/lib/api-config.ts` (resolvido em build time via `import.meta.env.VITE_API_URL`, default `http://localhost:7077`). Estado de auth/`user` via TanStack Query com hidratação SSR a partir do layout loader. **Sem AuthContext** — provider chain enxuto: `<QueryClientProvider><ToastProvider>` (Fase 3C).

### CSRF protection (Sprint S34 — bug `/admin/startups/:id/:phase` retornando 400)

`react-router.config.ts` define `allowedActionOrigins` para que o React Router 7 não aborte actions (POST/PUT/PATCH/DELETE em rotas UI) com `400 Bad Request` quando `Origin !== Host`. Detalhes e lista padrão em comentários no próprio arquivo. Para customizar, sobrescreva via env `ALLOWED_ACTION_ORIGINS` (CSV).

**⚠️ IMPORTANTE — dev server:** mudanças em `react-router.config.ts` **não são recarregadas via HMR** do Vite (é um arquivo de config, não do app). Após pull, **sempre reinicie o dev server** (`Ctrl+C` + `pnpm run dev`) para garantir que a nova config seja avaliada.

**`vite.config.ts` força `host: 'localhost'`** (não `127.0.0.1` ou `0.0.0.0`) para garantir que o `Host` header sempre case com o `Origin` que o browser envia ao acessar `http://localhost:5173`. Sem isso, Windows/Linux podem divergir entre `localhost` e `127.0.0.1`, gerando 400 inexplicável.

**Diagnóstico rápido:**

```bash
cd frontend
pnpm run check:csrf                        # roda contra defaults (22 origens)
ALLOWED_ACTION_ORIGINS=... pnpm run check:csrf  # valida o override
pnpm run check:csrf -- --origin https://staging.iselftoken.com --host staging.iselftoken.com
```

O script replica a lógica EXATA do RR7 v7.14 (`matchWildcardDomain` + `isAllowedOrigin`) e testa 11 cenários comuns (dev local, prod, subdomínios, origens hostis).

**Headers avaliados (RR7 v7.14, `chunk-2UH5WJXA.mjs:throwIfPotentialCSRFAttack`):**

1. `Origin` → `new URL(originHeader).host` (porta inclusa)
2. `X-Forwarded-Host` (preferido sobre `Host` se presente)
3. `Host` (fallback)

Match `Origin === Host` → permitido. Senão, testa match exato OU wildcards (`*` para 1 segmento, `**` para múltiplos no início do pattern). Falha → `handleQueryError(new Error("Bad Request"), 400)` aborta a action ANTES dela executar.

**Lista default atual (22 origens):**

| Categoria | Origens |
|---|---|
| Vite dev | `localhost:5173`-`localhost:5185`, `localhost:4173` (preview) |
| IPv6 | `[::1]:5173` |
| Vite dev mirror | `127.0.0.1:5173-5175`, `127.0.0.1:4173` |
| Prod | `iselftoken.com`, `www.iselftoken.com`, `**.iselftoken.com` |

**Cenários comuns que geram 400:**

| Cenário | Sintoma | Fix |
|---|---|---|
| `X-Forwarded-Host` divergente adicionado por CDN | `Host: iselftoken.com` mas `X-Forwarded-Host: outro.com` | Configurar CDN para preservar host original; OU adicionar domínio correto em `ALLOWED_ACTION_ORIGINS` |
| `Host` com porta (ex.: `iselftoken.com:443`) | Browser envia `Origin` sem porta, Nginx repassa `Host` com porta | Ajustar Nginx para repassar sem porta; OU adicionar `iselftoken.com:443` na lista |
| Subdomínio não listado (ex.: `app.iselftoken.com` em prod) | `**.iselftoken.com` já cobre, mas se `X-Forwarded-Host` estiver divergente, falha | Adicionar subdomínio explícito OU garantir `Host` consistente |
| Dev server em porta > 5185 | Outra instância de Vite consumiu 5173-5185 | Matar processos Vite órfãos OU ajustar a env `ALLOWED_ACTION_ORIGINS` |
| Dev server rodando mas `react-router.config.ts` mudou | HMR não recarrega config; 400 persiste | Reiniciar dev server (`Ctrl+C` + `pnpm run dev`) |
| Build de prod sem env setada | Lista default cobre prod, mas se a config for sobrescrita errada, quebra | Setar `ALLOWED_ACTION_ORIGINS` explicitamente no env de prod |

**Em prod (`infra/prod/ec2-frontend/user-data.sh`):** `ALLOWED_ACTION_ORIGINS` é setado explicitamente como `iselftoken.com,www.iselftoken.com,**.iselftoken.com` no `.env` do container — defense in depth caso alguém altere os defaults do `react-router.config.ts` sem perceber o impacto.

### Design System (v1.2 — Brand Unification)

- **Cor primária:** magenta `#d500f9` (alinhada à logo "iSelfToken") — definida em `app/styles/theme.css` como `--color-primary`.
- **Background:** preto puro `#000000` (era `#0a0a0a`).
- **Fonte:** Inter Variable (`@fontsource-variable/inter`).
- **Emerald** (`#34d399`): reservado APENAS para semântica financeira terminal (repasse concluído, KYC validado). Não usar como acento decorativo.
- **Skills oficiais:** `.agents/skills/frontend-style-guide/`, `frontend-reviewer/`, `frontend-architecture/` (também espelhadas em `.opencode/skills/` e `.kiro/skills/`).
- **Doc mestre:** `frontend/STYLE_GUIDE.md`.

## STRUCTURE

```
frontend/
├── app/                            # React Router application
│   ├── root.tsx                    # Root component (providers + global styles)
│   ├── routes.ts                   # Single source of truth — TODAS as rotas registradas manualmente
│   ├── app.css                     # Global CSS reset / tokens
│   ├── routes/                     # File-based route handlers
│   │   ├── public/                 # Rotas públicas (landing, login, register, 2FA, forgot/reset password)
│   │   ├── private/                # Rotas autenticadas (gated pelo layout)
│   │   ├── founder/                # Founder public routes (auth-gated)
│   │   ├── layout/                 # Layout routes (index.tsx com loader de auth)
│   │   ├── error/                  # Páginas de erro (401, 404, 500)
│   │   ├── api/                    # BFFs (proxies ao backend NestJS) — ~105 rotas
│   │   ├── admin/                  # Admin UI routes
│   │   ├── founder/                # Founder UI routes
│   │   ├── compliance/             # Compliance UI routes
│   │   ├── financeiro/             # Financeiro UI routes
│   │   ├── layout/                 # Shared layouts
│   │   ├── public/                 # Public marketing pages
│   │   └── private/                # Private auth-gated pages
│   ├── components/                 # Componentes por feature (~25 grupos)
│   │   ├── landing/                # Hero, navbar, footer, carousel-3d, opportunities, how-it-works, featured-rounds, testimonials-*, recently-added, privacy-policy-content, terms-of-use-content, early-access-ranking
│   │   ├── login/                  # Login (container + hero + form)
│   │   ├── auth/                   # Auth compartilhado (2FA, register, forgot/reset, validate-email, politica-privacidade, termos-de-uso)
│   │   ├── layout/                 # Sidebar, top-navbar, floating-cta, account-nav
│   │   ├── marketplace/            # Marketplace banner + grids + early-access + featured
│   │   ├── startup-detail/         # Hero + pitch-video + metrics + business-summary + team + risk-docs + real-investors + investor-forum + investment-sidebar
│   │   ├── wallet/                 # Editorial wallet (shell + bento + asset-list + asset-row + transaction-statement + withdraw-*)
│   │   ├── checkout/               # Checkout (header + summary + credit-card-form + pix-payment + campaign-investment + coupon-field + card-checkout + pix-checkout + success/error/pending/expired)
│   │   ├── checkout-payment/       # Wrapper do fluxo de pagamento EFI
│   │   ├── profile/                # KYC + identidade + endereço + plano + documentos + liveness + biometric
│   │   ├── notifications/          # notification-header + notification-card (centro de notificações)
│   │   ├── pricing/                # pricing-header + pricing-card
│   │   ├── founder/                # Painel fundador (dashboard + edit + create + captacao + offer + repasse + termo-adesao + new-startup-wizard + 30+ componentes)
│   │   ├── affiliate/              # Affiliate (candidatura + triagem + history)
│   │   ├── admin/                  # Admin global (dashboard + startups + users + kyc + history + config + email-templates + financeiro + payout + phase)
│   │   ├── compliance/             # Compliance (dashboard + users + campaigns + seals + repasses + audit + document-requests)
│   │   ├── coupons/                # Central de cupons (admin + user)
│   │   ├── financeiro/             # Financeiro (dashboard + split + repasse-config + plan-stats + approve-payment-modal + cancel-modal)
│   │   ├── investor/               # Investor (dashboard + invested-startups + metrics)
│   │   ├── notifications.tsx       # Top-level notifications container (Fase 3B.4)
│   │   ├── toast/                  # Toast wrapper (Sonner)
│   │   ├── transparency/           # Posts/discussões públicas (cards + editor + thread + upvote + pin + filters)
│   │   ├── startup/                # Startup (helper cards)
│   │   ├── startup-detail/         # Hero + métricas + team + risk-docs
│   │   ├── ui/                     # Primitivos: animated-modal, drawer, empty-states, global-loading, initials-image, pagination, select-pais, sonner, toast, upload-zone
│   │   ├── error/                  # error-container
│   │   ├── system/                 # System helpers
│   │   └── foundation/            # Foundation components
│   ├── hooks/                      # Custom hooks TanStack Query / auth (~125 arquivos) — ver `app/hooks/AGENTS.md`
│   ├── lib/                        # Utils, schemas Zod, queries, server-fetch — ver `app/lib/AGENTS.md`
│   ├── types/                      # Tipos TypeScript compartilhados (auth, dashboard, marketplace, transparency, repasses, etc.)
│   ├── context/                    # Contexts globais (ToastContext; AuthContext removido Fase 3C)
│   ├── locales/                    # i18n strings (PT-BR default)
│   ├── i18n.ts                     # Configuração i18next
│   ├── styles/                     # theme.css + tokens
│   ├── root.tsx                    # Root component
│   └── routes.ts                   # Single source of truth para rotas
├── public/                         # Static assets (icons/, rede-sociais/)
├── package.json                    # Deps (TanStack Query 5, TipTap, Radix, Embla, framer-motion, payment-token-efi, pdfjs-dist)
├── vite.config.ts                  # Vite 8 + Tailwind 4 plugin
├── react-router.config.ts          # SSR ativado + allowedActionOrigins (S34)
├── tsconfig.json                   # TypeScript strict
├── playwright.config.ts            # Playwright E2E config
├── test/                           # vitest config + e2e/flows + helpers
└── STYLE_GUIDE.md                  # Doc mestre do Design System v1.2
```

## WHERE TO LOOK

### Routes & BFFs

| Task | Location | Notes |
|------|----------|-------|
| Route declarations | `app/routes.ts` | Single source of truth para TODAS as rotas (~290 routes) — não file-based implícito |
| Convenção arquivo ↔ path BFF | `app/routes.ts:54` | Arquivo com hífen (`startups-featured.ts`), path HTTP com barra (`api/startups/featured`). Comentar e manter ordem: rotas estáticas antes de `:id` param. |
| Public routes | `app/routes/public/` | Landing, login, register, 2FA, forgot/reset password, validate-email, politica-privacidade, termos-de-uso, manutencao, referral, startup público |
| Private routes (gated) | `app/routes/private/` | Atrás do layout em `routes/layout/index.tsx` — investor, founder, admin, compliance, financeiro, affiliate |
| Layout / auth gating | `app/routes/layout/index.tsx` | Loader chama `serverFetch` para `/auth/status` + `/users/me`; `throw redirect()` server-side |
| API proxies (BFF) | `app/routes/api/` | **~105 BFFs** proxiando ao backend; todos importam `BACKEND_URL` de `~/lib/api-config` |
| BACKEND_URL único | `app/lib/api-config.ts` | Single source of truth — `import.meta.env.VITE_API_URL` resolvido em build time |
| Error pages | `app/routes/error/` | 401, 404, 500 |
| Special proxy routes | `app/routes/files-proxy.ts`, `icons-proxy.ts`, `pdf-proxy.ts` | Server-side fetch + redirect (imagens/ícones/PDFs autenticados) |

### Hooks (ver `app/hooks/AGENTS.md` para detalhes)

| Domínio | Hooks principais |
|---------|------------------|
| Auth/sessão (Fase 3C) | `useUser`, `useAuthStatus`, `useLoginMutation`, `useRegisterMutation`, `useLogoutMutation`, `useUserRole`, `usePlan` |
| Real-time | `useNotificationsSocket` (singleton socket.io + ref-count), `useMarkAsReadMutation`, `useMarkAllAsReadMutation` |
| Upload / arquivos | `useUpload` (compartilhado), `useFileValidation`, `useCepLookup` |
| Founder | `useCreateStartupMutation`, `useDeleteStartupMutation`, `useCancelRoundMutation`, `usePauseRoundMutation`, `useDashboardOverview`, `useFounderDashboardState`, `useFounderPendingPayments`, `useFounderPaymentsAll`, `useFounderServiceRequests`, `useFounderServices`, `useFounderInvestors`, `useFounderChangeRequests`, `useBlockedRoundToast` |
| Termo de adesão (S18) | `useTermoAdesaoStatus`, `useTermoAdesaoMutation`, `useDocumentoVerificacao` |
| Compliance | `useAuditLogs`, `useStartupDocuments`, `useDocumentRequests`, `useComplianceCampaignDetail`, `useComplianceChangeRequests`, `useComplianceDashboardSummary`, `useComplianceDeliberate`, `useComplianceStartupDecision`, `useComplianceStartupDetail`, `useLatestReviewDecision` |
| Admin | `useAdminDashboardSummary`, `useAdminUsers`, `useAdminStartups`, `useAdminKyc`, `useAdminPayments`, `useAdminServices`, `useAdminConfig`, `useAdminAffiliate`, `useAdminFundraisingConfig`, `useUpdateUserStatusMutation` |
| Plans / Financeiro | `usePlansAdmin` (TanStack: list/stats/create/update/delete), `useUpdateConfigMutation`, `usePricingSubscriptionMutation` |
| Coupons | `useCoupons`, `useAvailableCoupons`, `useApplyCoupon`, `useCreateCoupon`, `useUpdateCoupon`, `useToggleCouponStatus`, `useCouponPermissions`, `useCouponAudit`, `useCouponUsages`, `useMyCouponUsage` |
| Email Templates (FIN-05) | `useEmailTemplates`, `useEmailTemplate`, `useCreateEmailTemplateVersion`, `useUpdateEmailTemplateVersion`, `usePublishEmailTemplateVersion`, `usePreviewEmailTemplateVersion` |
| Repasses (FIN-09) | `useRepasseDashboard`, `useFinanceiroConfigureRepasse`, `useFinanceiroSplit`, `useMarkInstallmentPaid`, `useApproveInstallment`, `useRejectInstallment`, `useResubmitSolicitacao` |
| Installment (FIN-10) | `useApprovePaymentMutation`, `useCancelPaymentMutation`, `useGeneratePixMutation`, `useConfirmCardMutation`, `useEfiCheckout` |
| Wallet | `useInvestedStartups`, `useRelatedStartups`, `useInvestorDashboard` |
| Transparency | `useTransparencyPosts`, `useTransparencyMutations`, `useTransparencyDiscussions`, `useTransparencyDiscussionMutations`, `useTransparencyDiscussionUpvote`, `useTransparencyDiscussionPin`, `useTransparencyFeaturedReport`, `useTransparencyInstallmentPosts` (Sprint S36 — FIN-11 §8.2: filtra auto-posts `sourceType=INSTALLMENT_REQUEST`) |
| Affiliate | `useAdminAffiliate` |
| Notifications | `useNotificationsSocket`, `useMarkAsReadMutation`, `useMarkAllAsReadMutation`, `useNotificationsSocket` |
| Auth forms / profile | `useForgotPasswordMutation`, `useResetPasswordMutation`, `useChangePasswordMutation`, `useVerify2faMutation`, `useValidateEmailMutation`, `useUpdateAddressMutation`, `useUpdateIdentityMutation`, `useUpdateAffiliateMutation`, `useUpdateStartupTeamMutation` |
| Campaigns / Startup | `useCreateSolicitacao`, `useCancelRoundMutation`, `usePauseRoundMutation`, `useCampaignResources`, `useStartToStartupsDetail`, `useStartupDetail`, `useStartupIdentity`, `useStartupDocuments` |

### Lib (ver `app/lib/AGENTS.md`)

| Categoria | Localização |
|-----------|-------------|
| Tailwind utilities | `app/lib/utils.ts` (`cn()` class merger) |
| Mask utilities (BRL, CPF, CNPJ, CEP, phone) | `app/lib/mask-utils.ts`, `cnpj-format.ts`, `currency-format.ts` |
| SSR fetch helper (cookie forwarding) | `app/lib/server-fetch.ts` |
| BACKEND_URL único | `app/lib/api-config.ts` (`import.meta.env.VITE_API_URL`) |
| Query client factory | `app/lib/query-client.ts` (`createQueryClient()` — staleTime 60s, retry 1) |
| Query options + fetchers | `app/lib/queries.ts` (authStatus, me, plan, countries, notificationsPage, notificationsUnread, investedStartups + tipos) |
| Schemas Zod | `app/lib/login-schema.ts`, `startup-schema.ts`, `new-startup-schema.ts`, `coupon-schema.ts`, `round-distribution-schema.ts`, `termo-adesao-text.ts`, `banking-schema.ts`, `card-payment-profile.ts`, `repasse-schemas.ts`, `fund-transfer-types.ts`, `documento-verificacao-types.ts` |
| Tipos compartilhados | `app/types/` (auth, dashboard, email-template, marketplace-*, transparency, banner-slide, category-item, curated-pick, founder-startup, landing-data, etc.) |
| Auth policy / roles | `app/lib/auth-policy.ts`, `app/lib/roles.ts` |
| Form context | `app/lib/edit-startup-form-context.tsx` |
| Cookie helpers | `app/lib/cookies.ts` |
| Loaders SSR auxiliares | `app/lib/new-startup-loader.ts`, `startup-loader.ts`, `termo-adesao-loader.ts`, `phase-loader.server.ts`, `compliance-dashboard-loader.server.ts`, `compliance-users-loader.ts`, `compliance-navigation.ts` |
| i18n | `app/i18n.ts`, `app/locales/` |
| Utilitários diversos | `asset-url.ts`, `audit-types.ts`, `card-payment-profile.ts`, `change-request-types.ts`, `client-ip.ts`, `document-request-types.ts`, `documento-verificacao-types.ts`, `form-styles.ts`, `kyc-status.ts`, `marketplace-banner.ts`, `normalize.ts`, `payment-presentation.ts`, `plan-types.ts`, `post-auth-redirect.ts`, `repasse-schemas.ts`, `sanitize-html.ts`, `seal-types.ts`, `startup-enums.ts`, `startup-status.ts`, `team-payload.ts`, `upload-url.ts`, `use-auto-save-draft.ts` |

### Components por feature

Ver `app/components/AGENTS.md` para inventário detalhado (~30 grupos). Principais:

- **Landing/Auth**: `landing/`, `login/`, `auth/`
- **App shell**: `layout/` (sidebar, top-navbar, floating-cta, account-nav)
- **Dashboards**: `founder/`, `admin/`, `compliance/`, `financeiro/`, `investor/`, `notifications.tsx`
- **Marketplace + Detalhes**: `marketplace/`, `startup-detail/`, `transparency/`
- **Transações**: `wallet/`, `checkout/`, `checkout-payment/`, `coupons/`
- **Onboarding/Perfil**: `profile/`, `pricing/`
- **Afiliados**: `affiliate/`
- **Comuns**: `ui/` (primitivos), `error/`, `toast/`

### Entry config

| Arquivo | Função |
|---------|--------|
| `vite.config.ts` | Vite 8 + Tailwind 4 plugin + path alias `~/` |
| `react-router.config.ts` | SSR ativado (`ssr: true`) + `allowedActionOrigins` (S34) |
| `tsconfig.json` | TypeScript strict + path alias `~/*` para `app/*` |
| `playwright.config.ts` | Playwright E2E |
| `app/root.tsx` | Provider chain: `<QueryClientProvider><ToastProvider>` + `<HydrationBoundary>` no layout |

## ARQUITETURA DE AUTH (pós-Fase 3C)

**Regra de autorização:** `useUserRole()` e `hasRole()` são gates cosméticos de UI. Eles podem esconder ou exibir botões e affordances, mas nunca autorizam uma operação. Toda decisão de permissão deve ser revalidada no backend, com a sessão HTTP-only e o `AuthGuard` combinado ao guard de domínio apropriado (`AdminGuard`, `ComplianceGuard` ou `FinanceRoleGuard`). Alterar o DOM, mockar `/api/users/me` ou chamar um BFF diretamente não pode contornar essa validação.

**Roles (`app/lib/roles.ts`):** `INVESTOR` | `FOUNDER` | `ADMIN` | `COMPLIANCE` | `FINANCEIRO` | `AFFILIATE` | `SUPPLIER`.

**Fluxo de login (cliente):**
1. `LoginForm.handleSubmit` → `useLoginMutation().mutateAsync({email, senha})` → `POST /api/auth`
2. BFF (`routes/api/auth.ts`) repassa `Set-Cookie` do backend (`session_id`, e em sucesso de 2FA `2fa_token`)
3. Mutation `onSuccess` invalida `[auth-status]` + `[me]` automaticamente — Query refetcha e UI atualiza
4. `LoginForm` deriva `redirect` de `result.requiresVerification` e navega `replace: true` para `/2fa` ou `/home`

**Gating de rotas privadas (servidor):**
- `app/routes/layout/index.tsx` tem `loader` que chama `serverFetch(request, "/api/auth/status")` + `/api/users/me`
- Redirects via `throw redirect("/login" | "/2fa" | "/pricing")` — 302 server-side, sem flash
- Componente consome via `useLoaderData<typeof loader>()` — **não** `useAuth()` para `user` neste arquivo

**Auth status check (BFF, pós-Fase 2A.2):** `auth-status.ts` proxia ao backend `GET /auth/check-af2`. Traduz:
- 200 + `data.af2Verified === true` → `{isAuthenticated: true, isAuthorized: true}`
- 200 + `af2Verified` falsy → `{true, false}`
- 401 com body `{redirect: "/2fa"}` → `{true, false}` (sessão válida, 2FA pendente)
- 401 sem `redirect` (sessão ausente/inválida/expirada) → `{false, false}`
- Network error / 5xx → `{false, false}` (defensivo)

**LoginForm:** valida via Zod (`login-schema.ts`) ANTES de chamar `mutateAsync`. Erro → toast e abort sem trigger no botão.

**Auth state (pós-Fase 3C):** `useUser()` deriva de TanStack Query (`useQuery({queryKey: ["me"], ...})`). Layout loader popula o cache via `setQueryData` (sem refetch duplo) e retorna `dehydratedState`; `<HydrationBoundary>` no Layout component hidrata o cliente. Mutations imperativas (`useLoginMutation`/`useRegisterMutation`/`useLogoutMutation`) gerenciam invalidação por chave em `onSuccess`. Não há mais `AuthContext`/`AuthProvider` — eliminados na Fase 3C.

**Specs e planos vivos:**
- Fase 1 — `../docs/superpowers/specs/2026-05-06-auth-flow-fase1-design.md` + plano correspondente
- Fase 2A.1 (`/checkout/*` exemption) — `2026-05-06-checkout-exemption-design.md` + plano
- Fase 2A.2 (auth-status real) — `2026-05-06-auth-status-real-design.md` + plano
- Fase 2B.3 (refreshAuthStatus best-effort) — `2026-05-06-refresh-auth-status-catch-design.md` + plano
- Fase 2B.1 (Zod LoginForm) e 2B.2 (env standardization) — sem spec separado, decisões registradas em commit messages
- Fase 3A (Query infra + auth via useUser) — `2026-05-06-query-auth-fase3a-design.md` + plano
- Fase 3B / 3C ainda sem spec próprio; backlog na seção "ROADMAP" abaixo

## STATE MANAGEMENT (decisão arquitetural)

| Tipo de estado | Mecanismo | Razão |
|---|---|---|
| Sessão / `user` (cache cliente) | **TanStack Query** (`["me"]`, `["auth-status"]`) | Pós-Fase 3A; loader hidrata via `setQueryData` + `dehydrate` |
| Sessão / `user` (servidor, fetch) | **React Router 7 loaders** + `serverFetch` | Loader autorize-then-prefetch; cache populado e dehydrated |
| Auth actions (login/register/logout) | **TanStack `useMutation`** (`useLoginMutation`/`useRegisterMutation`/`useLogoutMutation`) | Pós-Fase 3C; cache invalidation por chave em `onSuccess` |
| Server data (todos os outros) | **TanStack Query** (`useQuery`/`useMutation`) | 3B/3C migraram: `usePlan`, `useUploadMutation`, notifications, profile/KYC, auth forms |
| UI ephemeral (modais, toggles) | **`useState` local** | YAGNI |
| Forms | **react-hook-form + Zod** | Stack; LoginForm usa Zod direto, create-startup usa react-hook-form |
| Toasts | **Sonner via `ToastContext`** | Já no stack |
| Real-time (notificações) | **Socket.IO** singleton por userId | Sprint WS-01 |
| Documentos editor (email templates) | **TipTap** (StarterKit + Link + Placeholder) | FIN-05 |

**Anti-padrões explícitos:**
- ❌ Não usar Redux/Zustand/Jotai. Para esse projeto não faz sentido — o estado que dói é dado-de-servidor, não UI.
- ❌ Não armazenar `token`/`refreshToken` em `localStorage`. Cookies HTTP-only setados pelo backend são a fonte única.
- ❌ Não duplicar fetch do `/users/me` em múltiplos lugares. TanStack Query consolida via cache compartilhado.
- ❌ Não chamar BFF direto com `process.env.VITE_API_URL` — sempre `BACKEND_URL` de `~/lib/api-config`.

## ROTAS PRINCIPAIS (consolidado de `app/routes.ts`)

### Públicas (sem auth)

- `/` — Landing (`routes/public/index.tsx`)
- `/login`, `/register`, `/2fa`, `/forgot-password`, `/reset-password`, `/validate-email`
- `/politica-privacidade`, `/termos-de-uso`, `/manutencao`
- `/r/:code` — referral
- `/auth/confirm-login`, `/auth/dismiss-session` — handlers auth
- `/startup/:slug`, `/startup/:slug/preview`, `/s/:slugOrId`
- `/verificar/:documentId`, `/verificar/:documentId/download` — verificação pública de documento (S18.5)
- `/files-proxy`, `/icons-proxy`, `/sitemap.xml`, `/.well-known/*`

### Privadas (gated — atrás de `/home` layout)

- `/home` — Dashboard marketing
- `/startups/:id` — startup detail
- `/wallet`, `/wallet/withdraw`, `/wallet/affiliate`
- `/checkout/:id`, `/checkout/:id/pix`, `/checkout/payment/:id`, `/checkout/efi/:paymentId`, `/checkout/return`, `/investments/:id/success`
- `/profile`, `/profile/plans`
- `/notifications`, `/pricing`, `/transparencia`
- `/founder/dashboard`, `/founder/startups/new`, `/founder/startups/:id/edit/**` (identidade/time/documentos/bancario + captacao-valores/recursos/tese/distribuicao), `/founder/investors`, `/founder/startups/:id/termo-adesao`, `/founder/campaigns/:campaignId/financeiro`
- `/investor/dashboard`
- `/affiliate`
- `/user/coupons`, `/user/payments`, `/user/statement`, `/user/balance`
- `/central-cupons`

### Admin (`/admin/*`)

`/admin/dashboard`, `/admin/marketplace`, `/admin/startups`, `/admin/startups/:id`, `/admin/startups/:id/:phase`, `/admin/coupons`, `/admin/installments`, `/admin/payouts`, `/admin/users`, `/admin/users/:id`, `/admin/plans`, `/admin/kyc`, `/admin/affiliate`, `/admin/payments`, `/admin/history`, `/admin/config`, `/admin/email-templates`, `/admin/email-templates/:slug`, `/admin/servicos`

### Compliance (`/compliance/*`)

`/compliance/dashboard`, `/compliance/users`, `/compliance/users/:id/{endereco,kyc,startups,campanhas,decisoes,auditoria}`, `/compliance/startups`, `/compliance/campaigns`, `/compliance/seals`, `/compliance/repasses`

### Financeiro (`/financeiro/*`)

`/financeiro/dashboard`, `/financeiro/config`, `/financeiro/assas`, `/financeiro/withdraws`, `/financeiro/plans`, `/financeiro/plans/:id`, `/financeiro/split`

### BFFs (`/api/*`) — ~105 rotas

Agrupadas por domínio (`/auth/*`, `/users/*`, `/notifications`, `/plans/*`, `/subscriptions/*`, `/uploads/*`, `/country`, `/startups/*`, `/startup/*`, `/startup/draft`, `/payment/*`, `/config/*`, `/admin/*`, `/geral/*`, `/testimonials/*`, `/marketplace/*`, `/affiliate/*`, `/verificar/*`, `/compliance/*`, `/financeiro/*`, `/transparency/*`, `/founder/*`, etc.)

## ROADMAP

### Fase 1 — entregue (branch `fix/auth-flow-fase1`)

- Fix redirect `/public/2fa` → `/2fa`
- Sincronia de `authStatus` em `login`/`register`/`logout`
- Submit determinístico + toast verdadeiro para 2FA
- Gating server-side via loader em `routes/layout/index.tsx`
- Helper `lib/server-fetch.ts`

### Fase 2 — entregue

- **2A.1** — `/checkout/*` exemption no layout loader (usuários sem plano podem chegar em `/checkout/:id` e completar a aquisição)
- **2A.2** — `auth-status` real: proxy a `GET /auth/check-af2` com tradução 401+redirect → `{true,false}`; elimina falso positivo de sessão expirada
- **2B.1** — Validação Zod no `LoginForm` via `app/lib/login-schema.ts` antes do submit
- **2B.2** — Centralização de `BACKEND_URL` em `app/lib/api-config.ts`; 17 BFFs migrados; corrige bug latente em 2 BFFs com `process.env.VITE_API_URL`
- **2B.3** — `refreshAuthStatus` best-effort com try/catch + `console.warn`; resolve item IMPORTANT da Fase 1

### Fase 2 — dívida residual

- ~~Cookie parser real~~ → superseded pela 2A.2 (validação real no backend dispensa parser cliente)
- Setup mínimo de Vitest + testes do `AuthContext` e do loader (não endereçado; segue como dívida)
- Diferenciar 5xx vs 401 do backend no layout loader (parcial: implementado pra `/users/me` na Fase 1, falta espelhar pro `/auth/status`)

### Fase 3A — entregue

- TanStack Query 5.x instalado e wired em `root.tsx` (`QueryClientProvider`)
- 2 queries: `["auth-status"]` (proxy `/api/auth/status`) e `["me"]` (proxy `/api/users/me` com `enabled` gate)
- Hidratação SSR no layout loader via `setQueryData` + `dehydrate` + `<HydrationBoundary>`
- `useUser()` (composto) e `useAuthStatus()` (granular) como hooks oficiais
- `useAuth()` virou hook composto preservando a API legacy (`user`, `loading`, etc) — zero churn em consumers
- AuthContext slim — só métodos imperativos; `login/register` invalidam queries; `logout` faz `removeQueries`
- `fetchUser()` agora força refetch via `queryClient.fetchQuery(meQueryOptions)`

### Fase 3B — entregue

- **3B.1** — `usePlan` migrado para `useQuery(planQueryOptions)`; `use-plan-data.ts` (dead code) removido; `console.log` de debug eliminados
- **3B.2** — 4 auth forms (`forgot-password`, `reset-password`, `validate-email`, `two-factor`) migrados para `useMutation` (com 1 `useEffect`-fire em validate-email para auto-fire on mount); bonus `React.FormEvent` deprecated → `SyntheticEvent`
- **3B.3** — `country-select` migrado para `useQuery(countriesQueryOptions)` (staleTime Infinity); novo hook compartilhado `useUploadMutation` em `app/hooks/use-upload.ts`; `kyc-header` e `kyc-uploads` migrados para usar o hook; `profile-page` PATCH migrado para `useMutation`; bonus debug `console.log` removido + prop não-usado `initialSubscriptions` saiu do destructure
- **3B.4** — `notifications.tsx` migrado: 4 fetches → 2 `useQuery` (page + unread count com `refetchInterval` 30s) + 1 `useMutation` (mark-as-read); `Sidebar` e `TopNavbar` consomem `useUser()` direto (TanStack Query `["me"]`); layout não passa mais `user={user}` para os filhos — avatar, role, subscriptions e menus do sidebar reagem em tempo real a mutations (`useUpdateIdentityMutation`, `usePricingSubscriptionMutation`) e eventos WS (`payment.confirmed`, `kyc.decided`); dead `markAllAsRead` removido

### Fase 3B — dívida residual

- `app/components/founder/create-startup-form.tsx` — não migrado por ora; já usa `react-hook-form` que provê `isSubmitting` equivalente; valor marginal de migrar
- `register-form.tsx` segue com `React.FormEvent` deprecated — pode ser corrigido quando a Fase 3C migrar register para `useMutation`

### Fase 3C — entregue

- 3 mutation hooks novos: `useLoginMutation`, `useRegisterMutation`, `useLogoutMutation`. Cada um invalida `[auth-status]` + `[me]` em `onSuccess`; logout faz `removeQueries` (em on-success E on-error pra garantir cache limpo mesmo em falha de rede)
- Forms migrados: `login-form`, `register-form` (+ FormEvent → SyntheticEvent fix); `sidebar` (logout); `two-factor-form` (refreshAuthStatus → queryClient.invalidateQueries direto); `profile-page` (fetchUser → queryClient.invalidateQueries); `pricing.tsx` (`useAuth` → `useUser`)
- **`AuthContext` e `useAuth` eliminados** — `app/context/AuthContext.tsx` e `app/hooks/use-auth.ts` deletados (~220 LOC removidas)
- Provider chain enxuto: `<QueryClientProvider><ToastProvider>` em `root.tsx`
- Estado de auth flui exclusivamente via Query (sem context bridge)

### WS-01 (Real-time Notifications) — entregue

- Socket.IO singleton por userId (`useNotificationsSocket`) com ref-count, reconexão automática, cookie HTTP-only via `withCredentials`
- Invalida `["notifications-unread-count"]` e prepend na `["notifications","all",1]`
- Hooks: `useMarkAsReadMutation`, `useMarkAllAsReadMutation`
- Backend: gateway + Redis adapter (multi-instance) + mensagens persistidas em DB

### S04 (T023) — entregue

- **T023** — Form inline no `/founder/dashboard`: cadastro de startup + reserva de tokens (R$ 500 PIX)
  - `app/lib/startup-schema.ts` — Zod schema com 6 campos (nomeFantasia, cnpj, areaAtuacao, estagio, totalTokens, descricao)
  - `app/hooks/use-create-startup-mutation.ts` — TanStack Mutation que chama POST /api/startup → POST /api/payment (TOKEN_RESERVATION) → redirect /checkout/payment/:id
  - `app/routes/api/startup.ts` — BFF proxy POST adicionado (loader GET já existia)
  - `app/routes/private/founder-dashboard.tsx` — CadastrarStartupForm inline (collapsible) integrado ao dashboard
  - `test/e2e/flows/founder-dashboard-integration.spec.ts` — Playwright E2E do form inline
  - `test/e2e/flows/setup/test-helpers.ts` — Helper `createFounderUser()` para setup de testes

### S18.5 (T126) — entregue

- **T126** — Página pública de verificação de documento assinado (S18.5)
  - `app/routes/verificar.$documentId.tsx` — Página pública sem auth; estados: loading, válido, inválido, 404
  - `app/routes/api/verificar.$documentId.ts` — BFF proxy para GET /verificar/:documentId (público)
  - `app/components/founder/documento-verificacao-card.tsx` — Card com status, validação técnica, signatários mascarados, logs de auditoria, botão download
  - `app/hooks/use-documento-verificacao.ts` — TanStack Query com cache 5 min e retry em 429
  - `app/lib/documento-verificacao-types.ts` — Tipos TypeScript para verificação
  - BFF `founder.startups.$id.termo-adesao.ts` atualizado com campo opcional `verificationUrl` no PATCH (para QR code no PDF)
  - `useTermoAdesaoMutation` atualizado para suportar `verificationUrl` opcional

### Founder Dashboard Refactor + Brand Unification — entregue (2026-09-06)

- **Refactor `/founder/dashboard`** (560 → 146 linhas):
  - **Backend:** `GET /investments/my-startups` (NestJS) — agregado CONFIRMED por startup + tokens + valor atual.
  - **BFF:** `app/routes/api/investments.my-startups.ts` — registrado antes de `:id` params em `app/routes.ts`.
  - **Loader:** `setQueryData` para startups + metrics + invested (zero waterfall).
  - **Hook agregador:** `app/hooks/use-founder-dashboard-state.ts` — 3 queries + search state + derived.
  - **Toast hook:** `app/hooks/use-blocked-round-toast.ts` — extraído do effect inline.
  - **Componentes focados:** `role-tabs.tsx`, `investor-startups-view.tsx`, `dashboard-empty-states.tsx`, `founder-dashboard-view.tsx`, `dashboard-background-watermark.tsx`.
  - **Tipos centralizados:** `InvestedStartup`, `InvestedStartupsResponse`, `investedStartupsQueryOptions` em `lib/queries.ts`.
  - **Format BRL:** `formatBRLCompact` em `lib/currency-format.ts` (single source of truth).
- **Brand Unification (v1.2):**
  - `theme.css`: `--color-primary: #d500f9` (magenta brand) — unificado após tripla divergência (#2563eb spec, #a855f7 theme.css, #d500f9 shadows).
  - `theme.css`: `--color-background: #000000` (preto puro).
  - `theme.css`: surface tiers recalibrados para preto puro.
  - 7 componentes founder: emerald/green trocados por magenta (`founder-metrics`, `founder-header`, `startup-card`, `startup-grid-card`, `startup-kanban-board`, `founder-filters`, `status-pills`, `investor-startups-view`).
  - `expense-composition.tsx`: strokes e glow realinhados ao magenta brand.
- **Background dashboard:** grid quadriculado removido; substituído por watermark de logo "iSelfToken" em `opacity-[0.02]`.
- **Documentação:** `.agents/`, `.opencode/`, `.kiro/` skills + `frontend/STYLE_GUIDE.md` v1.2 atualizados para magenta + preto puro.

### FIN-05 (Frontend) — Email Templates Admin Panel

- **Painel admin de Email Templates** — Editor TipTap WYSIWYG + preview + versionamento + LGPD warning
  - Tipos: `app/types/email-template.ts` — EmailTemplateSummary, EmailTemplateVersion, EmailTemplateDetail, RenderedEmail, CreateVersionPayload, UpdateVersionPayload
  - BFFs: `app/routes/api/admin.email-templates.ts` (lista), `admin.email-templates.$slug.ts` (detalhe), `admin.email-templates.$slug.versions.ts` (criar), `admin.email-templates.$slug.versions.$id.ts` (editar), `admin.email-templates.$slug.versions.$id.publish.ts` (publicar), `admin.email-templates.$slug.versions.$id.preview.ts` (preview)
  - Hooks: `use-email-templates.ts`, `use-email-template.ts`, `use-create-email-template-version.ts`, `use-update-email-template-version.ts`, `use-publish-email-template-version.ts`, `use-preview-email-template-version.ts`
  - Componentes: `app/components/admin/email-templates/` (lista + editor TipTap + preview-modal + version-history + variables-panel)
  - Rotas: `admin/email-templates` (lista), `admin/email-templates/:slug` (editor)
  - LGPD: Banner warning no editor alertando sobre variáveis {{variavel}}

### S34 — entregue (2026-09-29)

- **CSRF / allowedActionOrigins** — `react-router.config.ts` define origins válidas para actions (POST/PUT/PATCH/DELETE) que, em hosts diferentes, antes eram abortadas com 400 pelo React Router 7. Resolve bug em `/admin/startups/:id/:phase`.
- **SQLite `mode: 'insensitive'`** — fix de comparação case-insensitive em queries Prisma (Sprint S34 backend).
- **Templates novos (S34):** `new-login-alert` + `kyc-resubmission-requested` seedados em dark + magenta. Documentado em `backendnode/src/email/AGENTS.md`.

### Compliance / Repasses / Installments — entreges

- **Compliance (Sprint Compliance-QuickWins + Sprint Compliance-Full):**
    - Rotas `/compliance/*` (dashboard + users + campaigns + seals + repasses) + detail tabs (identidade, endereço, kyc, startups, campanhas, decisões, auditoria)
    - Componentes `app/components/compliance/` (~25 arquivos: dashboard-screen, users-screen, audit-timeline, request-document-modal, seal-assign-modal, repasse-deliberation-modal, etc.)
    - Hooks em `app/hooks/use-compliance-*` (audit-logs, document-requests, startup-documents, etc.)
- **Repasses (FIN-09..FIN-11):** painel `/compliance/repasses` + `/founder/campaigns/:campaignId/financeiro` (canonica) + `/founder/startups/:id/repasse` (smart redirect) + hook `useRepasseDashboard` + tipos em `app/types/repasse.ts` + lib `app/lib/repasse-schemas.ts` + `fund-transfer-types.ts`
- **FIN-11 §8.2 — Relatorio do Mes:** formulario de solicitacao de parcela (`RepasseInstallmentForm` + `AllocationForm` inline) tem sub-form `RepasseMonthlyReportFields` com 4 campos (mensagem, uso, lucro, marco). Apos aprovacao, auto-post publicado em `/transparencia` na secao dedicada `InstallmentReportsSection`. LGPD: bankInfoSnapshot nunca vaza no post.
- **Installments (FIN-10):** painel `/admin/installments` + `/financeiro/withdraws` + hooks `useApprovePaymentMutation`, `useCancelPaymentMutation`, `useGeneratePixMutation`, `useConfirmCardMutation`, `useEfiCheckout`
- **Coupons:** `/central-cupons` (user) + `/admin/coupons` (admin) + hooks `useApplyCoupon`, `useAvailableCoupons`, `useCreateCoupon`, `useUpdateCoupon`, `useToggleCouponStatus`, `useCouponAudit`, `useCouponUsages`, `useMyCouponUsage`, `useCouponPermissions`
- **Affiliate:** `/affiliate` (vitrine) + `/admin/affiliate` + `/founder/*` (triagem) + componentes `app/components/affiliate/` + hooks `useAdminAffiliate`, `useUpdateAffiliateMutation`
- **Transparency:** `/transparencia` (público autenticado) + posts + discussions (upvote/pin/edit/reply) + featured-report. Componentes `app/components/transparency/` + hooks `useTransparency*` + tipos `app/types/transparency.ts`
- **Marketing/Dashboard:** `/home` (marketing.tsx) com banners + featured + opportunities
- **New-startup wizard (refactor S04):** `app/components/founder/new-startup-wizard.tsx` + steps 1-3 (identidade, banking, fundraising) + `new-startup-form-field.tsx` + `new-startup-types.ts` + `new-startup-wizard.metrics.ts` + `app/lib/new-startup-schema.ts` + `app/lib/new-startup-loader.ts`

### Dívida residual / pendente

- `app/components/founder/create-startup-form.tsx` — não migrado; usa `react-hook-form` + tem `uploadFile` helper local (~20 LOC) que poderia virar `useMutation`. Baixa prioridade — `react-hook-form` provê `isSubmitting` equivalente. (Substituído pelo `new-startup-wizard` no fluxo de founder dashboard.)
- Setup mínimo de Vitest + testes (dívida desde Fase 2)
- Diferenciar 5xx vs 401 do backend no layout loader para `/auth/status` (espelhar o que já existe pra `/users/me` na Fase 1)
- `app/components/auth/register-form.tsx` recebeu fix `FormEvent → SyntheticEvent` na Fase 3C ✓

## CONVENTIONS

- **Styling:** Tailwind 4 via `@tailwindcss/vite`. Tokens semânticos em `app/styles/theme.css` (`--color-primary`, `--color-background`, surfaces).
- **Components:** shadcn/ui style (CVA, clsx, tailwind-merge) + Radix primitives. Componentes em `app/components/<feature>/`.
- **Routing (single source of truth):** `app/routes.ts` é a fonte única e obrigatória para todas as rotas. Não usar file-based routing implícito — toda rota deve estar registrada manualmente lá com `route(path, file)` ou via `prefix("api", […])`. Path no `route(path, …)` é o segmento HTTP (com `/`, ex.: `startups/featured`); nome do arquivo é resolvido a partir do segundo argumento.
- **Convenção arquivo ↔ path nos BFFs:** nomes de arquivo em `app/routes/api/` usam **hífen** como separador (`startups-featured.ts`, `testimonials-investors.ts`, `marketplace-early-access-ranking.ts`) para evitar colisão com o roteador file-based em builds desatualizados. Os **paths HTTP registrados em `routes.ts` usam barra** (`api/startups/featured`, `api/testimonials/investors`, `api/marketplace/early-access/ranking`). Ver âncora canônica em `app/routes.ts:54` (comentário sobre ordem das rotas estáticas antes do `:id` param).
- **SSR:** React Router 7 com `ssr: true` em `react-router.config.ts` + `<HydrationBoundary>` no layout component.
- **Path alias:** `~/` → `app/` (ex.: `import { X } from '~/lib/utils'`).
- **Linguagem em mensagens de UI/erro:** PT-BR.
- **Dev event types em React 19:** preferir `SyntheticEvent<HTMLFormElement>` ou `SubmitEvent`; `React.FormEvent` está marcado deprecated em `@types/react@19`.
- **Tipos:** centralizados em `app/types/` (auth, dashboard, marketplace, transparency, repasses, email-template, etc.) ou co-localizados em `app/lib/*-types.ts`.
- **Forms:** `react-hook-form` + Zod schemas em `app/lib/*-schema.ts` (mensagens PT-BR).
- **Estado servidor:** TanStack Query (`useQuery`/`useMutation`) com `queryOptions` factories em `app/lib/queries.ts`.
- **Toasts:** `Sonner` via `ToastContext` (`app/context/ToastContext`).
- **Modal/drawer:** `app/components/ui/animated-modal.tsx` + `drawer.tsx`.
- **File upload:** `useUploadMutation` (compartilhado). Validação cliente via `useFileValidation` (MIME + tamanho).
- **i18n:** `i18next` + `react-i18next`. Strings em `app/locales/`.

## TESTING

### E2E Playwright (UX Workflow Real)

**Diretório:** `frontend/test/e2e/flows/`
**Comando:** `npm run test:e2e:playwright`

**Escopo:** Testes E2E que simulam o fluxo UX real com cliques de humano no navegador (Chromium headless). Cada teste fica em SUA PRÓPRIA pasta com apenas 2 artefatos essenciais.

**Estrutura de saída (1 pasta por teste):**
```
test-results/
└── <test-slug>-chromium/
    ├── video.webm       # gravação completa do teste
    ├── report.html      # relatório visual do teste
    └── final.png        # último screenshot (se houver)
```

**Como rodar:**
```bash
cd frontend
npm run test:e2e:playwright          # headless
npm run test:e2e:playwright:ui       # Playwright UI (debug interativo)
npm run test:e2e:playwright:headed   # headed mode (ver browser)
npm run test:e2e:playwright:clean    # limpar test-results/
```

**Visualizar resultado:** abrir `test-results/<test-slug>-chromium/report.html` no browser (link direto para `video.webm` embutido).

### Unit (Vitest)

**Comando:** `npm run test` (single-run) ou `npm run test:watch`
**Coverage:** `npm run test:coverage`
**Config:** `test/vitest.config.ts` + jsdom + `@testing-library/react` + `@testing-library/jest-dom`

**Suítes principais (co-localizadas com `.test.ts(x)`):**
- Auth: `use-verify-2fa-mutation.spec.tsx`, `use-change-password-mutation.test.tsx`, `use-forgot-password-mutation.test.tsx`, `use-logout-mutation.test.tsx`, `use-update-address-mutation.test.tsx`, `use-update-identity-mutation.test.tsx`
- Admin: `use-admin-kyc.test.tsx`, `use-admin-startups.test.tsx`, `use-admin-users.test.tsx`, `use-compliance-campaign-detail.test.tsx`, `use-compliance-dashboard-summary.test.tsx`, `use-compliance-startup-detail.test.tsx`, `use-update-config-mutation.test.tsx`, `use-update-user-status-mutation.test.tsx`, `use-update-identity-mutation.test.tsx`, `use-pricing-subscription-mutation.test.tsx`, `use-publish-email-template-version.test.tsx`, `use-create-email-template-version.test.tsx`, `use-create-round-mutation.test.tsx`, `use-token-reserve-mutation.test.tsx`, `use-cep-lookup.test.tsx`, `use-file-validation.test.ts`, `use-dashboard-overview.spec.ts`
- Lib: `app/lib/cookies.test.ts`, `payment-presentation.test.ts`, `round-distribution-schema.test.ts`, `sanitize-html.test.ts`, `post-auth-redirect.test.ts`, `edit-startup-form-context.test.tsx`, `termo-adesao-text.test.ts`, `app/lib/server-fetch.ts` (loaders SSR)
- Components: `admin-dashboard-screen.test.tsx`, `admin-history.test.tsx`, `admin-user-empty-state.test.tsx`, `admin-user-table.test.tsx`, `admin.dashboard-screen.test.tsx`, `compliance-dashboard-screen.test.tsx`, `compliance-users-screen.test.tsx`, `phase-actions.test.tsx`, `regenerate-payment-button.test.tsx`, `startup-branding.regression.test.tsx`, `edit-identidade-populate.regression.test.tsx`, `use-investor-dashboard.test.tsx`, `use-startup-detail.test.tsx`, `use-startup-identity.test.tsx`, `profile-documents.test.tsx`, `profile-document-tile.test.tsx`, `use-cep-lookup.test.tsx`
- App: `use-user-role.spec.ts`, `use-verify-2fa-mutation.spec.tsx`, `use-dashboard-overview.spec.ts`, `admin-startup-action.server.test.ts`

## SPRINTS / ENTREGAS RECENTES — índice rápido

| Sprint | Tema | Componentes/rotas principais |
|--------|------|------------------------------|
| M4 | User registration to plan purchase | E2E flow `user-registration-to-plan-purchase.e2e-spec.ts` |
| M5-S13 | S3 + presigned URLs | `src/api/uploads/*` + `/uploads/:id/status` BFF + `/uploads/url/:id` |
| M5-S12 | Dashboard overview | `useDashboardOverview` |
| M6-S17 | Hard delete startup + audit log | `admin-startups.$id.ts` DELETE + `StartupDeleteAuditLog` + `hard-delete-startup-dialog.tsx` |
| M6-S18 | PKI + Termo de Adesão | `src/common/pki/` + `src/signature/` + `src/template/` + `use-termo-adesao-*` + `documento-verificacao-card.tsx` |
| M6-S18.5 | Verificação pública | `/verificar/:documentId` (público) + `routes/verificar.$documentId.tsx` |
| S04 (T023) | Founder dashboard inline create | `use-create-startup-mutation.ts` + `CadastrarStartupForm` + Playwright founder-dashboard-integration |
| WS-01 | Socket.IO notifications | `use-notifications-socket.ts` + `notifications.gateway.ts` (backend) |
| S18.4 | Termo de Adesão Digital (founder) | `termo-adesao-section.tsx` + checkbox + selo visual |
| S34 | CSRF + SQLite insensitive | `react-router.config.ts` allowedActionOrigins + Prisma `mode: 'insensitive'` |
| FIN-05 | Email Templates Admin | `/admin/email-templates` + TipTap + 14 templates seedados |
| FIN-09 | Repasses (Compliance + Financeiro) | `/compliance/repasses` + `/founder/campaigns/:campaignId/financeiro` (canonica) + `useRepasseDashboard` |
| FIN-11 §8.2 | Relatorio do Mes na solicitacao de parcela + auto-post na Transparencia | `RepasseMonthlyReportFields` + `InstallmentReportsSection` + `useTransparencyInstallmentPosts` |
| FIN-10 | Installment Requests | `/admin/installments` + `/financeiro/withdraws` + hooks approve/cancel/installment |
| Compliance-Full | Compliance dashboard + users + campaigns + seals | `/compliance/*` + `app/components/compliance/` |
| Transparency | Posts + discussions + featured | `/transparencia` + `app/components/transparency/` |
| Affiliate | Affiliate program | `/affiliate` + `/admin/affiliate` + `app/components/affiliate/` |
| Coupons | Central + admin + audit | `/central-cupons` + `/admin/coupons` + hooks |
| Brand v1.2 | Magenta + preto puro | `theme.css` + componentes founder realinhados |