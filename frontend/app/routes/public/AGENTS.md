# AGENTS.md - app/routes/public

## Propósito
Rotas acessíveis sem autenticação — landing, login, registro, 2FA (pós-login), forgot/reset password e validate-email.

## Dependências
- Internas: `app/components/landing/*`, `app/components/auth/*`, `app/components/login/*`
- Externas: `react-router`

## Mapa de Arquivos
| Arquivo | Rota |
|---------|--------|
| [index.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/public/index.tsx) | `/` — landing page |
| [login.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/public/login.tsx) | `/login` |
| [register.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/public/register.tsx) | `/register` |
| [2fa.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/public/2fa.tsx) | `/2fa` — pós-login |
| [forgot-password.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/public/forgot-password.tsx) | `/forgot-password` |
| [reset-password.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/public/reset-password.tsx) | `/reset-password` |
| [validate-email.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/public/validate-email.tsx) | `/validate-email` |
| [politica-privacidade.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/public/politica-privacidade.tsx) | `/politica-privacidade` — LGPD Art. 9, documento legal versionado |
| [termos-de-uso.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/public/termos-de-uso.tsx) | `/termos-de-uso` — CVM 88/2022, documento legal versionado |