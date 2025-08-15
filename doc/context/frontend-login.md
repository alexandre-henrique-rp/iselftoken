---
Descrição: Página Pública /login
---

# Página `/login`

- Arquivo: `src/app/(public)/login/page.tsx`
- Objetivo: autenticação de usuário via email e senha.

## Lógica

- Validação com Zod (`email` obrigatório e válido; `password` obrigatória)
- `react-hook-form` para controle do formulário
- Exibe erros inline
- Submissão: placeholder com `console.log` e/ou navegação (ajustar quando integrar backend)

## Componentes Relevantes

- `src/components/login-form.tsx` (separação de lógica/JSX do formulário)

## Testes Recomendados

- Zod: e-mail inválido, senha vazia
- Integração: exibição e limpeza de erros, submissão bem-sucedida
