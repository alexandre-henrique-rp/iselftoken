# Regras de Negócio: Autenticação de Dois Fatores (A2F)

## Visão Geral do Fluxo

1.  Após o login bem-sucedido, o cliente é redirecionado para a página de A2F, que contém um token na URL (`/auth/[token]`).
2.  O cliente recebe um código de 6 dígitos em seu e-mail.
3.  O cliente insere o código de 6 dígitos no formulário da página.
4.  O cliente clica no botão "Verificar".
5.  O sistema valida se o código inserido corresponde ao esperado pelo token.
6.  Se o código estiver correto, o cliente é redirecionado para sua página principal (Home/Dashboard).
7.  Se o código estiver incorreto ou expirado, uma mensagem de erro é exibida.

---

### Frontend (`/src/components/A2FPageClient.tsx`)

-   **Validações do Formulário:**
    1.  O código inserido deve ter exatamente 6 dígitos.
    2.  O código deve conter apenas números.

-   **Comportamento e Interface:**
    1.  A página recebe um token JWT via props, que foi extraído da URL.
    2.  O formulário consiste em 6 campos de input, cada um para um dígito do código.
    3.  Ao digitar um número, o foco move-se automaticamente para o próximo campo.
    4.  É possível colar um código de 6 dígitos, e ele preencherá os campos automaticamente.
    5.  Um contador regressivo exibe o tempo de validade do código (iniciado em 5 minutos).
    6.  Se o código expirar, uma notificação (toast) aparece com um botão para reenviar um novo código.
    7.  Ao submeter o formulário, uma requisição `PUT` é enviada para o endpoint `/api/auth/a2f`.
    8.  O corpo da requisição contém o `token` original da URL e o `client_code` (o código de 6 dígitos inserido).
    9.  Em caso de sucesso, a página é redirecionada para a URL retornada pela API.
    10. Em caso de erro (código inválido), uma notificação de erro é exibida.
    11. Existe um link para "Voltar" que utiliza o histórico do navegador para retornar à página anterior.

---

### Backend (`/src/app/api/auth/a2f/route.ts`)

1.  Recebe o `token` (JWT) e o `client_code` (código do usuário) via requisição `PUT`.
2.  Verifica a validade e a assinatura do `token` JWT usando a chave secreta (`process.env.NEXTAUTH_SECRET`).
3.  Se o token for inválido ou expirado, retorna um erro `400`.
4.  Extrai do token o código original (`cog`), o caminho de redirecionamento final (`red`) e o ID do usuário (`Id`).
5.  Compara o `cog` (código do token) com o `client_code` (código enviado pelo usuário).
6.  Se os códigos não baterem, retorna um erro `400` com a mensagem "Código inválido".
7.  Se os códigos forem iguais, cria uma sessão de A2F para o usuário (`SetSession2fa(true, ...)`), que é um cookie com validade de 7 dias. Isso impede que o usuário precise fazer a verificação por e-mail a cada login dentro desse período.
8.  Retorna uma resposta de sucesso (`200`) contendo a URL de redirecionamento final (`red`) para o frontend.
