---
Descrição: Visão Geral, Princípios e Regras
---

# Visão Geral

Aplicação web frontend modular com Next.js e React, focada em conectar investidores e startups através de uma plataforma digital. O fluxo público de registro foi componentizado para facilitar manutenção e testes. A aplicação inclui páginas de autenticação (login, registro, A2F, recuperação/redefinição de senha) e tem como objetivo principal fornecer um ambiente seguro e intuitivo para interação entre diferentes roles de usuário (investidor, startup, admin, afiliado).

# Princípios

- Simplicidade primeiro, foco em legibilidade
- Validação consistente via Zod
- Form handling com `react-hook-form`
- Componentização para reuso e testabilidade
- SSR/CSR estável: evitar mismatches de hidratação (ex.: imagens estáveis e efeitos no cliente)

# Regras Gerais do Projeto

- Português do Brasil na comunicação e documentação
- Código com nomes claros, funções com um único propósito
- Tipagem estrita em TypeScript, evitar `any`
- Estrutura Clean Architecture quando aplicável
- Commits seguindo padrão semântico (iuricode/padrões-de-commits) com emojis

# Pendências e Próximos Passos

- Conectar submit dos formulários de registro, login, recuperação e redefinição de senha ao backend.
- Implementar páginas específicas por role: Investidor (perfil, home, configurações), Startup (perfil, dashboard, configurações), Admin (perfil, admin, configurações), Afiliado (perfil, painel, configurações).
- Adicionar testes (TDD) para schemas Zod, integração `react-hook-form` e fluxos de autenticação.
- Expandir documentação página a página e alinhar com o código atual.
