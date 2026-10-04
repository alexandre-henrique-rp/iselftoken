# SystemConfig

**Propósito:** Fonte única de configurações dinâmicas (taxas, limites, percentuais). Backend é source-of-truth dos cálculos financeiros de `campaigns` (ADR-008). Substitui valores hardcoded nos DTOs/services por leitura cacheada do banco.

**Dependências:**

- `[../prisma]` (acesso à tabela `system_configs`)
- `[../auth/session/redis.module]` (Redis — já configurado via `AuthModule` `@Global`; reutiliza `@InjectRedis()`)
- `[../auth/auth.guard, ../auth/admin.guard]` (proteção admin dos endpoints)
- `[../common/dto/response.dto]` (wrapper padrão de resposta)

**Mapa de Arquivos:**

- [system-config.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/system-config.module.ts) — Módulo NestJS (registra controller + service).
- [system-config.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/system-config.service.ts) — Core: `getFinancialConfigs()`, `get<K>(key)`, `setConfig()`, `invalidateCache()`. Cache hit/miss via Redis (TTL 1h).
- [system-config.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/system-config.service.spec.ts) — 9 testes (cache hit/miss/invalidação/tipagem).
- [system-config.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/system-config.controller.ts) — `GET /admin/configs`, `GET|PATCH /admin/configs/:key`. Guard: `AuthGuard + AdminGuard`.
- [system-config.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/system-config.controller.spec.ts) — 6 testes (controllers + guards mockados).
- [interfaces/financial-configs.interface.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/interfaces/financial-configs.interface.ts) — Tipo `FinancialConfigs` + `FINANCIAL_CONFIG_KEYS`.
- [dto/update-config.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/dto/update-config.dto.ts) — `{ value: number >= 0 }`.
- [dto/config-response.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/dto/config-response.dto.ts) — Shape de resposta com Swagger.

**Cache Backend:** Redis (via `@nestjs-modules/ioredis`). Escolha: já configurado pelo `AuthModule` (`@Global`) — evita adicionar nova infra. Mock em testes via token `'default_IORedisModuleConnectionToken'` (padrão do projeto, ver `src/api/uploads/services/presigned-url-cache.service.spec.ts`).

**Decisão chave:** `getFinancialConfigs()` cacheia o snapshot COMPLETO (não por chave) — todas as 9 configs são lidas juntas em 1 round-trip. `get<K>(key)` reusa esse snapshot para evitar N queries.
