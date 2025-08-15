---
Descrição: Tecnologias e Arquitetura do Frontend
---

# Tecnologias

- Next.js 15.4.6 (App Router)
- React 19.1.0
- TypeScript
- UI: componentes customizados em `src/components/ui/*` (inspirados em shadcn)
- Validação: Zod + `@hookform/resolvers/zod`
- Formulários: `react-hook-form`
- Máscaras: `react-input-mask`
- Ícones: Lucide React

# Padrões e Boas Práticas

- Clean Code, SOLID, DDD (quando aplicável ao frontend), TDD (prioridade para schemas e regras de formulário)
- Arquitetura preferida: Clean Architecture com separação de camadas e componentes reutilizáveis
- Nomeação: português para domínios/arquivos de docs, inglês para variáveis e funções
- Componentes funcionais, responsabilidade única, baixo acoplamento, alta coesão

# Arquitetura de Pastas (resumo)

- `src/app/` páginas (App Router)
- `src/components/` componentes reutilizáveis
  - `src/components/register/` componentes de formulários públicos de registro
- `doc/` documentação do projeto
  - `doc/context/` contexto e visão geral

# Integrações Relevantes

- Integração futura com backend para persistência de cadastro (pendente)
- Sanitização de dados mascarados antes do envio (CPF/CNPJ/CEP/telefone)
