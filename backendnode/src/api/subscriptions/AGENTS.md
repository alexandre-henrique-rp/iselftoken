# Subscriptions

**Propósito:** Gestão do ciclo de vida de assinaturas de planos dos usuários (criar, listar, atualizar, cancelar e validar acesso premium).

**Dependências:**
- `[src/auth/auth.module.ts]` (AuthGuard protege rotas via cookie session_id)
- `[src/prisma/prisma.service.ts]` (acesso ao banco via Prisma)
- `[src/common/dto/response.dto.ts]` (wrapper padrão de resposta)
- `[src/common/audit/audit.service.ts]` (log de cancelamentos)
- `[src/common/decorators/skip-session-filter.decorator.ts]` (pula cache Redis)
- `@nestjs/event-emitter` (EventEmitter2 — backbone do desacoplamento com payment module)

**Event-driven listeners (Fase v3):**

| Evento | Listener | Efeito |
|---|---|---|
| `payment.confirmed` | `handlePaymentConfirmed()` | Ativa subscription (PENDING→ACTIVE, startedAt, expiresAt). Idempotente (no-op se ACTIVE). |
| `payment.cancelled` | `handlePaymentCancelled()` | Cancela subscription (qualquer status→CANCELED). Idempotente (no-op se já CANCELED). |

**Mapa de Arquivos:**
- [subscriptions.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/subscriptions/subscriptions.module.ts) - módulo NestJS (exporta service)
- [subscriptions.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/subscriptions/subscriptions.controller.ts) - CRUD + POST /:id/cancel (auto-cancelamento)
- [subscriptions.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/subscriptions/subscriptions.service.ts) - regras de negocio, validateUserPlan, cancelOwn, cancelByAdmin
- [subscriptions.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/subscriptions/subscriptions.controller.spec.ts) - testes do controller
- [subscriptions.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/subscriptions/subscriptions.service.spec.ts) - testes do service
- [dto/create-subscription.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/subscriptions/dto/create-subscription.dto.ts) - payload de criação
- [dto/update-subscription.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/subscriptions/dto/update-subscription.dto.ts) - payload de atualização
- [entities/subscription.entity.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/subscriptions/entities/subscription.entity.ts) - entidade de resposta