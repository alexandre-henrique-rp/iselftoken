# API de Autenticação - iSelfToken

## Descrição Geral

Endpoints principais para autenticação de usuários no sistema iSelfToken, gerenciando login, recuperação de sessão e logout. A autenticação está em transição de um sistema mock para uma integração com backend real utilizando um **adaptador genérico**, implementado através de uma camada de infraestrutura, seguindo os princípios de **Clean Architecture**. Isso permite substituição futura do provedor de autenticação sem impactar o domínio.

## Tipo de Acesso

- **Público**: Qualquer usuário pode acessar os endpoints de login (`POST /api/auth`).
- **Protegido**: Os endpoints de sessão (`GET /api/auth`, `GET /api/auth/session`) e logout (`DELETE /api/auth`) requerem uma sessão ativa, gerenciada por cookies HTTP-only.

## Endpoints

### 1. POST /api/auth - Login do Usuário

- **Descrição**: Autentica um usuário com email e senha, criando uma sessão. Atualmente, utiliza um **adaptador genérico** na camada de infraestrutura (`GenericAuthAdapter`), substituindo o sistema mock anterior.
- **Funcionalidade**: 
  - Recebe credenciais do usuário (email, senha).
  - Chama o método `login` do adaptador de autenticação.
  - Em caso de sucesso, cria um token de sessão com `CreateSessionToken`.
  - Retorna mensagem de sucesso para o frontend.
- **Request**:
  - **Body**: JSON com `email` (string) e `password` (string).
    ```json
    {
      "email": "usuario@exemplo.com",
      "password": "senha123"
    }
    ```
- **Response**:
  - **200 OK**: Autenticação bem-sucedida.
    ```json
    { "message": "Autenticado com sucesso" }
    ```
  - **500 Internal Server Error**: Falha na autenticação.
    ```json
    { "error": "Erro ao autenticar" }
    ```
- **Caminho no Código**: 
  - **Frontend**: `src/components/login-form.tsx` (envia requisição).
  - **Backend**: `src/app/api/auth/route.ts` (lógica de autenticação).
  - **Adaptador**: `src/infrastructure/auth/generic-adapter.ts` (implementação genérica).
- **Dependências**:
  - Biblioteca `next/server` para respostas HTTP.
  - Contexto de autenticação em `src/context/auth.ts` para gerenciamento de sessão.
  - Adaptador de autenticação em `src/infrastructure/auth/adapter.ts` (interface) e `src/infrastructure/auth/generic-adapter.ts` (implementação genérica).
- **Observações de Segurança**:
  - Credenciais enviadas via HTTPS (garantido pelo ambiente de produção).
  - Sessão armazenada em cookie HTTP-only, prevenindo acesso via JavaScript.
  - **TODO**: Configuração de um backend real para autenticação.

### 2. GET /api/auth - Obter Dados da Sessão

- **Descrição**: Retorna os dados da sessão atual (payload do token JWT) ou `null` se não houver sessão ativa. Utiliza o adaptador de autenticação (`GenericAuthAdapter`) para obter a sessão.
- **Funcionalidade**: 
  - Consulta o adaptador via método `getSession`.
  - Retorna os dados da sessão ou `null`.
- **Request**: Sem parâmetros adicionais (cookie de sessão é enviado automaticamente).
- **Response**:
  - **200 OK**: Retorna a sessão ou `null`.
    ```json
    { 
      "session": {
        "user": {
          "id": "user-id-123",
          "email": "usuario@exemplo.com",
          "name": "Nome do Usuário",
          "role": "investidor"
        },
        "token": "jwt-token-aqui"
      }
    }
    ```
    ou
    ```json
    { "session": null }
    ```
  - **500 Internal Server Error**: Falha ao obter sessão.
    ```json
    { "error": "Erro ao obter sessão" }
    ```
- **Caminho no Código**: 
  - **Frontend**: Utilizado por hooks ou componentes para verificar estado de login.
  - **Backend**: `src/app/api/auth/route.ts` (método `GET`).
  - **Adaptador**: `src/infrastructure/auth/generic-adapter.ts` (método `getSession`).

### 3. DELETE /api/auth - Logout do Usuário

- **Descrição**: Finaliza a sessão do usuário, destruindo o cookie de sessão. Utiliza o adaptador de autenticação (`GenericAuthAdapter`) para realizar o logout.
- **Funcionalidade**: 
  - Chama o método `logout` do adaptador.
  - Limpa o cookie de sessão com `DeleteSession`.
- **Request**: Sem parâmetros adicionais (cookie de sessão é enviado automaticamente).
- **Response**:
  - **200 OK**: Sessão finalizada.
    ```json
    { "message": "Sessão finalizada" }
    ```
  - **500 Internal Server Error**: Falha ao finalizar sessão.
    ```json
    { "error": "Erro ao finalizar sessão" }
    ```
- **Caminho no Código**: 
  - **Frontend**: `src/components/nav-user.tsx` (botão de logout).
  - **Backend**: `src/app/api/auth/route.ts` (método `DELETE`).
  - **Adaptador**: `src/infrastructure/auth/generic-adapter.ts` (método `logout`).

### 4. GET /api/auth/session - Endpoint Adicional de Sessão

- **Descrição**: Endpoint adicional para retornar dados da sessão, similar a `GET /api/auth`. Utilizado por hooks específicos no frontend. Atualmente mapeado para o mesmo adaptador.
- **Funcionalidade**: Idêntica a `GET /api/auth`, consulta o adaptador para obter a sessão.
- **Request/Response**: Mesma estrutura de `GET /api/auth`.
- **Caminho no Código**: 
  - Implementado como alias em `src/app/api/auth/session/route.ts`.
  - Usa o mesmo adaptador de autenticação.

## Restrições

- **Sessão**: Os endpoints `GET` e `DELETE` só funcionam com uma sessão ativa (cookie presente e válido).
- **Validação**: O endpoint `POST` requer email e senha válidos conforme schema no frontend e regras do provedor de autenticação.

## Dependências

- **Frontend**: Componentes como `login-form.tsx` e hooks de autenticação.
- **Backend**: Contexto de sessão em `src/context/auth.ts`.
- **Infraestrutura**: Adaptadores de autenticação em `src/infrastructure/auth/`.
- **Segurança**: Cookies HTTP-only gerenciados pelo Next.js.
- **Bibliotecas**: `next/server` para respostas HTTP.
- **Provedor**: Adaptador genérico (em implementação, substituindo mock).

## Fluxo Geral de Autenticação

1. **Login**: Usuário envia email/senha via `POST /api/auth` -> Adaptador genérico autentica -> Sessão criada com cookie HTTP-only -> Frontend redireciona para `/auth` (A2F, se aplicável).
2. **Verificação de Sessão**: Frontend consulta `GET /api/auth` ou `GET /api/auth/session` -> Adaptador retorna dados da sessão ou `null`.
3. **Logout**: Usuário clica em logout (`DELETE /api/auth`) -> Adaptador finaliza sessão -> Cookie é destruído -> Frontend redireciona para página pública.

## Melhorias Sugeridas

- **Integração com Backend Real**: Finalizar configuração de um serviço de autenticação real, substituindo o adaptador genérico.
- **Testes TDD**: Criar testes unitários e de integração para os adaptadores de autenticação e endpoints.
- **Tratamento de Erros**: Adicionar mensagens de erro mais específicas no frontend.
- **Plano de Migração**: Documentar passos para migração futura a uma solução própria de autenticação, se necessário.
- **Performance**: Implementar cache de sessão no lado do servidor, se aplicável, para reduzir chamadas ao provedor.

## Observações

- A transição para um backend real de autenticação está em andamento; atualmente, o adaptador `GenericAuthAdapter` contém placeholders que simulam comportamento até a configuração de um serviço real.
- A arquitetura com adaptadores permite flexibilidade para mudar de provedor de autenticação sem alterar o domínio ou a lógica de negócio, seguindo os princípios de DDD e SOLID.
