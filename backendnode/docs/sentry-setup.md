# Documentação Técnica - Sentry Setup

## Visão Geral

O Sentry foi integrado ao backend NestJS para monitoramento de erros, tracing de performance e logs estruturados. Esta documentação explica a configuração e como usar.

## Arquitetura do Sentry

```bash
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Sentry Integration                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │ instrument.ts   │    │ SentryModule    │    │ SentryGlobalFilter      │  │
│  │ (Sentry.init)   │───▶│ (auto-tracing)  │───▶│ (exception capture)     │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Arquivos Criados/Modificados

### 1. `src/instrument.ts` - Inicialização do Sentry

```typescript
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '1.0'),
  enableLogs: true,
  debug: process.env.NODE_ENV === 'development',
  sendDefaultPii: false,
});
```

### 2. `src/main.ts` - Importação como primeiro módulo

```typescript
import './instrument'; // ← DEVE ser o primeiro import
// ... outros imports
```

**Crítico**: `instrument.ts` deve ser importado ANTES de qualquer outro módulo para garantir que o OpenTelemetry patch modules antes de carregá-los.

### 3. `src/app.module.ts` - Registro do Sentry

```typescript
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';

@Module({
  imports: [
    SentryModule.forRoot(), // Auto-tracing para HTTP requests
    // ... outros módulos
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter, // Captura exceções automaticamente
    },
    // ... outros providers
  ],
})
```

## Variáveis de Ambiente

| Variável                  | Descrição                              | Obrigatório | Padrão           |
|---------------------------|----------------------------------------|-------------|------------------|
| SENTRY_DSN                | URL do projeto Sentry                  | Sim         | -                |
| SENTRY_ENVIRONMENT        | Ambiente (dev/staging/prod)            | Não         | 'development'    |
| SENTRY_RELEASE            | Release version                        | Não         | -                |
| SENTRY_TRACES_SAMPLE_RATE | Taxa de amostragem de traces (0.0-1.0) | Não         | '1.0'            |

## Endpoints de Debug

Para testar a integração do Sentry:

```bash
# Testar captura de erro
curl http://localhost:3000/debug-sentry

# Testar span de tracing
curl http://localhost:3000/debug-sentry-span
```

## Como Usar no Código

### Capturar Exceção Manualmente

```typescript
import * as Sentry from '@sentry/nestjs';

try {
  // código que pode falhar
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

### Criar Span Personalizado

```typescript
import * as Sentry from '@sentry/nestjs';

const result = Sentry.startSpan(
  { op: 'auth.login', name: 'Login Flow' },
  () => {
    // código a ser rastreado
    return data;
  }
);
```

### Adicionar Contexto ao Usuário

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.nome,
});
```

### Configurar Tags e Dados

```typescript
Sentry.setTag('feature', 'authentication');
Sentry.setContext('request', {
  method: 'POST',
  url: '/auth',
});
```

## Integração com o Módulo Auth

O módulo de autenticação deve integrar Sentry para rastrear:

### Login

```typescript
async login(data: LoginAuthDto) {
  return Sentry.startSpan({ op: 'auth.login', name: 'Login' }, async () => {
    // ... lógica de login
    Sentry.setTag('login.success', true);
    return response;
  });
}
```

### Refresh Token

```typescript
async refresh(data: RefreshTokenDto) {
  return Sentry.startSpan({ op: 'auth.refresh', name: 'Token Refresh' }, async () => {
    // ... lógica de refresh
  });
}
```

### Registro

```typescript
async create(data: CreateAuthDto) {
  return Sentry.startSpan({ op: 'auth.register', name: 'User Registration' }, async () => {
    // ... lógica de registro
  });
}
```

## Configurações Avançadas

### Error Monitoring

O `SentryGlobalFilter` captura automaticamente:

- Exceptions HTTP
- Exceptions GraphQL
- Exceptions RPC

### Tracing

O `SentryModule.forRoot()` registra automaticamente spans para:

- HTTP requests/responses
- Database queries (com PrismaIntegration)
- External API calls

### Logging

Com `enableLogs: true`, logs estruturados são enviados para o Sentry Logs.

## Troubleshooting

### Erro: "Sentry not initialized"

**Causa**: `instrument.ts` não é o primeiro import.

**Solução**: Garantir que `import './instrument'` seja a primeira linha em `main.ts`.

### Eventos não aparecem

1. Verificar SENTRY_DSN está configurado
2. Verificar que `instrument.ts` é importado primeiro
3. Setar `debug: true` em `Sentry.init()` para logs verbose
4. Verificar conectividade com Sentry

### Traces não aparecem

1. Verificar `tracesSampleRate` está definido (> 0)
2. Verificar se `SentryModule.forRoot()` está registrado

## Referências

- [Sentry NestJS Docs](https://docs.sentry.io/platforms/node/guides/nestjs/)
- [Sentry JavaScript SDK](https://github.com/getsentry/sentry-javascript)
- [OpenTelemetry](https://opentelemetry.io/)
