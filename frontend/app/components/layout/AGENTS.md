# AGENTS.md - app/components/layout

## Propósito
Estrutura shell da área logada — sidebar e top navbar. Consumidos pelo layout root em `routes/layout/index.tsx`.

**Convenção:** ambos os componentes consomem `useUser()` diretamente (TanStack Query `["me"]`). Não recebem `user` como prop do layout — isso garante que avatar, role, subscriptions e menus atualizem em tempo real quando mutations/WS invalidam o cache (KYC aprovado, plano adquirido, avatar trocado), sem reload da página.

## Dependências
- Internas: `app/hooks/use-user` (Sidebar + TopNavbar), `app/hooks/use-logout-mutation` (Sidebar), `app/hooks/use-notifications-socket` / `use-payment-confirmed` / `use-kyc-realtime` (TopNavbar)
- Externas: `react-router`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [sidebar.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/layout/sidebar.tsx) | Menu lateral com nav por role + botão logout; consome `useUser()` para menus reativos (Fase 3B.4 — finalizado). |
| [top-navbar.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/layout/top-navbar.tsx) | Barra superior (notificações, avatar, nome, role/plano); consome `useUser()` para refletir mudanças em tempo real. |