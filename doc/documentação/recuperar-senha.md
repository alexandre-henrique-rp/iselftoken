# ** nome:** Recuperar Senha
# ** rota:** /recuperar-senha

## ** descrição:** 
- Página pública para solicitar um link de redefinição de senha por e-mail.
- Layout em duas colunas com imagem temática.

## ** funcionalidades embarcadas:** 
- Formulário com validação Zod para e-mail.
- Envio da solicitação (placeholder) e redirecionamento para login.
- Link para retornar ao login.

## ** componentes e arquivos relacionados:**
- Página: `src/app/(public)/recuperar-senha/page.tsx`
  - Renderiza formulário com `react-hook-form` + `zod`.
  - Usa `Card`, `Label`, `Input`, `Button` e `Image`.
  - Seleciona imagem randômica em `tema` no client-side.

## ** UX/Validações:**
- E-mail obrigatório e em formato válido.
- Mensagem de ajuda explicando o fluxo de recuperação.
- Mensagens de erro abaixo do campo.

## ** restrições:** 
- Sem integração real com backend (TODO: integrar endpoint de recuperação).
- Sem controle de tentativa/rate limit no frontend.

## ** Request:** 

### ** POST **
- Solicitação de recuperação: `/api/auth/recover`

Request (JSON):
```json
{ "email": "string" }
```

Responses (JSON):
- Sucesso (200):
```json
{ "status": "success", "message": "Email de recuperação enviado" }
```
- Erro (404):
```json
{ "status": "error", "message": "Email não encontrado" }
```

## ** Fluxo atual (frontend): **
1. Usuário informa o e-mail.
2. Validação com `zod` e `react-hook-form`.
3. Submit executa `onSubmit` com `console.log` (placeholder) e redireciona para `/login`.
4. Link “Voltar para o login”.

## ** Melhorias sugeridas (próximos passos): **
- Tratar loading/erro no submit.
- Mensagem de confirmação persistente pós-submit.
- Testes TDD do schema Zod e do fluxo de submit.

## ** Observações de UI:**
- Imagem de fundo randômica: `/image-01.jpg`…`/image-04.jpg`.
- Logo no topo: `/logo.png`.
