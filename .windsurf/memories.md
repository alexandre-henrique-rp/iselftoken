# Windsurf Project Memories

## Project Context
- Nome: iSelfToken (frontend)
- Tipo: Web App (Next.js App Router)
- Stack Principal: Next.js 15.4.6, React 19, TypeScript 5, Tailwind CSS 4, Zod 4.0.17, react-hook-form 7.62, Radix UI, class-variance-authority, clsx, tailwind-merge, ESLint 9, Prettier 3.6.2, PostCSS, Nodemailer 7
- Última análise: 2025-08-20

## Decisões Arquiteturais
- Padrão: Clean Architecture + módulos por domínio
- App Router com rotas públicas e protegidas `(public)/(protected)`
- i18n via arquivos JSON em `i18n/locales/`
- Autenticação com sessão via cookie httpOnly `session-token` e A2F via `a2f-verified`

## Convenções de Código
- Naming: português para domínios, inglês para variáveis/funções
- Componentes com responsabilidade única e tipados (TypeScript)
- Padrões: DDD, SOLID, TDD quando possível

## Problemas Comuns e Soluções
- DYNAMIC_SERVER_USAGE na `/home` ao ler cookies
  - Solução: `export const dynamic = 'force-dynamic'` em `src/app/(protected)/home/page.tsx`
- Sincronização de i18n entre `pt`, `en`, `es`
  - Processo: alterar `pt/common.json` e replicar chaves/valores traduzidos em `en/common.json` e `es/common.json`

## Context Queries Úteis
- Como adicionar nova feature
- Padrão para criar novos componentes
- Como fazer deploy
- Comandos de desenvolvimento frequentes

## Dependencies & Setup
- Node: ver `package.json > engines` (quando disponível)
- Package manager: npm/pnpm/yarn (conforme ambiente)
- Variáveis de ambiente principais: `NEXTAUTH_API_URL`, `NEXTAUTH_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_NAME`
- Setup: `pnpm install` e `pnpm dev`
