# Contexto de autenticação
## **Type:** private

## **funcionalidade:**
- o contexto de autenticação é responsável por gerenciar o estado de autenticação do usuário
- ele fornece funções para login,logout, loading, user, isAuthenticated e isAuthAfterLogin
- login: 
  - recebe email e senha
  - se não tiver o cookie AF2_AUTHENTICATED, deve gerar um código de 6 dígitos e enviar para o email do usuário(criar função separada para gerar esse código, e um função para verificar se o cookie AF2_AUTHENTICATED existe)
  - faz chamada para api enviado email senha e código(se não tiver o cookie AF2_AUTHENTICATED)
  - exemplo de retorno:
```json
  {
    "error": false,
    "message": "Login realizado com sucesso",
    "codigo": 200,
    "data": {
      "id": 1,
      "email": "email@email.com",
    "nome": "John Doe",
    "role": "USER",
    "isActive": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9(com expiração em 30mim)",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9(com expiração em 7 dias)",
    "exp": 1769433824
    }
  }
```
  - separe em 4 partes: token, user exp e refresh_token
  - o user vai ser criptografado e salvo no cookie com o tempo de exp 
  - o token vai ser criptografado e salvo no cookie con o tempo de 30mim
  - o refresh_token vai ser salvo no localStorage
  - se não tiver o cookie AF2_AUTHENTICATED, o usuário deve ser redirecionado para /auth e o código deve ser salvo no localStorage
  - se tiver o cookie AF2_AUTHENTICATED, o usuário deve ser redirecionado para /home
- logout:
  - remove o cookie do usuário
  - remove o cookie do token
  - redireciona para /login
- isAuthenticated:
  - verifica se o cookie usuário existe
- token:
  - retorna o token do cookie
  - caso não exista, verificar se existe o cookie AF2_AUTHENTICATED, decriptografar e revalidar o token em ApiPage.newToken(refreshToken)
  - exemplo de retorno:
  ```json
  {
    "error": false,
    "message": "Token renovado com sucesso",
    "codigo": 200,
    "data": {
      "id": 1,
      "email": "email@email.com",
      "nome": "John Doe",
      "role": "USER",
      "isActive": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9(com expiração em 30mim)",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9(com expiração em 7 dias)",
      "exp": 1769433824
    }
  }
  ```
  - se a resposta for sucesso, deve recriar o cookie do token com expiração de 30mim
  - se a resposta for erro, deve remover o cookie do token e o cookie do usuário e enviar para /login
- isAuthAfterLogin:
  - verifica se o cookie AF2_AUTHENTICATED existe
  - se existir, o refreshToken deve ser retornado
  - se não existir, retornar null
- loading:
  - retorna true se o usuário está sendo carregado
  - retorna false se o usuário não está sendo carregado
- user:
  - retorna o usuário pegando da UserApi.me()
  - exemplo de retorno da api 
  ```json
    {
      "error": false,
      "message": "Usuário encontrado com sucesso",
      "codigo": 200,
      "data": {
        "id": 1,
        "publicId": "2b1d5a1f-2c2f-4c8a-8e6f-1a2b3c4d5e6f",
        "email": "email@dominio.com",
        "nome": "Nome do Usuário",
        "role": "USER",
        "telefone": "+55 11 99999-9999",
        "data_nascimento": "1990-01-01T00:00:00.000Z",
        "genero": "MASCULINO",
        "endereco": "Rua Exemplo",
        "numero": "100",
        "complemento": "Apto 12",
        "bairro": "Centro",
        "cidade": "São Paulo",
        "uf": "SP",
        "cep": "01000-000",
        "pais": "Brasil",
        "tipo_documento": "RG",
        "reg_documento": "123456789",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "avatar": {
          "id": 1,
          "url": "arquivo.pdf",
          "url_sm": "arquivo_sm.pdf",
          "url_md": "arquivo_md.pdf",
          "url_lg": "arquivo_lg.pdf",
          "status": "PENDING"
        },
        "comprovante": {
          "id": 1,
          "url": "arquivo.pdf",
          "url_sm": "arquivo_sm.pdf",
          "url_md": "arquivo_md.pdf",
          "url_lg": "arquivo_lg.pdf",
          "status": "PENDING"
        },
        "documento": {
          "id": 1,
          "url": "arquivo.pdf",
          "url_sm": "arquivo_sm.pdf",
          "url_md": "arquivo_md.pdf",
          "url_lg": "arquivo_lg.pdf",
          "status": "PENDING"
        },
        "biofacial": {
          "id": 1,
          "url": "arquivo.pdf",
          "url_sm": "arquivo_sm.pdf",
          "url_md": "arquivo_md.pdf",
          "url_lg": "arquivo_lg.pdf",
          "status": "PENDING"
        },
        "wallet": {
          "id": 1,
          "balance": "1000.00",
          "blocked": "0.00",
          "currency": "BRL"
        },
        "payments": [
          {
            "id": 1,
            "amount": "100.00",
            "method": "PIX",
            "status": "PAID"
          }
        ],
        "subscriptions": [
          {
            "id": 1,
            "status": "ACTIVE",
            "startedAt": "2024-01-01T00:00:00.000Z",
            "expiresAt": "2025-01-01T00:00:00.000Z"
          }
        ],
        "startups": [
          {
            "id": 1,
            "nome": "Minha Startup",
            "slug": "minha-startup",
            "status": "PENDING"
          }
        ],
        "investments": [
          {
            "id": 1,
            "amount": "500.00",
            "tokensQty": 10,
            "status": "CONFIRMED"
          }
        ],
        "tokens": [
          {
            "id": "uuid",
            "hash": "hash",
            "quantity": 1,
            "purchaseVal": "100.00",
            "currentVal": "120.00"
          }
        ],
        "tokenHistory": [
          {
            "id": 1,
            "type": "BUY_MARKET",
            "amount": "10.00",
            "description": "Compra no mercado"
          }
        ],
        "auditLogs": [
          {
            "id": 1,
            "action": "UPDATE_STARTUP",
            "entity": "Startup",
            "entityId": "1",
            "createdAt": "2024-01-01T00:00:00.000Z"
          }
        ]
      }
    }
  ```
  - tem que ter uma função para verificar se o usuário contem plano e que seja rule === 'USER'
  - se não tiver plano, redirecionar para /planos


## **documentação:**
- cookies:
  - create => [https://api.reactrouter.com/v7/functions/react_router.createCookie.html](https://api.reactrouter.com/v7/functions/react_router.createCookie.html) 
  - isCookie => [https://api.reactrouter.com/v7/functions/react_router.isCookie.html](https://api.reactrouter.com/v7/functions/react_router.isCookie.html)
  - isCookieExpired => [https://api.reactrouter.com/v7/functions/react_router.isCookieExpired.html](https://api.reactrouter.com/v7/functions/react_router.isCookieExpired.html)
  - destroy => [https://api.reactrouter.com/v7/functions/react_router.destroyCookie.html](https://api.reactrouter.com/v7/functions/react_router.destroyCookie.html)
- session
  - create => [https://api.reactrouter.com/v7/functions/react_router.createSession.html](https://api.reactrouter.com/v7/functions/react_router.createSession.html)
  - isSession => [https://api.reactrouter.com/v7/functions/react_router.isSession.html](https://api.reactrouter.com/v7/functions/react_router.isSession.html)
  - isSessionExpired => [https://api.reactrouter.com/v7/functions/react_router.isSessionExpired.html](https://api.reactrouter.com/v7/functions/react_router.isSessionExpired.html)
  - destroy => [https://api.reactrouter.com/v7/functions/react_router.destroySession.html](https://api.reactrouter.com/v7/functions/react_router.destroySession.html)
- dividas [https://api.reactrouter.com/v7/modules/react_router.html](https://api.reactrouter.com/v7/modules/react_router.html)
