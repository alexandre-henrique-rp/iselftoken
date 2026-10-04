# AGENTS.md - app/components/auth

## Propósito
Componentes de autenticação compartilhados entre fluxos públicos (login, registro, 2FA, recuperação de senha). Migrados para TanStack `useMutation` (Fase 3B.2/3C).

## Dependências
- Internas: `app/hooks/use-login-mutation`, `use-register-mutation`, `use-logout-mutation`, `app/lib/login-schema`, `app/types/auth`
- Externas: `react-hook-form`, `zod`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [auth-hero.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/auth/auth-hero.tsx) | Hero visual compartilhado em telas de auth |
| [login-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/auth/login-form.tsx) | Form de login com Zod (`app/lib/login-schema`) |
| [register-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/auth/register-form.tsx) | Form de cadastro |
| [register-container.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/auth/register-container.tsx) | Wrapper com layout do fluxo de cadastro |
| [two-factor-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/auth/two-factor-form.tsx) | Input 2FA (`refreshAuthStatus` via Query) |
| [two-factor-minimal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/auth/two-factor-minimal.tsx) | Variante minimalista do 2FA |
| [forgot-password-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/auth/forgot-password-form.tsx) | Solicitação de recuperação |
| [reset-password-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/auth/reset-password-form.tsx) | Redefinição de senha via token |
| [validate-email-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/auth/validate-email-form.tsx) | Validação de e-mail (auto-fire on mount) |