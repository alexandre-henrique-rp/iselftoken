# Regras de Negócio: Login

## Visão Geral do Fluxo

1.  O cliente acessa a página de login.
2.  O cliente preenche o email e a senha.
3.  O cliente clica no botão "Entrar".
4.  O sistema valida as credenciais com uma API externa.
5.  Se as credenciais estiverem corretas, o cliente é redirecionado para a página de autenticação de dois fatores (A2F).
6.  Após a validação do A2F, o cliente é redirecionado para a página principal (Home).

---

### Frontend (`/src/components/login-form.tsx`)

-   **Validações do Formulário:**
    1.  O campo de email é obrigatório e deve ser um formato de email válido (ex: `usuario@email.com`).
    2.  O campo de senha é obrigatório.

-   **Comportamento e Interface:**
    1.  O campo de email aceita qualquer formato de texto, mas a validação exige o formato de email.
    2.  O campo de senha é do tipo `password`, mascarando os caracteres digitados.
    3.  O botão de login principal tem o texto "Entrar".
    4.  Existe um link "Esqueceu a senha?" que redireciona para a página `/recuperar-senha`.
    5.  Existe um botão secundário "Criar uma conta" que redireciona para a página `/register`.
    6.  Ao submeter o formulário, uma requisição `POST` é enviada para o endpoint `/api/auth`.
    7.  Em caso de sucesso, a página é redirecionada para a URL retornada pela API (a página de A2F).
    8.  Em caso de erro, uma notificação (toast) é exibida para o usuário.

---

### Backend (`/src/app/api/auth/route.ts`)

1.  Recebe `email` e `senha` via requisição `POST`.
2.  Valida o `email` e a `senha` fazendo uma chamada `POST` para a API externa (`${process.env.NEXTAUTH_API_URL}/login`).
3.  Se a API externa retornar um erro (credenciais inválidas), a resposta é repassada ao frontend com o status de erro correspondente.
4.  Se a autenticação na API externa for bem-sucedida:
    -   Gera um código de 6 dígitos para a autenticação de dois fatores (A2F).
      1.   O código A2F é gerado utilizando a biblioteca `crypto` do Node.js, que gera um número aleatório entre 100000 e 999999.
      2.   O número é convertido para uma string de 6 dígitos utilizando o método `toString().padStart(6, '0')`.
    -   Cria um Token JWT (JSON Web Token) com validade de 20 minutos, contendo o código A2F e o ID do usuário.
    -   Envia o código A2F para o email do usuário através de outra chamada à API externa (`/messagewithnewcode`).
    -   Cria uma sessão para o usuário na aplicação atual, armazenando seus dados e tokens.
    -   Retorna uma resposta de sucesso para o frontend com a URL para a página de A2F (contendo o JWT).
5.  **Exceção de Fluxo**: Se o usuário já tiver uma sessão de A2F validada, ele é redirecionado diretamente para a página principal (`/home` ou `/admin`) sem passar pelo fluxo de envio de código por email.
6.  **Exceção de Fluxo**: Se o usuário não for autenticado na API externa, ele é retorna erro.

