# Regras de Negócio: Gerenciamento de Sessão (auth/index.tsx)

## Visão Geral

Este arquivo é uma biblioteca de funções de servidor (`server-side`) responsável por todo o ciclo de vida da sessão de um usuário. Ele utiliza JSON Web Tokens (JWT) e cookies `HttpOnly` para garantir a segurança. `HttpOnly` significa que os cookies não podem ser acessados por código JavaScript no navegador, prevenindo ataques de XSS.

---

### `CreateSessionToken(payload)`

**Objetivo**: Criar um token de sessão (JWT) e armazená-lo em um cookie.

-   **Regras de Negócio:**
    1.  Recebe um objeto `payload` com os dados da sessão (informações do usuário, token de acesso da API externa, etc.).
    2.  Cria um JWT assinado com o algoritmo `HS256`.
    3.  Define o tempo de expiração do token para **6 horas**.
    4.  Assina o token usando o segredo definido em `process.env.NEXTAUTH_SECRET`.
    5.  Grava o token gerado em um cookie chamado `session-token`.
    6.  O cookie é configurado como `httpOnly`, `path=/`, e sua expiração é sincronizada com a do JWT.

---

### `GetSessionServer()`

**Objetivo**: Obter e validar a sessão do usuário a partir do cookie no lado do servidor.

-   **Regras de Negócio:**
    1.  Procura pelo cookie `session-token` na requisição.
    2.  Se o cookie não for encontrado, retorna `null` (usuário não está logado).
    3.  Se o cookie existe, a função `openSessionToken` é chamada para verificar e decodificar o JWT.
    4.  Se o token for inválido (expirado, assinatura incorreta), a função captura o erro e retorna `null`.
    5.  Se o token for válido, retorna um objeto de sessão contendo os dados do usuário (`user`), a data de expiração (`expires`), o próprio `token` e o `refreshToken`.

---

### `DeleteSession()`

**Objetivo**: Destruir a sessão do usuário (efetuar logout).

-   **Regras de Negócio:**
    1.  Remove o cookie `session-token` do navegador.

---

### `openSessionToken(token)`

**Objetivo**: Função auxiliar para verificar e decodificar um JWT.

-   **Regras de Negócio:**
    1.  Recebe uma string de `token`.
    2.  Utiliza o segredo (`process.env.NEXTAUTH_SECRET`) para verificar a assinatura e a validade do token.
    3.  Se a verificação for bem-sucedida, retorna o `payload` (os dados contidos dentro do token).
    4.  Se a verificação falhar, lança um erro que é tratado pela função que a chamou (como a `GetSessionServer`).

---

### `SetSession2fa(value, options)`

**Objetivo**: Criar um cookie para controlar o estado da verificação de dois fatores (A2F).

-   **Regras de Negócio:**
    1.  Recebe um valor booleano (`true` ou `false`).
    2.  Cria um cookie chamado `session_2fa` com o valor recebido (convertido para string).
    3.  Este cookie também é `httpOnly`.
    4.  Permite a configuração de um tempo de expiração. No fluxo de A2F, ele é configurado para durar **7 dias**, tornando a verificação por email desnecessária dentro desse período.

---

### `GetSession2fa()`

**Objetivo**: Verificar se o usuário já passou pela verificação A2F recentemente.

-   **Regras de Negócio:**
    1.  Lê o cookie `session_2fa`.
    2.  Se o cookie existir e seu valor for `"true"`, retorna `true`.
    3.  Caso contrário, retorna `false`.
