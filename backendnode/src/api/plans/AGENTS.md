# Plans

**Propósito:** Catálogo de planos SaaS disponíveis (CRUD + soft delete via flag isActive). Módulo @Global() - PlansService e AdminValidateService ficam acessíveis em toda a aplicação sem reimport.

**Importante:** O `preco` do plano é controlado **exclusivamente** pela tabela `plans` (editável via `/admin/plans`). Configs versionadas (`plan.<slug>.preco`) foram removidas — antes sobrescreviam o preço no GET, causando divergência entre banco e tela de Configurações.

**Dependências:**
- `[src/prisma/prisma.service.ts]` (acesso ao banco via Prisma)
- `[src/auth/auth.guard.ts]` (AuthGuard protege rotas ADMIN)
- `[src/common/dto/response.dto.ts]` (wrapper padrão de resposta)
- `[src/common/dto/error.entity.ts]` (Swagger error schema)
- `[src/common/entities/response.entity.ts]` (Swagger response schema)
- `[src/common/entities/payload.entity.ts]` (role do user autenticado)
- `[src/common/decorators/skip-session-filter.decorator.ts]` (pula cache Redis em GETs)

**Mapa de Arquivos:**
- [plans.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/plans/plans.module.ts) - módulo @Global() com PlansService + AdminValidateService
- [plans.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/plans/plans.controller.ts) - rotas CRUD (POST/GET/PATCH/DELETE)
- [services/plans.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/plans/services/plans.service.ts) - lógica de planos, paginação e soft delete
- [services/admi-validate.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/plans/services/admi-validate.service.ts) - guarda que exige role=ADMIN
- [plans.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/plans/plans.controller.spec.ts) - testes do controller
- [dto/create-plan.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/plans/dto/create-plan.dto.ts) - payload de criação
- [dto/update-plan.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/plans/dto/update-plan.dto.ts) - payload de atualização
- [entities/plan.entity.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/plans/entities/plan.entity.ts) - entidade Swagger