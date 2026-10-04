# AGENTS.md - app/components/login

## Propósito
Componentes específicos da tela `/login` — hero, form e container. Diferem de `components/auth/` (este é o wrapper visual da rota pública de login).

## Dependências
- Internas: `app/components/auth/login-form` (reuso), `app/hooks/use-login-mutation`
- Externas: `react-router`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [login-container.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/login/login-container.tsx) | Layout split (hero + form) |
| [login-hero.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/login/login-hero.tsx) | Coluna esquerda com copy + ilustração |
| [login-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/login/login-form.tsx) | Wrapper do `auth/login-form` com deps de rota |