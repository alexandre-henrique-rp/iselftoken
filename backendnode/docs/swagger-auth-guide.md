# Documentação de Autenticação - Swagger

## Visão Geral

A API iSelfToken utiliza autenticação baseada em **cookie HTTP-only** com sessão armazenada no **Redis**. Não utilizamos JWT tokens - a autenticação é gerenciada completamente server-side.

## Como Funciona

### 1. Login

Faça login via `POST /auth` com email e senha:

```json
{
  "email": "usuario@exemplo.com",
  "senha": "123456"
}
```

**Resposta**:
```json
{
  "sucesso": true,
  "mensagem": "Login realizado com sucesso",
  "codigo": 200,
  "dados": {
    "id": 1,
    "email": "usuario@exemplo.com",
    "nome": "João Silva",
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-03-25T10:00:00.000Z",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Cookie Setado**:
```
Set-Cookie: session_id=550e8400-e29b-41d4-a716-446655440000; HttpOnly; SameSite=Strict; Max-Age=604800
```

### 2. Acessar Dados do Usuário

Após o login, o cookie `session_id` é enviado automaticamente pelo navegador:

```bash
GET /auth/me
Cookie: session_id=550e8400-e29b-41d4-a716-446655440000
```

**Resposta**:
```json
{
  "sucesso": true,
  "mensagem": "Usuário encontrado",
  "codigo": 200,
  "dados": {
    "id": 1,
    "email": "usuario@exemplo.com",
    "nome": "João Silva",
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-03-25T10:00:00.000Z"
  }
}
```

### 3. Logout

```bash
POST /auth/logout
Cookie: session_id=550e8400-e29b-41d4-a716-446655440000
```

**Resposta**:
```json
{
  "sucesso": true,
  "mensagem": "Logout realizado com sucesso",
  "codigo": 200
}
```

**Cookie Removido**:
```
Set-Cookie: session_id=; Max-Age=0
```

---

## Usando o Swagger

### Passo 1: Fazer Login

1. Abra o Swagger: `http://localhost:7077/docs`
2. Clique no endpoint `POST /auth`
3. Preencha os campos:
   - `email`: seu email cadastrado
   - `senha`: sua senha
4. Clique em "Execute"
5. O cookie `session_id` será setado automaticamente pelo navegador

### Passo 2: Acessar Endpoints Protegidos

1. Clique no endpoint `GET /auth/me` (ou qualquer endpoint protegido)
2. Clique em "Execute"
3. O cookie será enviado automaticamente
4. Você verá os dados do usuário

### Passo 3: Fazer Logout

1. Clique no endpoint `POST /auth/logout`
2. Clique em "Execute"
3. O cookie será removido
4. Endpoints protegidos retornarão 401

---

## Endpoints

### Públicos (Sem Autenticação)

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/auth` | Login |
| POST | `/auth/register/user` | Registro |
| POST | `/auth/forgot-password` | Recuperação de senha |
| POST | `/auth/change-password/:id` | Alterar senha |
| POST | `/auth/newcode` | Novo código de verificação |

### Protegidos (Requer Cookie session_id)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/auth/me` | Dados do usuário logado |
| POST | `/auth/logout` | Logout |

---

## Características de Segurança

### HTTP-only
O cookie `session_id` não pode ser acessado via JavaScript:
```javascript
document.cookie // Não mostra session_id
```

### SameSite: Strict
O cookie não é enviado em requisições cross-site:
```html
<!-- Requisição de outro domínio NÃO envia o cookie -->
<img src="https://api.iselftoken.com/auth/me" />
```

### Secure (Produção)
Em produção, o cookie só é enviado via HTTPS:
```
Set-Cookie: session_id=...; Secure
```

### TTL de 7 Dias
A sessão expira automaticamente após 7 dias de inatividade:
```
Max-Age=604800 (7 dias em segundos)
```

---

## Exemplos com curl

### Login
```bash
curl -X POST http://localhost:7077/auth \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "senha": "123456"}' \
  -c cookies.txt
```

### Acessar Dados do Usuário
```bash
curl http://localhost:7077/auth/me \
  -b cookies.txt
```

### Logout
```bash
curl -X POST http://localhost:7077/auth/logout \
  -b cookies.txt
```

---

## Tratamento de Erros

### 401 - Não Autenticado
```json
{
  "sucesso": false,
  "mensagem": "Sessão não fornecida",
  "codigo": 401
}
```

### 401 - Sessão Inválida
```json
{
  "sucesso": false,
  "mensagem": "Sessão inválida ou expirada",
  "codigo": 401
}
```

### 401 - Usuário Inativo
```json
{
  "sucesso": false,
  "mensagem": "Usuário inativo",
  "codigo": 401
}
```

---

## Comparação: JWT vs Cookie+Redis

| Aspecto | JWT (antes) | Cookie+Redis (agora) |
|---------|-------------|----------------------|
| Token | Access + Refresh tokens | Session ID (UUID) |
| Storage | Cookie (35min) + Refresh (7d) | Cookie (7 dias) |
| Validation | JWT.verify() | Redis.get() |
| Revocation | Complexa | Simples (deleta Redis) |
| Complexity | Alta | Baixa |
| Security | XSS via localStorage | HTTP-only (protegido) |
