# AGENTS.md - app/routes

## OVERVIEW

File-based routing system via React Router 7. Routes are defined by file structure.

## ROUTE STRUCTURE

```
app/routes/
├── public/                 # Public accessible routes
│   ├── index.tsx          # Landing page (/)
│   ├── login.tsx          # Login page (/login)
│   ├── 2fa.tsx            # Two-factor authentication (/2fa)
│   ├── register.tsx       # Registration page (/register)
│   └── forgot-password.tsx # Password recovery (/forgot-password)
├── private/               # Protected routes (under layout)
│   ├── marketing.tsx       # Dashboard (/home)
│   ├── startup-detail.tsx  # Startup info (/startups/:id)
│   ├── wallet.tsx          # Wallet overview (/wallet)
│   ├── withdraw.tsx        # Withdrawal (/wallet/withdraw)
│   ├── checkout.tsx        # Checkout process (/checkout/:id)
│   ├── checkout-pix.tsx    # PIX Payment (/checkout/:id/pix)
│   ├── kyc.tsx             # KYC Profile (/profile/kyc)
│   ├── notifications.tsx   # Notifications (/notifications)
│   ├── pricing.tsx         # Pricing plans (/pricing)
│   ├── founder-dashboard.tsx # Founder panel (/founder/dashboard)
│   ├── create-startup.tsx  # Startup onboarding (/founder/startups/new)
│   ├── edit-startup.tsx    # Edit startup (/founder/startups/:id/edit)
│   ├── edit-startup-general.tsx # General info (/founder/startups/:id/edit/general)
│   ├── edit-startup-location.tsx # Location info (/founder/startups/:id/edit/location)
│   ├── admin-dashboard.tsx # Admin panel (/admin/dashboard)
│   ├── admin-startups.tsx  # Startup management (/admin/startups)
│   ├── admin-users.tsx     # User management (/admin/users)
│   └── admin-kyc.tsx       # KYC approval (/admin/kyc)
├── founder/                # Founder public routes (auth-gated)
│   └── termo-adesao/
│       └── texto.tsx       # Texto integral do Termo de Adesão (/founder/termo-adesao/texto)
├── layout/                # Layout wrapper
│   └── index.tsx          # Root layout
└── error/                 # Error pages
    ├── 401.tsx           # Unauthorized
    ├── 404.tsx           # Not found
    └── 500.tsx           # Server error
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Route definitions | `app/routes.ts` | Route config file |
| Public index | `app/routes/public/index.tsx` | Home page |
| Private routes | `app/routes/private/` | Auth-protected |
| Error pages | `app/routes/error/` | HTTP errors |

## CONVENTIONS

- **PÁGINA COMO SHELL** - Routes devem conter APENAS lógica essencial (meta, loader, errorBoundary)
- **COMPONENTES FORA** - Markup e UI em `~/components/` (criar diretório se não existir)
- **MÍNIMO CÓDIGO** - Cada route file deve ter ≤30 linhas
- File-based routing via `.tsx` files in `routes/`
- Layout routes defined in `app/routes/layout/`
- Error pages handle HTTP status codes
- Route loading via React Router loaders

### Page Template

```tsx
// app/routes/public/index.tsx - EXEMPLO minimalista
import { Hero } from "~/components/hero"
import { Features } from "~/components/features"
import { CTA } from "~/components/cta"

export function meta() {
  return [{ title: "iSelftoken - Fintech" }]
}

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Features />
      <CTA />
    </main>
  )
}
```

## ANTI-PATTERNS

- ❌ NÃO criar markup inline nas rotas - extrair para componentes
- ❌ NÃO misturar UI + dados + meta no mesmo arquivo
- ❌ NÃO ter lógica de renderização complexa em routes
- No dynamic route parameters in current implementation
- No API routes yet (would be in `routes/api/`)
- NUNCA Deixe uma page com mais de 40 linhas - sinal de que precisa de componentização