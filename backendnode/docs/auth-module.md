# Documentação Técnica - Módulo de Autenticação

## Visão Geral

O módulo de autenticação (`backend/src/auth/`) é responsável por toda a gestão de identidade e acesso do sistema iSelfToken. Implementa autenticação baseada em JWT com refresh tokens, verificação em duas etapas (2FA) via código de email, gerenciamento de sessões com Redis e armazenamento de tokens em cookies HTTP-only para máxima segurança.

## Padrão de Documentação

Este documento segue o padrão de documentação técnica do projeto, com explicações detalhadas em português brasileiro, exemplos de código e análises de decisões arquiteturais.

---

## 1. Arquitetura do Módulo

### Visão Geral da Arquitetura

```bash
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Auth Module (@Global)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │ AuthController  │───▶│  AuthService    │───▶│     PrismaService       │  │
│  │   (endpoints)   │    │ (business log)  │    │    (Database Access)    │  │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────────────┘  │
│           │                       │                                         │
│           ▼                       ▼                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │   AuthGuard     │    │  SessionService │    │   CookiesService        │  │
│  │ (protect routes)│    │  (Redis)        │    │  (HTTP-only cookies)    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌─────────────────┐                                 │
│                         │  JwtService     │                                 │
│                         │  (JWT signing)  │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Componentes do Módulo

| Componente     | Arquivo                        | Responsabilidade                              |
|----------------|--------------------------------|-----------------------------------------------|
| AuthController | `auth.controller.ts`           | Endpoints REST da API                         |
| AuthService    | `auth.service.ts`              | Lógica de negócio (login, registro, refresh)  |
| AuthGuard      | `auth.guard.ts`                | Proteção de rotas via CanActivate             |
| SessionService | `session/session.service.ts`   | Gerenciamento de sessões Redis                |
| CookiesService | `cookies/cookies.service.ts`   | Gerenciamento de cookies HTTP-only            |
| JwtModule      | `@nestjs/jwt`                  | Assinatura e verificação de tokens JWT        |

---

## 2. Fluxos de Autenticação

### 2.1 Fluxo de Login

```bash
Usuário POST /auth (email + senha)
         │
         ▼
   AuthService.login()
         │
         ├─▶ Prisma: buscar usuário por email
         │
         ├─▶ bcrypt.compare(senha, hash)
         │
         ├─▶ JWT.sign(payload, { expiresIn: '35m' })
         │
         ├─▶ JWT.sign(payload, { expiresIn: '7d' })
         │
         ├─▶ SessionService.createSession(userId, userData)
         │
         ├─▶ (opiconal) EmailService.sendVerificationCodeEmail()
         │
         ▼
   ResponseDto.success(access_token, refresh_token)
         │
         ▼
   CookiesService.setAccessToken(res, token)
         │
         ▼
   HTTP 200 + Cookie: access_token (httpOnly)
```

### 2.2 Fluxo de Proteção de Rotas (AuthGuard)

```bash
Requisição protegida (@UseGuards(AuthGuard))
         │
         ▼
   AuthGuard.canActivate()
         │
         ├─▶ CookiesService.getAccessToken(req)
         │
         ├─▶ jwtService.verify(token)
         │
         ├─▶ Verificar: payload.refresh === false
         │
         ├─▶ SessionService.getSession(userId)
         │
         ├─▶ Verificar: user.isActive === true
         │
         ▼
   request.user = user
         │
         ▼
   return true → permitir acesso
         │
         ▼
   return false → HTTP 401
```

### 2.3 Fluxo de Refresh Token

```bash
Usuário POST /auth/refresh (refreshToken)
         │
         ▼
   AuthService.refresh()
         │
         ├─▶ JWT.verify(refreshToken)
         │
         ├─▶ Prisma: buscar usuário (id, isActive)
         │
         ├─▶ JWT.sign(payload, { expiresIn: '35m' })
         │
         ▼
   ResponseDto.success(token)
         │
         ▼
   HTTP 200 (NOVO access_token)
```

### 2.4 Fluxo de Logout

```bash
Usuário POST /auth/logout (AuthGuard required)
         │
         ▼
   AuthController.logout()
         │
         ├─▶ SessionService.deleteSession(userId)
         │
         ├─▶ CookiesService.clearAccessToken(res)
         │
         ▼
   ResponseDto.success('Logout realizado com sucesso')
         │
         ▼
   HTTP 200 + Cookie removido
```

---

## 3. Endpoints da API

### 3.1 POST /auth - Login

**Descrição**: Autentica o usuário com email e senha.

**Request Body**:

```typescript
{
  email: string;        // Obrigatório, email válido
  senha: string;       // Obrigatório, senha do usuário
  codigo?: string;     // Opcional, código 2FA
  urlRedirect?: string; // Opcional, URL para redirect após verificação
}
```

**Response (200)**:

```typescript
{
  sucesso: true,
  mensagem: 'Login realizado com sucesso',
  codigo: 200,
  dados: {
    id: number,
    email: string,
    nome: string,
    role: string,
    isActive: boolean,
    access_token: string,
    refresh_token: string,
    token: string,
    refreshToken: string,
    exp: number // timestamp de expiração
  }
}
```

**Response (401)** - Credenciais inválidas:

```typescript
{
  sucesso: false,
  mensagem: 'Credenciais inválidas, email ou senha incorreto',
  codigo: 401,
  detalhe: { message: 'senha incorreta' }
}
```

**Decisões Arquiteturais**:

- **Normalização de email**: Transforma para lowercase via `@Transform()`
- **Campos sensíveis**: Remove campo `senha` da resposta
- **Cookie设置**: Access token automaticamente enviado via cookie HTTP-only

---

### 3.2 POST /auth/register/user - Registro

**Descrição**: Cria novo usuário no sistema.

**Request Body**:

```typescript
{
  email: string;           // Obrigatório, email único
  nome: string;            // Obrigatório, nome completo
  senha: string;           // Obrigatório, min 6 caracteres
  senhaConfirmacao: string; // Obrigatório, deve igualar senha
  telefone: string;       // Obrigatório, min 9 dígitos
  termosAceitos: boolean; // Obrigatório, aceite dos termos
  politicaAceita: boolean; // Obrigatório, aceite da política
  codigo: string;         // Obrigatório, 6 caracteres
  urlRedirect: string;    // Obrigatório, URL de redirect
}
```

**Response (201)**:

```typescript
{
  sucesso: true,
  mensagem: 'Usuário criado com sucesso',
  codigo: 201,
  dados: { id, email, nome, role, isActive, createdAt }
}
```

**Response (400)** - Email já existe:

```typescript
{
  sucesso: false,
  mensagem: 'Email já cadastrado',
  codigo: 400
}
```

**Decisões Arquiteturais**:

- **Validação de senha**: Confirmação obrigatória (senhaConfirmacao)
- **Transformação de telefone**: Remove caracteres não numéricos
- **Consentimento**: Campos booleanos obrigatórios (LGPD/GDPR)
- **Hash de senha**: bcrypt com salt rounds = 10

---

### 3.3 POST /auth/refresh - Atualizar Token

**Descrição**: Renova o access token usando um refresh token válido.

**Request Body**:

```typescript
{
  refreshToken: string; // Obrigatório, token de refresh
}
```

**Response (200)**:

```typescript
{
  sucesso: true,
  mensagem: 'Token renovado com sucesso',
  codigo: 200,
  dados: { id, email, nome, role, isActive, token, refreshToken, exp }
}
```

**Response (401)** - Token expirado:

```typescript
{
  sucesso: false,
  mensagem: 'Refresh token expirado',
  codigo: 401,
  detalhe: { message: 'Token expirado' }
}
```

**Decisões Arquiteturais**:

- **Sem AuthGuard**: Endpoint público (refresh token é a credencial)
- **Validação de usuário**: Verifica se usuário ainda existe e está ativo
- **Refresh token inalterado**: Mantém o mesmo refresh token (não renova)

---

### 3.4 POST /auth/logout - Logout

**Descrição**: Encerra a sessão do usuário.

**Headers**: `Authorization: Bearer <access_token>` (via cookie)

**Response (200)**:

```typescript
{
  sucesso: true,
  mensagem: 'Logout realizado com sucesso',
  codigo: 200
}
```

**Decisões Arquiteturais**:

- **AuthGuard obrigatório**: Usuário deve estar autenticado
- **Limpeza em duas etapas**: Remove sessão Redis + limpa cookie
- **Idempotência**: Não retorna erro se sessão não existir

---

### 3.5 POST /auth/forgot-password - Esqueci Minha Senha

**Descrição**: Inicia o processo de recuperação de senha.

**Request Body**:

```typescript
{
  email: string;  // Obrigatório, email do usuário
  codigo: string; // Obrigatório, código de 6 caracteres
}
```

**Response (200)**:

```typescript
{
  sucesso: true,
  mensagem: 'Email encontrado. Código de recuperação será enviado',
  codigo: 200,
  dados: { userId, email }
}
```

**Status**: Parcialmente implementado (TODO: envio de código por email)

---

### 3.6 POST /auth/change-password/:id - Alterar Senha

**Descrição**: Altera a senha do usuário.

**Request Body**:

```typescript
{
  senha: string;          // Obrigatório, min 6 caracteres
  confirmarSenha: string; // Obrigatório, deve igualar senha
}
```

**Response (200)**:

```typescript
{
  sucesso: true,
  mensagem: 'Senha alterada com sucesso',
  codigo: 200,
  dados: { userId, email }
}
```

**Decisões Arquiteturais**:

- **Verificação de usuário**: Confirma existência e status ativo
- **Hash de senha**: bcrypt com salt rounds = 10

---

### 3.7 POST /auth/newcode - Novo Código de Verificação

**Descrição**: Envia novo código de verificação via email.

**Request Body**:

```typescript
{
  email: string;      // Obrigatório, email do usuário
  codigo: string;     // Obrigatório, código de 6 caracteres
  urlRedirect?: string; // Opcional, URL de redirect
}
```

---

## 4. Estrutura de Arquivos

```bash
auth/
├── auth.module.ts           # Módulo root (@Global), exports AuthGuard, JwtModule
├── auth.controller.ts      # Endpoints REST
├── auth.service.ts         # Lógica de negócio
├── auth.guard.ts           # CanActivate para proteção de rotas
├── auth.guard.spec.ts      # Testes do guard
├── auth.service.spec.ts    # Testes do serviço
├── auth.controller.spec.ts # Testes do controller
├── AGENTS.md              # Base de conhecimento para agents
│
├── dto/                    # Data Transfer Objects
│   ├── login-auth.dto.ts
│   ├── create-auth.dto.ts
│   ├── refresh-token.dto.ts
│   ├── forgot-password.dto.ts
│   ├── change-password.dto.ts
│   └── new-code.dto.ts
│
├── entities/               # Entidades de resposta (Swagger)
│   ├── login.entity.ts
│   ├── create.entity.ts
│   └── refresh.entity.ts
│
├── cookies/                # Gerenciamento de cookies HTTP-only
│   ├── cookies.module.ts
│   └── cookies.service.ts
│
└── session/                # Gerenciamento de sessões Redis
    ├── redis.module.ts
    └── session.service.ts
```

---

## 5. Configurações de Segurança

### 5.1 Cookies HTTP-only

```typescript
// cookies.service.ts
res.cookie('access_token', token, {
  httpOnly: true,        // Não acessível via JavaScript
  sameSite: 'strict',   // Previne CSRF
  secure: process.env.NODE_ENV === 'production',
  maxAge: 35 * 60 * 1000 // 35 minutos
});
```

| Configuração   | Valor           | Propósito                              |
|----------------|-----------------|----------------------------------------|
| httpOnly       | true            | Proteção contra XSS                    |
| sameSite       | strict          | Proteção contra CSRF                   |
| secure         | production only | HTTPS apenas em produção               |
| maxAge         | 35 min          | sincronizado com access token          |

### 5.2 TTLs (Time To Live)

| Recurso        | TTL        | Configuração                           |
|----------------|------------|----------------------------------------|
| Access Token   | 35 minutos | `JWT_EXPIRES_IN` ou default '35m'      |
| Refresh Token  | 7 dias     | Hardcoded '7d'                         |
| Session Redis  | 7 dias     | `DEFAULT_TTL = 604800` segundos        |
| Cookie         | 35 minutos | `MAX_AGE_MS = 35 * 60 * 1000`          |

**Decisão**: Session Redis e Refresh Token com mesmo TTL (7 dias) permite renovação contínua sem re-login.

---

## 6. Integração com Redis (SessionService)

### 6.1 Estrutura da Sessão

```typescript
// Chave: session:{userId}
// Valor: JSON
{
  id: string,
  nome: string,
  email: string,
  role: string,
  isActive: boolean
}
```

### 6.2 Métodos do SessionService

| Método         | Descrição                   | Uso no Fluxo          |
|----------------|-----------------------------|-----------------------|
| createSession  | Cria sessão com TTL         | Login, registro       |
| getSession     | Busca sessão do Redis       | AuthGuard             |
| updateSession  | Atualiza dados + mantém TTL | Atualização de perfil |
| deleteSession  | Remove sessão               | Logout                |
| refreshSession | Renova TTL da sessão        | Renovação de sessão   |

### 6.3 Benefícios da Session Redis

1. **Performance**: Elimina query no banco a cada request protegida
2. **Consistência**: Sessão pode ser invalidada globalmente
3. **TTL automático**: Expira junto com refresh token

---

## 7. Decisões Arquiteturais Importantes

### 7.1 Hybrid Cookies + Redis

**Problema original**: Access token em localStorage + query no banco a cada request.

**Solução implementada**:

- Access token em HTTP-only cookie (seguro contra XSS)
- Dados do usuário em Redis (evita query no banco)

**Trade-offs**:

- ✅ Mais seguro (httpOnly, sameSite)
- ✅ Mais rápido (sem DB query)
- ❌ Requer Redis disponível

### 7.2 Global Module

```typescript
@Global()
@Module({
  // ...
  exports: [AuthGuard, JwtModule, SessionModule, CookiesModule],
})
export class AuthModule {}
```

**Decisão**: Módulo global permite usar AuthGuard em qualquer módulo sem imports extras.

### 7.3 Refresh Token no Body

```typescript
// refresh-token.dto.ts
class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

**Decisão**: Refresh token enviado no body (não header) para facilitar persistência em storage client-side.

### 7.4 Tratamento de Erros

```typescript
// auth.service.ts - login()
catch (error) {
  throw new HttpException(
    ResponseDto.error(
      error?.message || 'Erro ao realizar login',
      error?.status || 400,
      error?.response.detalhe || error  // ⚠️ Sem null check
    ),
    error?.status || 400,
  );
}
```

**Problema identificado**: `error?.response.detalhe` pode ser undefined, causando possível erro em cascata.

---

## 8. Integração com Sentry

O módulo de autenticação deve ser instrumentado com Sentry para monitoramento de erros e tracing.

### 8.1 Configuração Necessária

```bash
# Instalação do SDK
npm install @sentry/nestjs
```

### 8.2 Arquivos a Criar

| Arquivo             | Propósito                                 |
|---------------------|-------------------------------------------|
| `src/instrument.ts` | Inicialização do Sentry (primeiro import) |
| `src/main.ts`       | Importar instrument.ts primeiro           |

### 8.3_span_ Personalizados

Recomenda-se adicionar tracing para operações críticas:

- `auth.login` - Tempo de login
- `auth.refresh` - Tempo de refresh
- `auth.logout` - Tempo de logout
- `auth.register` - Tempo de registro

---

## 9. Testes Recomendados

### 9.1 Testes Unitários

**AuthService**:

- login() com credenciais válidas
- login() com senha incorreta
- login() com usuário inativo
- refresh() com token válido
- refresh() com token expirado

**AuthGuard**:

- canActivate() com token válido
- canActivate() sem token
- canActivate() com token expirado
- canActivate() com refresh token

**SessionService**:

- createSession()
- getSession()
- deleteSession()

### 9.2 Testes de Integração

- Fluxo completo: registro → login → acesso protegido → logout
- Refresh token após expiração do access token
- Recuperação de senha

---

## 10. Variáveis de Ambiente

| Variável         | Descrição                                | Obrigatório |
|------------------|------------------------------------------|-------------|
| JWT_SECRET       | Secret para assinatura JWT               | Sim         |
| JWT_EXPIRES_IN   | Expiração do access token (default: 35m) | Não         |
| REDIS_HOST       | Host do Redis (default: localhost)       | Não         |
| REDIS_PORT       | Porta do Redis (default: 6379)           | Não         |

---

## 11. Anti-Patterns Identificados

### 11.1 Type Cast Inseguro

```typescript
// auth.service.ts:96
expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '35m') as any
```

**Problema**: Uso de `as any`绕过 TypeScript type checking.

**Correção sugerida**:

```typescript
expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '35m'
```

### 11.2 Error sem Type Narrowing

```typescript
// auth.service.ts:144
error?.response.detalhe || error
```

**Problema**: Acesso a propriedade sem verificar se objeto existe.

### 11.3 Guard Carrega Todas as Relações

```typescript
// auth.guard.ts - berpotensi carregar dados pesados
const user = await this.sessionService.getSession(userId);
```

**Observação**: Session usa Redis (melhor que DB), mas dados devem ser mínimos.

---

## 12. Melhorias Futuras Sugeridas

### 12.1 Rate Limiting

Adicionar rate limiting nos endpoints de login/refresh para prevenir brute force.

### 12.2 Implementação Completa do 2FA

- Validar código 2FA no login (atualmente só envia email)
- Armazenar código em Redis com TTL curto (5 min)

### 12.3 Forgot Password Completo

- Implementar geração de código
- Armazenar código temporário (Redis)
- Validação de código antes da mudança de senha

### 12.4 Rotação de Refresh Token

Atualizar refresh token a cada uso (invalidar antigo, gerar novo).

---

## 13. Histórico de Mudanças

### v1.0 (2026-03-25)

- Implementação inicial do módulo de autenticação
- Login com JWT + refresh token
- Session Redis para performance
- Cookies HTTP-only para segurança
- Registro de usuários com validação
- Logout com limpeza de sessão
- AuthGuard para rotas protegidas
- Endpoints de recuperação de senha (parcial)

---

## 14. Referências

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS JWT](https://github.com/nestjs/jwt)
- [Sentry NestJS SDK](/home/kingdev/.config/opencode/skills/sentry-nestjs-sdk/sentry/nestjs)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [ioredis](https://github.com/luin/ioredis)
- [JWT.io](https://jwt.io/)
