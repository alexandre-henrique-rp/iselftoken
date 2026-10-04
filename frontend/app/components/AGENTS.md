# AGENTS.md - app/components

## OVERVIEW

Catálogo de componentes React organizados por contexto/feature.

## ESTRUTURA

```
app/components/
├── landing/           # Componentes da página de landing
│   ├── hero.tsx
│   ├── navbar.tsx
│   ├── footer.tsx
│   ├── carousel-3d.tsx
│   ├── opportunities.tsx
│   ├── how-it-works.tsx
│   ├── featured-rounds.tsx
│   ├── testimonials-startups.tsx
│   └── testimonials-investors.tsx
└── login/             # Componentes da página de login
    ├── login-container.tsx
    ├── login-hero.tsx
    └── login-form.tsx
└── auth/              # Componentes de autenticação compartilhados
    ├── auth-hero.tsx
    ├── two-factor-form.tsx
    ├── register-container.tsx
    ├── register-form.tsx
    ├── forgot-password-form.tsx
    └── reset-password-form.tsx
└── layout/            # Estrutura base da aplicação (Logado)
    ├── sidebar.tsx
    ├── top-navbar.tsx
    └── floating-cta.tsx
└── marketplace/       # Componentes do Marketplace / Dashboard
    ├── marketplace-banner.tsx
    ├── featured-startups.tsx
    ├── early-access.tsx
    └── category-grid.tsx
└── startup-detail/    # Detalhamento de Startup específica
    ├── startup-hero.tsx
    ├── pitch-video.tsx
    ├── metrics-grid.tsx
    ├── business-summary.tsx
    ├── team-section.tsx
    ├── risk-docs.tsx
    ├── real-investors.tsx
    ├── investor-forum.tsx
    └── investment-sidebar.tsx
└── wallet/            # Componentes compartilhados do layout editorial das carteiras
    ├── editorial-wallet-shell.tsx     # Wrapper de pagina (header + watermark)
    ├── wallet-bento-stats.tsx         # Layout Bento 3-cols (hero + summary)
    ├── wallet-asset-list-editorial.tsx # Lista generica com paginacao
    ├── editorial-asset-row.tsx        # Linha glass-panel + avatar + acoes
    ├── wallet-transaction-statement.tsx # Tabela generica com paginacao
    ├── withdraw-header.tsx             # Header do fluxo de saque
    ├── withdraw-summary.tsx            # Resumo do saque (valor + taxa + destino)
    └── withdraw-form.tsx               # Form de saque (valor, dados bancarios)
└── checkout/          # Processo de Pagamento / Assinatura
    ├── checkout-header.tsx
    ├── credit-card-form.tsx
    ├── pix-payment.tsx
    └── checkout-summary.tsx
└── profile/           # Perfil e KYC
    ├── kyc-header.tsx
    ├── kyc-personal-info.tsx
    ├── kyc-location.tsx
    ├── kyc-uploads.tsx
    └── kyc-action-bar.tsx
└── notifications/     # Centro de Notificações
    ├── notification-header.tsx
    └── notification-card.tsx
└── pricing/           # Planos e Preços
    ├── pricing-header.tsx
    └── pricing-card.tsx
└── founder/           # Painel do Fundador
    ├── founder-header.tsx
    ├── founder-filters.tsx
    ├── startup-card.tsx
    ├── create-startup-header.tsx
    ├── create-startup-steps.tsx
    ├── create-startup-form.tsx
    ├── create-startup-sidebar.tsx
    ├── create-startup-action-bar.tsx
    ├── edit-startup-header.tsx
    ├── edit-startup-nav.tsx
    ├── resource-allocation.tsx
    ├── runway-projection.tsx
    ├── expense-composition.tsx
    ├── corporate-identity.tsx
    ├── business-description.tsx
    ├── location-form.tsx
    ├── global-reach-card.tsx
    ├── edit-startup-action-bar.tsx
    └── termo-adesao-section.tsx    # Checkbox + selo visual do termo de adesão digital (S18.4)
└── affiliate/         # Componentes compartilhados do programa de afiliados
    │   ├── affiliate-candidatura-card.tsx   # Card de candidato (triagem)
    │   ├── affiliate-triagem-modal.tsx      # Modal approve/reject
    │   └── affiliate-history-table.tsx      # Tabela de histórico
└── admin/             # Painel Administrativo Global
    ├── admin-header.tsx
    ├── kpi-grid.tsx
    ├── growth-chart.tsx
    ├── startups-chart.tsx
    ├── pending-redemptions.tsx
    ├── active-campaigns.tsx
    ├── admin-startup-header.tsx
    ├── admin-startup-filters.tsx
    ├── admin-startup-table.tsx
    ├── admin-user-header.tsx
    ├── admin-user-filters.tsx
    ├── admin-user-table.tsx
    ├── admin-kyc-header.tsx
    ├── admin-kyc-docs.tsx
    ├── admin-kyc-biofacial.tsx
    ├── admin-kyc-residence.tsx
    └── pricing/           # Planos e Preços
        ├── pricing-header.tsx
        └── pricing-card.tsx
    └── error/             # Páginas de Erro
        └── error-container.tsx
    ```

    ## WHERE TO LOOK

    | Task | Location | Notes |
    |------|----------|-------|
    | Landing page components | `app/components/landing/` | Home page section components |
    | Login components | `app/components/login/` | Auth page components |
    | Shared Auth components | `app/components/auth/` | 2FA, Register, etc |
    | Layout components | `app/components/layout/` | Sidebar, Topbar, App shell |
    | Marketplace components | `app/components/marketplace/` | Cards, Banners, Grids |
    | Startup Detail components | `app/components/startup-detail/` | Specific startup info |
    | Wallet components | `app/components/wallet/` | Portfolio, History and Withdraw |
    | Checkout components | `app/components/checkout/` | Payment (Card/PIX) and summary |
    | Profile components | `app/components/profile/` | KYC and user info |
    | Notifications components | `app/components/notifications/` | List and cards |
    | Pricing components | `app/components/pricing/` | Plan comparison cards |
| Founder components | `app/components/founder/` | Dashboard, onboarding and edit |
| Affiliate components | `app/components/affiliate/` | Triagem do fundador, vitrine do afiliado, admin |
| Admin components | `app/components/admin/` | Global analytics, startup/user/kyc management |
    | Error components | `app/components/error/` | Global error layouts |
## CONVENTIONS

- **PÁGINA COMO SHELL** - Routes devem ter ≤40 linhas
- **COMPONENTES AUTÔNOMOS** - Cada componente de landing é auto-contido
- **Nomenclatura** - kebab-case: `testimonials-startups.tsx`
- **Re-export** - Preferir barrel exports (`index.ts`) se muitos componentes

## ANTI-PATTERNS

- ❌ NÃO criar markup inline nas routes
- ❌ NÃO misturar UI + dados + meta no mesmo arquivo
- ❌ NÃO ter lógica de renderização complexa em routes