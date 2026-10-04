# AUTH MODULE KNOWLEDGE BASE

**Generated:** 2026-03-21
**Module:** backend/src/auth

## OVERVIEW

JWT authentication with refresh tokens and 2FA via email codes.

## LOGIN — MENSAGENS DE ERRO (segurança)

| Cenário | Status | Mensagem | Código |
|---|---|---|---|
| Email NÃO existe | 401 | "Credenciais inválidas, email ou senha incorreto" | — |
| Senha incorreta | 401 | "Credenciais inválidas, email ou senha incorreto" | — |
| User existe + `isActive=false` | 401 | "Conta suspensa. Entre em contato com o suporte para reativar." | `ACCOUNT_SUSPENDED` |
| 2FA pendente | 200 + redirect | (não é erro — fluxo separado) | — |

### Proteções

1. **Constant-time check** (anti-enumeração): `validatePassword` (bcrypt) é chamado
   mesmo quando o user está inativo. Se retornasse mais rápido para user inativo,
   atacante detectaria emails existentes por timing.

2. **Rate limit por email**: ThrottlerGuard no controller — `email: 5 req / 15 min`.
   Impede enumeração de emails suspensos.

3. **Mensagem genérica para erros de credencial**: "Credenciais inválidas" para
   email não encontrado e senha incorreta — não revela se o email existe.

4. **Mensagem específica apenas para user suspenso**: quando temos certeza que
   o email existe (Prisma retornou o user), diferenciamos para UX melhor.

## STRUCTURE

```bash
auth/
├── auth.module.ts        # @Global module, exports AuthGuard + JwtModule
├── auth.controller.ts    # POST endpoints: login, register, refresh, forgot-password
├── auth.service.ts       # Business logic: bcrypt hashing, JWT signing, email 2FA
├── auth.guard.ts         # CanActivate guard, validates Bearer tokens
├── dto/                  # Request validation (6 DTOs)
│   ├── login-auth.dto.ts
│   ├── create-auth.dto.ts
│   ├── forgot-password.dto.ts
│   ├── change-password.dto.ts
│   ├── new-code.dto.ts
│   └── refresh-token.dto.ts
└── entities/             # Response shapes (3 entities)
    ├── login.entity.ts
    ├── create.entity.ts
    └── refresh.entity.ts
```

## FLOW

1. **Login**: email/password → bcrypt compare → JWT access token (35m) + refresh token (7d)
2. **2FA**: If `codigo` provided in login, sends verification email via EmailService
3. **Guard**: Extracts Bearer token → verifies JWT → loads full user with relations → injects `request.user`
4. **Refresh**: Validates refresh token → checks user active → issues new access token (keeps same refresh)

## PATTERNS

- **Guard-based auth**: `@UseGuards(AuthGuard)` on protected routes, rejects refresh tokens
- **DTO validation**: class-validator decorators on all request bodies
- **Response wrapper**: `ResponseDto.success()` / `ResponseDto.error()` with Portuguese messages
- **Password hashing**: bcrypt with salt rounds = 10
- **Email verification**: sends code via `EmailService.sendVerificationCodeEmail()` on register + login (if codigo provided)

## ANTI-PATTERNS

- `forgotPassword()` has TODO comments, code generation/storage not implemented
- `catch (error)` blocks access `error.response.detalhe` without null check (line 127, 162)
- `as any` cast on JWT `expiresIn` config (line 19, 91, 282)
- Guard loads ALL user relations (payments, subscriptions, tokens, etc.) on every request
- No rate limiting on login/refresh endpoints
