# ** nome:** Login
# ** rota:** /login

## ** descrição:** 
- Página pública para autenticação de usuários (investidores e startups).
- Exibe formulário de login com validação e links auxiliares (recuperação de senha e cadastro).
- Layout em duas colunas com imagem temática aleatória à direita.

## ** funcionalidades embarcadas:** 
- Formulário com validação via Zod (e-mail e senha obrigatórios).
- Link para recuperar senha (`/recuperar-senha`).
- Link para cadastro (`/register`).
- Link para termos de uso (`/termos-de-uso`).
- Exibição de imagem randômica na coluna direita para melhor UX visual.

## ** componentes e arquivos relacionados:**
- Página: `src/app/(public)/login/page.tsx`
  - Renderiza o grid 2 colunas e o `<LoginForm />`.
  - Seleciona uma imagem aleatória de `tema` para o lado direito.
- Componente: `src/components/login-form.tsx`
  - Campos: `email`, `password`.
  - Validação: `zod` + `react-hook-form`.
  - Ações: submit (console.log placeholder), links auxiliares.

## ** UX/Validações:**
- Mensagens de erro exibidas abaixo dos campos quando inválidos.
- Email válido (formato) e obrigatório.
- Senha obrigatória.
- Botão "Entrar" desabilitado apenas pelo HTML5 quando campos inválidos (nenhuma lógica adicional de loading ainda).

## ** restrições:** 
- Sem integração de backend no momento (TODO: integrar API de autenticação).
- Sem persistência de sessão/token ainda (área protegida pendente).

## ** Request:** 

### ** POST **
- Autenticação de usuário
- Endpoint sugerido (backend): `/api/auth/login`

Request (JSON):
```json
{
  "email": "string",
  "password": "string"
}
```

Responses (JSON):
- Sucesso (200):
```json
{
  "status": "success",
  "message": "Login efetuado com sucesso",
  "data": {
    "user": {
      "id": 0,
      "name": "string",
      "email": "string",
      "role": "investidor|startup"
    },
    "token": "jwt_access_token",
  }
}
```
- Erro (401 | 400):
```json
{
  "status": "error",
  "message": "Credenciais inválidas"
}
```
- Erro de validação (422):
```json
{
  "status": "error",
  "message": "Campos inválidos",
  "errors": {
    "email": "Email inválido",
    "password": "Senha é obrigatória"
  }
}
```

## ** Fluxo atual (frontend): **
1. Usuário preenche email e senha.
2. `react-hook-form` valida com `zod` e exibe erros.
3. No submit, executa `handleLogin` (placeholder com `console.log`).
4. Links auxiliares:
   - "Esqueceu sua senha?" → `/recuperar-senha`
   - "Cadastre-se" → `/register`
   - "Termos de Uso" → `/termos-de-uso`

## ** Melhorias sugeridas (próximos passos): **
- Integrar chamada real à API com tratativa de loading e erro.
- Armazenar tokens com segurança (HTTP-only cookies preferencialmente) e gerenciar sessão.
- Redirecionar para área protegida após sucesso.
- Exibir feedback de erro de credenciais com banner/alert.
- Testes (TDD): unitários do schema Zod e integração do formulário.

## ** Observações de UI:**
- Imagem de fundo randômica carregada a partir de: `/image-01.jpg`, `/image-02.jpg`, `/image-03.jpg`, `/image-04.jpg`.
- Logo exibida no topo da coluna esquerda: `/logo.png`.
