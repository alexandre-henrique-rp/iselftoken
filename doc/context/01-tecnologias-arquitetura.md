---
Descrição: Tecnologias e Arquitetura do Frontend
---

# Tecnologias

- Next.js 15.4.6 (App Router)
- React 19.1.0
- TypeScript
- UI: componentes customizados em `src/components/ui/*` (inspirados em shadcn)
- Validação: Zod 4.0.17 + `@hookform/resolvers/zod`
- Formulários: `react-hook-form` 7.62.0
- Máscaras: `remask` 1.2.2 + utilitários em `src/lib/mask-utils.ts`
- Ícones: Lucide React 0.539.0
- Styling: Tailwind CSS 4 + class-variance-authority + clsx + tailwind-merge
- Radix UI: Dialog, Label, Slot para componentes primitivos
- E-mail: `nodemailer` 7 para envio de códigos A2F
- Ferramentas: ESLint 9, Prettier 3.6.2, PostCSS

# Padrões e Boas Práticas

- Clean Code, SOLID, DDD (quando aplicável ao frontend), TDD (prioridade para schemas e regras de formulário)
- Arquitetura preferida: Clean Architecture com separação de camadas e componentes reutilizáveis
- Nomeação: português para domínios/arquivos de docs, inglês para variáveis e funções
- Componentes funcionais, responsabilidade única, baixo acoplamento, alta coesão

# Arquitetura de Pastas (resumo)

- `src/app/` páginas (App Router)
- `src/components/` componentes reutilizáveis
  - `src/components/register/` componentes de formulários públicos de registro
- `src/modules/` módulos utilitários
  - `src/modules/email/` módulo para envio de e-mails
  - `src/modules/codigo/` módulo para geração de códigos (ex.: A2F)
- `src/model/email/` templates de e-mail (HTML e texto) para A2F
- `doc/` documentação do projeto
  - `doc/context/` contexto e visão geral

# Integrações Relevantes

- Integração futura com backend para persistência de cadastro (pendente)
- Sanitização de dados mascarados antes do envio (CPF/CNPJ/CEP/telefone)
