# Auth Session

**Propósito:** Camada fina sobre Redis que mantém a sessão HTTP do usuário (cookie `session_id`) e caches auxiliares (`user:{id}` legacy, `verification_code:{id}`).

**Dependências:**
- `[../cookies]` (CookiesService)
- `[../auth.service]` (AuthService cria sessões em login/register/createDevAdmin)
- `[../../prisma]` (redis client via @nestjs-modules/ioredis)

**Arquivos:**
- [session.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/auth/session/session.service.ts) - CRUD + 2FA code lifecycle
- [session.filters.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/auth/session/session.filters.ts) - redirects após AuthGuard
- [redis.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/auth/session/redis.module.ts) - módulo IoRedis injetável
- [public-payload.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/auth/session/public-payload.ts) - projeção enxuta que vai pra Redis (`pickPublicSessionPayload`) e pro `/users/me` (`pickPublicMePayload`)

**Contrato Redis:**
- `session:{sessionId}` → payload público do usuário (TTL 7d)
- `verification_code:{sessionId}` → código 2FA de 6 dígitos (TTL 5min)
- `user:{userId}` → legacy cache (apagar no `/users/me`, ver UsersService.getMe)
