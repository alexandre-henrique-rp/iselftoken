---
title: Auth Module Specification - Cookie + Redis Session
version: 2.0
date_created: 2026-03-25
last_updated: 2026-03-25
owner: Backend Team
tags: [`architecture`, `design`, `auth`, `security`, `nestjs`, `cookie`, `redis`]
---


## Introduction

This specification defines the authentication and authorization system for the iSelfToken backend API. The module provides session-based authentication using HTTP-only cookies with server-side session storage in Redis, eliminating the need for JWT tokens and refresh tokens.

## 1. Purpose & Scope

### Purpose

The Auth Module provides a secure authentication system for the iSelfToken fintech platform, enabling user registration, login, session management, and protected route access control. The system uses server-side sessions stored in Redis with HTTP-only cookies for client-side session identification.

### Scope

This specification covers:

- User login with email/password authentication
- User registration with validation and email verification
- Server-side session creation and management via Redis
- HTTP-only cookie for session identification
- Authentication guard for protected routes
- Password recovery flow (forgot/change password)
- 2FA verification code sending via email

### Intended Audience

- Backend developers implementing authentication features
- Frontend developers integrating with authentication endpoints
- DevOps engineers configuring security infrastructure
- Security auditors reviewing authentication implementation

### Assumptions

- Redis server is available for session storage
- Email service (AWS SES) is configured for transactional emails
- Prisma ORM is used for database access
- NestJS framework version 8-10 is in use

## 2. Definitions

| Term             | Definition                                                            |
|------------------|-----------------------------------------------------------------------|
| Session          | Redis-stored user data with configurable TTL for authentication       |
| Session ID       | Unique identifier stored in HTTP-only cookie to identify user session |
| HTTP-only Cookie | Cookie that cannot be accessed via JavaScript (XSS-resistant)         |
| AuthGuard        | NestJS CanActivate guard for protecting routes                        |
| bcrypt           | Password hashing algorithm with salt rounds                           |
| 2FA              | Two-Factor Authentication - Additional verification via email code    |
| Sentry           | Error monitoring and tracing platform for production observability    |

## 3. Requirements, Constraints & Guidelines

### Security Requirements

- **SEC-001**: Session ID must be stored in HTTP-only cookies with `sameSite: strict`
- **SEC-002**: Passwords must be hashed using bcrypt with salt rounds >= 10
- **SEC-003**: Session data must be stored in Redis with configurable TTL
- **SEC-004**: Session must be validated from Redis on each protected request
- **SEC-005**: Session must be invalidated on logout (deleted from Redis)
- **SEC-006**: Cookie must be cleared on logout

### Functional Requirements

- **REQ-001**: POST `/auth` - Login with email/password returns session cookie
- **REQ-002**: POST `/auth/register/user` - Register new user with validation
- **REQ-003**: POST `/auth/logout` - Clear session and cookie (protected endpoint)
- **REQ-004**: POST `/auth/forgot-password` - Initiate password recovery
- **REQ-005**: POST `/auth/change-password/:id` - Change user password
- **REQ-006**: POST `/auth/newcode` - Send new verification code via email
- **REQ-007**: GET `/auth/me` - Get current user data from session (protected endpoint)

### Data Validation Requirements

- **REQ-008**: Email must be valid format and normalized to lowercase
- **REQ-009**: Password must be minimum 6 characters
- **REQ-010**: Phone must be numeric and minimum 9 characters
- **REQ-011**: Terms and privacy policy must be accepted (boolean)
- **REQ-012**: Verification code must be exactly 6 characters

### Performance Requirements

- **PERF-001**: Protected routes must use Redis session instead of database query
- **PERF-002**: Session TTL must be configurable (default 7 days)
- **PERF-003**: Cookie maxAge must match session TTL

### Constraints

- **CON-001**: Module must be marked as `@Global()` for app-wide availability
- **CON-002**: Guard-based authentication required for protected routes via `@UseGuards(AuthGuard)`
- **CON-003**: All responses must use `ResponseDto` wrapper format
- **CON-004**: Error messages must be in Portuguese (PT-BR)
- **CON-005**: DTOs must use class-validator decorators for validation
- **CON-006**: Swagger annotations required on all endpoints

### Guidelines

- **GUD-001**: Use NestJS Logger for logging (not console.log)
- **GUD-002**: Follow module/controller/service/dto/entity pattern
- **GUD-003**: Response entities must be in `entities/` subfolder
- **GUD-004**: DTOs must be in `dto/` subfolder
- **GUD-005**: Catch blocks must narrow error type before accessing properties

## 4. Interfaces & Data Contracts

### Authentication Endpoints

| Method | Path                        | Auth Required | Description                |
| ------ | --------------------------- | ------------- | -------------------------- |
| POST   | `/auth`                     | No            | User login                 |
| POST   | `/auth/register/user`       | No            | User registration          |
| POST   | `/auth/logout`              | Yes           | User logout                |
| POST   | `/auth/forgot-password`     | No            | Initiate password recovery |
| POST   | `/auth/change-password/:id` | No            | Change password            |
| POST   | `/auth/newcode`             | No            | Send new verification code |
| GET    | `/auth/me`                  | Yes           | Get current user data      |

### Request DTOs

#### LoginAuthDto

```typescript
{
  email: string;        // Required, valid email, normalized to lowercase
  senha: string;        // Required, user password
  codigo?: string;      // Optional, 2FA verification code
  urlRedirect?: string; // Optional, redirect URL after verification
}
```

#### CreateAuthDto

```typescript
{
  email: string;            // Required, valid email, normalized to lowercase
  nome: string;             // Required, user full name
  senha: string;            // Required, min 6 characters
  senhaConfirmacao: string; // Required, must match senha
  telefone: string;         // Required, min 9 digits
  termosAceitos: boolean;   // Required, terms acceptance
  politicaAceita: boolean;  // Required, privacy policy acceptance
  codigo: string;           // Required, 6-char verification code
  urlRedirect: string;      // Required, redirect URL
}
```

#### ForgotPasswordDto

```typescript
{
  email: string;  // Required, valid email
  codigo: string; // Required, 6-char verification code
}
```

#### ChangePasswordDto

```typescript
{
  senha: string;          // Required, min 6 characters
  confirmarSenha: string; // Required, must match senha
}
```

#### NewCodeDto

```typescript
{
  email: string;        // Required, valid email
  codigo: string;       // Required, 6-char verification code
  urlRedirect?: string; // Optional, redirect URL
}
```

### Response Entities

#### LoginResponseEntity

```typescript
{
  id: number;
  email: string;
  nome: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}
```

#### UserResponseEntity

```typescript
{
  id: number;
  email: string;
  nome: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}
```

### Session Service Interface

```typescript
interface SessionService {
  createSession(sessionId: string, userData: object, ttlSeconds?: number): Promise<void>;
  getSession(sessionId: string): Promise<object | null>;
  updateSession(sessionId: string, userData: object): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  refreshSession(sessionId: string): Promise<void>;
}
```

### Cookies Service Interface

```typescript
interface CookiesService {
  setSessionCookie(res: Response, sessionId: string): void;
  clearSessionCookie(res: Response): void;
  getSessionId(req: Request): string | undefined;
}
```

## 5. Acceptance Criteria

### Login Flow

- **AC-001**: Given valid email and password, When user submits login, Then session created in Redis and session cookie set, HTTP 200 returned
- **AC-002**: Given invalid email, When user submits login, Then HTTP 401 with "Credenciais inválidas" message
- **AC-003**: Given valid email but wrong password, When user submits login, Then HTTP 401 with "senha incorreta" detail
- **AC-004**: Given inactive user, When user submits login, Then HTTP 401 response
- **AC-005**: Given valid login with codigo param, When user submits login, Then verification email sent via EmailService
- **AC-006**: Given successful login, When user logs in, Then session created in Redis with configurable TTL

### Registration Flow

- **AC-007**: Given new user data with all valid fields, When user registers, Then user created in database with hashed password, session created, HTTP 201 returned
- **AC-008**: Given existing email, When user attempts registration, Then HTTP 400 with "Email já cadastrado" message
- **AC-009**: Given mismatched passwords, When user registers, Then HTTP 400 with "Senhas não coincidem" message
- **AC-010**: Given successful registration, When user registers, Then welcome email + verification email sent

### Protected Routes

- **AC-011**: Given request without session cookie, When accessing protected route, Then HTTP 401 "Sessão não fornecida"
- **AC-012**: Given request with invalid session cookie, When accessing protected route, Then HTTP 401 "Sessão inválida"
- **AC-013**: Given request with expired session, When accessing protected route, Then HTTP 401 "Sessão expirada"
- **AC-014**: Given request with session for inactive user, When accessing protected route, Then HTTP 401 "Usuário inativo"

### Logout Flow

- **AC-015**: Given authenticated user, When user logs out, Then Redis session deleted and cookie cleared, HTTP 200

### Password Recovery

- **AC-016**: Given existing email for active user, When forgot-password submitted, Then success message returned (code sending not implemented)
- **AC-017**: Given non-existent email, When forgot-password submitted, Then HTTP 404 with "Email não encontrado"
- **AC-018**: Given valid user ID and matching passwords, When change-password submitted, Then password updated in database, HTTP 200

### Get Current User

- **AC-019**: Given authenticated user, When GET /auth/me requested, Then user data from session returned, HTTP 200
- **AC-020**: Given unauthenticated user, When GET /auth/me requested, Then HTTP 401 "Sessão não fornecida"

## 6. Test Automation Strategy

### Test Levels

- **Unit Tests**: AuthService methods, AuthGuard validation, Session/Cookies services
- **Integration Tests**: Full authentication flow with test database
- **E2E Tests**: Complete user journeys (register → login → protected route → logout)

### Frameworks

- Jest (unit and e2e)
- Supertest for HTTP integration tests
- Testing utilities: `describe`, `it`, `expect`, `beforeEach`

### Test Data Management

- Factory pattern for user creation
- Mock Redis client for session tests
- Mock EmailService for verification code tests
- Clean up test users after each test

### Coverage Requirements

- Minimum 80% code coverage for auth module
- All authentication flows must have test coverage
- All error paths must have test coverage

### CI/CD Integration

- Unit tests run on every PR
- E2E tests run on merge to main
- Linting and type checking required before merge

## 7. Rationale & Context

### Server-Side Session Architecture

The authentication system uses server-side sessions stored in Redis with HTTP-only cookies for client-side session identification. This design was chosen to:

1. **Security**: HTTP-only cookies prevent XSS attacks from stealing session IDs
2. **Simplicity**: No need for JWT signing, verification, or refresh token logic
3. **Performance**: Redis session cache eliminates database query on every protected request
4. **Revocation**: Sessions can be instantly revoked by deleting from Redis
5. **CSRF Protection**: `sameSite: strict` prevents cross-site request forgery

### Session Management

- Session data stored in Redis with configurable TTL (default 7 days)
- Session ID generated on login/register and stored in HTTP-only cookie
- Session automatically expires based on Redis TTL
- Session can be refreshed on user activity (sliding window)

### 2FA via Email

The system supports 2FA through email verification codes. While not fully implemented in the login flow, the infrastructure exists:

- `NewCodeDto` endpoint for resending codes
- `EmailService.sendVerificationCodeEmail()` integration
- Optional `codigo` field in login for verification

### Sentry Integration

The auth module should integrate with Sentry for:

1. **Error Monitoring**: Capture authentication failures and exceptions
2. **Tracing**: Auto-instrumented spans for auth flow performance
3. **Custom Spans**: Track login, logout operations
4. **User Context**: Attach user ID to errors (respecting PII settings)

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001**: Redis - Session storage, requires Redis server running
- **EXT-002**: MySQL Database - User storage via Prisma ORM
- **EXT-003**: AWS SES - Transactional email sending (verification codes, welcome)

### Third-Party Services

- **SVC-001**: bcrypt - Password hashing
- **SVC-002**: ioredis - Redis client for NestJS
- **SVC-003**: uuid - Session ID generation

### Infrastructure Dependencies

- **INF-001**: Redis server on configurable host/port
- **INF-002**: MySQL database with Prisma migration applied
- **INF-003**: Environment variables: REDIS_HOST, REDIS_PORT, SESSION_TTL

### Technology Platform Dependencies

- **PLT-001**: Node.js >= 18
- **PLT-002**: NestJS 8-10
- **PLT-003**: TypeScript >= 4.5

### Compliance Dependencies

- **COM-001**: GDPR - User data handling, consent (termosAceitos, politicaAceita fields)
- **COM-002**: Password storage - bcrypt with salt rounds meeting minimum security standard

## 9. Examples & Edge Cases

### Login Request Example

```bash
curl -X POST http://localhost:7077/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "senha": "123456",
    "urlRedirect": "https://app.iselftoken.com"
  }'
```

### Response Success Example

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
    "createdAt": "2026-03-25T10:00:00.000Z"
  }
}
```

### Response with Cookie

```bash
Set-Cookie: session_id=abc123def456; HttpOnly; SameSite=Strict; Max-Age=604800
```

### Error Response Example

```json
{
  "sucesso": false,
  "mensagem": "Credenciais inválidas, email ou senha incorreto",
  "codigo": 401,
  "detalhe": {
    "message": "senha incorreta"
  }
}
```

### Edge Cases

1. **Empty password field**: Validation rejects with "senha deve ser uma string"
2. **Email not normalized**: "<USER@Example.com>" becomes "<user@example.com>"
3. **Phone with non-digits**: "+55 11 99999-9999" becomes "551199999999"
4. **Redis unavailable**: Guard throws error, request fails with 500
5. **Expired session**: Redis automatically deletes session after TTL, returns 401

## 10. Validation Criteria

| ID     | Criterion                                 | Verification Method                  |
|--------|-------------------------------------------|--------------------------------------|
| VC-001 | Module marked as @Global                  | Check auth.module.ts decorator       |
| VC-002 | AuthGuard exported from module            | Check auth.module.ts exports array   |
| VC-003 | All endpoints have Swagger decorators     | Check auth.controller.ts             |
| VC-004 | All DTOs have class-validator decorators  | Check dto/*.ts files                 |
| VC-005 | Response format uses ResponseDto wrapper  | Check service return statements      |
| VC-006 | Error messages in Portuguese              | Check throw statements               |
| VC-007 | HTTP-only cookie configuration            | Check cookies.service.ts             |
| VC-008 | Session TTL is configurable               | Check session.service.ts DEFAULT_TTL |
| VC-009 | Cookie maxAge matches session TTL         | Check cookies.service.ts MAX_AGE_MS  |
| VC-010 | bcrypt salt rounds >= 10                  | Check auth.service.ts hash calls     |
| VC-011 | No JWT dependencies                       | Check package.json and imports       |

## 11. Related Specifications / Further Reading

- [NestJS Authentication Docs](https://docs.nestjs.com/security/authentication)
- [Sentry NestJS SDK](https://docs.sentry.io/platforms/node/guides/nestjs/)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Cookie Security Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security)
