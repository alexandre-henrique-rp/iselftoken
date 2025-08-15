---
Descrição: Página Pública /a2f (Autenticação em 2 Fatores)
---

# Página `/a2f`

- Arquivo: `src/app/(public)/a2f/page.tsx`
- Objetivo: validar código de 6 dígitos enviado ao usuário.

## Lógica

- Zod: `code` como string de 6 dígitos (`length(6)` + regex `^\d{6}$`)
- `react-hook-form` para inputs e validação
- UX: navegação automática entre inputs, correção de problemas de hidratação SSR/CSR
- Submissão: placeholder/log; ajustar quando integrar backend

## Testes Recomendados

- Zod: tamanhos diferentes de 6, caracteres não numéricos
- Integração: foco automático e avanço entre campos, submissão válida
