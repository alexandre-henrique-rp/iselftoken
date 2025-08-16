# ** nome:** Autenticação em 2 Fatores (A2F)
# ** rota:** /a2f

## ** descrição:** 
- Página pública para validação de código 2FA (6 dígitos) após login.
- Layout em duas colunas com imagem à esquerda.

## ** funcionalidades embarcadas:** 
- 6 inputs individuais para um dígito cada, com foco automático no próximo.
- Backspace move o foco para o anterior quando vazio.
- Validação Zod: exatamente 6 dígitos numéricos.
- Link para retornar ao login.

## ** componentes e arquivos relacionados:**
- Página: `src/app/(public)/a2f/page.tsx`
  - Usa `react-hook-form` + `zod` para validar o campo composto `code`.
  - Referências (`useRef`) para controlar foco entre os 6 inputs.
  - Usa `Card`, `Input`, `Button`, `Image`.

## ** UX/Validações:**
- Aceita somente dígitos (0-9) e limita a 1 caractere por input.
- Mensagem de erro centralizada abaixo dos inputs quando inválido.

## ** restrições:** 
- Sem integração real com backend (TODO: endpoint de verificação do token 2FA).
- Expiração do código e tentativas não tratadas no frontend.

## ** Request:** 

### ** POST **
- Verificação de 2FA: `/api/auth/2fa/verify`

Request (JSON):
```json
{ "code": "string" }
```

Responses (JSON):
- Sucesso (200):
```json
{ "status": "success", "message": "Código válido" }
```
- Erro (400|401):
```json
{ "status": "error", "message": "Código inválido ou expirado" }
```

## ** Fluxo atual (frontend): **
1. Usuário preenche os 6 inputs.
2. `react-hook-form` consolida em `code` e valida com `zod`.
3. Submit executa `onSubmit` com `console.log` (placeholder) e redireciona para `/`.

## ** Melhorias sugeridas (próximos passos): **
- Exibir timer/expiração e reenvio de código.
- Estados de loading e mensagens de feedback.
- Testes TDD de foco, navegação entre inputs e validação.

## ** Observações de UI:**
- Imagem randômica: `/image-01.jpg`…`/image-04.jpg`.
- Logo no topo: `/logo.png`.
