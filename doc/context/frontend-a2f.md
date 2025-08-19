---
Descrição: Página Pública /auth (Autenticação em 2 Fatores)
---

# Frontend - Autenticação em 2 Fatores (A2F)

- **Rota**: `/auth`
- **Página**: `src/app/(public)/auth/page.tsx`
- **Objetivo**: Validar código de 6 dígitos enviado ao usuário após login para autenticação em dois fatores.

## Implementação Atual
- **Formulário**: 6 inputs individuais (1 dígito cada), gerenciados por `react-hook-form` com validação `zod` (`code` como string de 6 dígitos numéricos).
- **UX**: Foco automático no próximo input ao digitar; `backspace` retorna ao anterior se vazio; permite colar 6 dígitos (distribui nos campos).
- **Feedback**: Mensagens de erro com `toast` (lib `sonner`) e validação `zod`.
- **Fluxo**:
  - Ao carregar com sessão válida (via `useSession` de `src/hooks/useSession.ts`), dispara `GET /api/auth/a2f` para gerar e enviar código (em dev, retorna `codigo` no JSON).
  - Usuário preenche os 6 dígitos; `onSubmit` valida se `code === codigo` (em dev); se inválido, exibe `toast('Código inválido')` e não prossegue.
  - Se válido, envia `PUT /api/auth/a2f/put` com `{ status: true }` para marcar cookie `a2f-verified=true`.
  - Em sucesso, exibe `toast('Código válido')` e, após 1s, recarrega a página com `window.location.reload()`; o middleware redireciona conforme `role` (`startup` -> `/dashboard`, `investidor` -> `/home`, `admin` -> TBD, `afiliado` -> TBD).
- **Cookie**: Utilitários em `src/context/auth/` para gerenciar `a2f-verified` (`GetA2fVerified()`, `SetA2fVerified(value)`, `DeleteA2fVerified()`).
- **Middleware**: 
  - Bypass para `/api/*`.
  - Guarda global: se `session` e `!a2fVerified` e `pathname !== '/auth'`, redireciona para `/auth`.
  - Em `/auth`: se `session` e `a2fVerified`, redireciona para `/`.
  - Em `/login`: se `!a2fVerified`, redireciona para `/auth`.
- **Envio de E-mail A2F**: Refatorado para módulos separados:
  - Módulo de envio: `src/modules/email/index.ts` (utiliza `nodemailer` com configurações SMTP de variáveis de ambiente).
  - Templates de e-mail: `src/model/email/html/auth-a2f.ts` (HTML responsivo) e `src/model/email/text/auth-a2f.ts` (texto simples).
  - Geração de código: `src/modules/codigo/a2f.ts` (código de 6 dígitos).

## Testes Recomendados
- **Validação Zod**: Testar inputs com menos/maiores que 6 dígitos, caracteres não numéricos.
- **UX**: Foco automático, avanço/retrocesso entre campos, colar código completo.
- **Fluxo API**: Simular falhas em `GET /api/auth/a2f` e `PUT /api/auth/a2f/put`, validar mensagens de erro.
- **Middleware**: Acessar rotas públicas/protegidas com `a2f-verified=false` e verificar redirecionamentos.

## Melhorias Pendentes
- Implementar timer de expiração do código com opção de reenvio (com rate limit).
- Em produção, não retornar `codigo` no JSON do `GET /api/auth/a2f`; armazenar temporariamente no backend com TTL.
- Adicionar estados de loading mais granulares durante chamadas API.
