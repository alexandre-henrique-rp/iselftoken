---
Descrição: Visão Geral, Princípios e Regras
---

# Visão Geral

Aplicação web frontend modular com Next.js e React, focada em cadastros, oportunidades e perfis. O fluxo público de registro foi componentizado para facilitar manutenção e testes.

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

- Conectar submit dos formulários de registro ao backend
- Adicionar testes (TDD) para schemas Zod e integração `react-hook-form`
- Expandir documentação página a página
