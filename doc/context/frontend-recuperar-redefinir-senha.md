---
Descrição: Páginas Públicas /recuperar-senha e /redefinir-senha
---

# Página `/recuperar-senha`

- Arquivo: `src/app/(public)/recuperar-senha/page.tsx`
- Objetivo: solicitar e-mail para envio de instruções de recuperação

## Lógica

- Zod: `email` obrigatório e válido
- `react-hook-form` para controle de estado e mensagens de erro
- Submissão: placeholder/log; ajustar quando integrar backend

# Página `/redefinir-senha`

- Arquivo: `src/app/(public)/redefinir-senha/page.tsx`
- Objetivo: permitir redefinição de senha com confirmação

## Lógica

- Zod: `password` mínimo 6 e `confirmPassword` com `refine` de igualdade
- `react-hook-form` para validação e exibição de erros
- Submissão: placeholder/log; ajustar quando integrar backend

## Testes Recomendados

- E-mail inválido/vazio em recuperar senha
- Senha curta e confirmação divergente em redefinir senha
- Integração: exibição de mensagens de erro e submissão bem-sucedida
