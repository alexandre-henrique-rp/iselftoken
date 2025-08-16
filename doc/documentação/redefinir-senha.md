# ** nome:** Redefinir Senha
# ** rota:** /redefinir-senha

## ** descrição:** 
- Página pública para definir uma nova senha após solicitar recuperação.
- Recebe um `token` via URL (`/redefinir-senha?token=...`) que deve ser reenviado ao backend junto com a nova senha.
- Layout em duas colunas com imagem à esquerda.

## ** funcionalidades embarcadas:** 
- Captura do `token` pela query string com `useSearchParams()`.
- Formulário com validação Zod: senha mínima 6 e confirmação igual.
- Botão desabilitado quando não há `token` válido na URL.
- Link para retornar ao login.

## ** componentes e arquivos relacionados:**
- Página: `src/app/(public)/redefinir-senha/page.tsx`
  - Renderiza formulário com `react-hook-form` + `zod`.
  - Usa `Card`, `Label`, `Input`, `Button`, `Image`.
  - Seleciona imagem randômica em `tema` no client-side.

## ** UX/Validações:**
- `password`: mínimo 6 caracteres.
- `confirmPassword`: deve ser igual à `password` (refine do Zod).
- Mensagens de erro abaixo dos campos.

## ** restrições:** 
- Sem integração real com backend (TODO: endpoint de redefinição com token).
- Token de redefinição não está sendo validado no frontend (a definir fluxo com backend).
- Sem verificação de expiração do token no frontend.

## ** Request:** 

### ** POST **
- Redefinição de senha: `/api/auth/reset-password`
- O token é recebido via URL (`/redefinir-senha?token=...`) e enviado no corpo da requisição de reset.

Request (JSON):
```json
{ "token": "string", "password": "string" }
```

Responses (JSON):
- Sucesso (200):
```json
{ "status": "success", "message": "Senha redefinida com sucesso" }
```
- Erro (400): token ausente
```json
{ "status": "error", "message": "Token é obrigatório" }
```
- Erro (401): token inválido/expirado
```json
{ "status": "error", "message": "Token inválido ou expirado" }
```

## ** Fluxo atual (frontend): **
1. Usuário acessa o link recebido por e-mail: `/redefinir-senha?token=...`.
2. Usuário informa nova senha e confirmação.
3. Validação com `zod` e `react-hook-form`.
4. Submit envia `{ token, password }` para o backend e, em caso de sucesso, redireciona para `/login`.

## ** Melhorias sugeridas (próximos passos): **
- Integração real com backend (incluindo captura do token via query string).
- Estado de loading e feedback de sucesso/erro.
- Testes TDD de validação e fluxo de submit.

## ** Observações de UI:**
- Imagem randômica: `/image-01.jpg`…`/image-04.jpg`.
- Logo no topo: `/logo.png`.
