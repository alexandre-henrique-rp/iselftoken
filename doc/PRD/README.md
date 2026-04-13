# Índice de PRDs — iSelfToken

## 1. Índice de Documentos
| # | Documento | Rota | Path | Status em `app/routes.ts` |
|---|-----------|------|------|---------------------------|
| 01 | [Homepage](./01-homepage.md) | `/` | `routes/page/index/index.tsx` | ✅ Registrada |
| 02 | [Startup Detail](./02-startup-detail.md) | `/startup/:id` | `routes/page/startup/index.tsx` | ✅ Registrada |
| 03 | [Auth Context](./03-auth-context.md) | — | — | ℹ️ Não é rota |
| 04 | [Login](./04-login.md) | `/login` | `routes/public/auth/login/index.tsx` | ✅ Registrada |
| 05 | [Cadastro](./05-cadastro.md) | `/cadastro` | `routes/public/auth/cadastro/index.tsx` | ❌ Não registrada |
| 06 | [Auth 2FA](./06-auth-af2.md) | `/auth` | `routes/public/auth/af2/index.tsx` | ✅ Registrada (ver path) |
| 07 | [Layout Privado](./07-layout.md) | — | `routes/layout/index.tsx` | ✅ Registrada |
| 08 | [Home Privada](./08-home.md) | `/home` | `routes/private/home/index.tsx` | ✅ Registrada |
| 09 | [Plans](./09-plans.md) | `/plans` | `routes/private/plans/index.tsx` | ❌ Não registrada |
| 10 | [Perfil](./10-profile.md) | `/profile` | `routes/private/profile/index.tsx` | ⚠️ Rota atual `/perfil` |
| 11 | [Dashboard Startups](./11-dashboard-startups.md) | `/dashboard/startups` | `routes/private/dashboard/startups/index.tsx` | ❌ Não registrada |
| 12 | [Criar Startup](./12-create-startup.md) | `/dashboard/startups/create` | `routes/private/dashboard/startups/create/index.tsx` | ❌ Não registrada |
| 13 | [Editar Startup](./13-update-startup.md) | `/dashboard/startups/:id/edit` | `routes/private/dashboard/startups/[id]/edit/index.tsx` | ❌ Não registrada |
| 14 | [Checkout Pagamento](./14-payment-checkout.md) | `/payment/checkout` | `routes/private/payment/checkout/index.tsx` | ❌ Não registrada |
| 15 | [Funções Especiais](./15-special-functions.md) | — | — | ℹ️ Não é rota |

## 2. Observações Importantes
- O arquivo `app/routes.ts` registra apenas parte das rotas descritas nos PRDs. Avaliar inclusão das rotas faltantes.
- A rota atual de perfil está como `/perfil`, porém o PRD define `/profile`.
- O path do 2FA em `routes.ts` possui dupla barra (`routes/public/auth//af2/index.tsx`).

## 3. Referências
- Estrutura de rotas: `app/routes.ts`.
- Padrões de UI: `doc/css_padrão.md`.
- Documentação externa: `doc/documentacao_externa.md`.
