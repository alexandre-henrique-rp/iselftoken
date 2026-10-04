# Documentação Técnica - Sentry Integration no Módulo Auth

## Visão Geral

O Sentry foi integrado ao módulo de autenticação para monitorar operações críticas de login, registro, refresh token e logout. Esta documentação explica a implementação e como usar.

## Arquitetura da Integração

```bash
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Sentry Auth Integration                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      AuthController                                 │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │    │
│  │  │ login()       │  │ create()      │  │ logout()                │  │    │
│  │  │ Sentry span   │  │ Sentry span   │  │ Sentry span             │  │    │
│  │  │ auth.login    │  │ auth.register │  │ auth.logout             │  │    │
│  │  └───────────────┘  └───────────────┘  └─────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      AuthService                                    │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │    │
│  │  │ login()       │  │ create()      │  │ refresh()               │  │    │
│  │  │ Sentry span   │  │ Sentry span   │  │ Sentry span             │  │    │
│  │  │ auth.login    │  │ auth.register │  │ auth.refresh            │  │    │
│  │  └───────────────┘  └───────────────┘  └─────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Spans Implementados

### 1. auth.login (Login Flow)

**Localização**: `AuthService.login()`

```typescript
async login(data: LoginAuthDto) {
  return Sentry.startSpan({ op: 'auth.login', name: 'Login' }, async () => {
    // ... lógica de login
  });
}
```

**Tags de monitoramento**:

- `auth.login.success`: `true` | `false`
- `auth.login.failure`: `invalid_password` | `user_inactive` | `unknown_error`

**Contexto do usuário**: Define `Sentry.setUser()` após login bem-sucedido

---

### 2. auth.register (Registration Flow)

**Localização**: `AuthService.create()`

```typescript
async create(data: CreateAuthDto) {
  return Sentry.startSpan({ op: 'auth.register', name: 'User Registration' }, async () => {
    // ... lógica de registro
  });
}
```

**Tags de monitoramento**:

- `auth.register.success`: `true` | `false`
- `auth.register.failure`: `email_exists` | `passwords_mismatch` | `creation_error`

**Contexto do usuário**: Define `Sentry.setUser()` após registro bem-sucedido

---

### 3. auth.refresh (Token Refresh)

**Localização**: `AuthService.refresh()`

```typescript
async refresh(data: RefreshTokenDto) {
  return Sentry.startSpan({ op: 'auth.refresh', name: 'Token Refresh' }, async () => {
    // ... lógica de refresh
  });
}
```

**Tags de monitoramento**:

- `auth.refresh.success`: `true`
- `auth.refresh.failure`: `user_not_found` | `user_inactive` | `token_expired` | `token_invalid` | `unknown_error`

---

### 4. auth.logout (Logout Flow)

**Localização**: `AuthController.logout()`

```typescript
async logout(@Request() req: Request & { user: { id: string } }, @Res() res: Response) {
  return Sentry.startSpan({ op: 'auth.logout', name: 'Logout' }, async () => {
    // ... lógica de logout
  });
}
```

**Tags de monitoramento**:

- `auth.logout.success`: `true`

---

## Tags de Monitoramento

| Tag                     | Valores                                                                | Descrição             |
|-------------------------|------------------------------------------------------------------------|-----------------------|
| `auth.login.success`    | `true` / `false`                                                       | Resultado do login    |
| `auth.login.failure`    | `invalid_password` / `user_inactive`                                   | Motivo da falha       |
| `auth.register.success` | `true` / `false`                                                       | Resultado do registro |
| `auth.register.failure` | `email_exists` / `passwords_mismatch` / `creation_error`               | Motivo da falha       |
| `auth.refresh.success`  | `true`                                                                 | Resultado do refresh  |
| `auth.refresh.failure`  | `user_not_found` / `user_inactive` / `token_expired` / `token_invalid` | Motivo da falha       |
| `auth.logout.success`   | `true`                                                                 | Resultado do logout   |

---

## Exemplo de Dashboards no Sentry

### Login Metrics

```sql
-- Contagem de logins bem-sucedidos vs falhas
SELECT 
  countIf(tags['auth.login.success'] = 'true') as logins_ok,
  countIf(tags['auth.login.success'] = 'false') as logins_fail
FROM spans
WHERE op = 'auth.login'
```

### Registration Metrics

```sql
-- Contagem de registros bem-sucedidos vs falhas
SELECT 
  countIf(tags['auth.register.success'] = 'true') as registers_ok,
  countIf(tags['auth.register.success'] = 'false') as registers_fail
FROM spans
WHERE op = 'auth.register'
```

### Failure Analysis

```sql
-- Análise de falhas por motivo
SELECT 
  tags['auth.login.failure'] as failure_reason,
  count(*) as count
FROM spans
WHERE op = 'auth.login' AND tags['auth.login.success'] = 'false'
GROUP BY failure_reason
```

---

## Como Usar no Código

### Adicionar span em nova operação

```typescript
import * as Sentry from '@sentry/nestjs';

async myOperation() {
  return Sentry.startSpan(
    { op: 'auth.my-operation', name: 'My Operation' },
    async () => {
      // ... lógica
      Sentry.setTag('auth.my-operation.success', true);
      return result;
    }
  );
}
```

### Adicionar contexto ao erro

```typescript
try {
  // operação
} catch (error) {
  Sentry.setTag('auth.operation.failure', 'specific_reason');
  Sentry.captureException(error);
  throw error;
}
```

### Adicionar breadcrumb para debug

```typescript
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User attempted login',
  level: 'info',
  data: { email: user.email },
});
```

---

## Integração com AuthGuard

O AuthGuard não possui spans Sentry diretos, mas pode ser instrumentado se necessário:

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  return Sentry.startSpan({ op: 'auth.guard', name: 'AuthGuard' }, async () => {
    // ... lógica do guard
  });
}
```

---

## Variáveis de Ambiente Relacionadas

| Variável                  | Descrição             | Impacto            |
|---------------------------|-----------------------|--------------------|
| SENTRY_DSN                | URL do projeto Sentry | Obrigatório        |
| SENTRY_ENVIRONMENT        | Ambiente              | Filtra eventos     |
| SENTRY_TRACES_SAMPLE_RATE | Taxa de amostragem    | Controle de volume |

---

## Troubleshooting

### Spans não aparecem

1. Verificar `SENTRY_DSN` está configurado
2. Verificar `tracesSampleRate` > 0
3. Verificar `instrument.ts` é importado primeiro

### Tags não aparecem

1. Verificar que `Sentry.setTag()` é chamado
2. Verificar que o span é fechado corretamente

### Erro de compilação

1. Verificar importação de `@sentry/nestjs`
2. Verificar que `instrument.ts` existe

---

## Referências

- [Sentry NestJS Docs](https://docs.sentry.io/platforms/node/guides/nestjs/)
- [Sentry Spans](https://docs.sentry.io/platforms/node/tracing/)
- [Sentry Tags](https://docs.sentry.io/platforms/node/enriching-events/tags/)
