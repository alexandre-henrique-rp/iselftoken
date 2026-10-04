# Seals

**Propósito:** Selos de verificação/confiança (trust seals) atribuídos a startups. Endpoints públicos (catálogo e selos por startup) e admin (CRUD com upload de imagem).

**Dependências:**
- `../../auth` (AuthGuard e AdminGuard para rotas administrativas)
- `src/prisma` (PrismaModule para persistência)
- `@nestjs/platform-express` (FileInterceptor para upload de imagem do selo)

**Mapa de Arquivos:**
- [seals.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/seals/seals.module.ts) - modulo NestJS, importa Prisma e Auth
- [seals.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/seals/seals.controller.ts) - rotas publicas GET /seals e /seals/startup/:id (com cache)
- [admin-seals.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/seals/admin-seals.controller.ts) - CRUD admin em /admin/seals (POST, GET, PATCH, DELETE com upload)
- [seals.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/seals/seals.service.ts) - logica de catalogo, atribuicao e gestao
- [dto/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/seals/dto) - DTOs (CreateSealDto, UpdateSealDto, AssignSealDto, SealCatalogItemDto, StartupSealDto)

**Compliance panel (Sprint Compliance-QuickWins):**
- `GET /admin/seals` — lista TODOS os selos (ativos + inativos) com contagem de atribuições por selo. Diferente do `/seals` público que filtra só ativos. Usado pelo painel `/compliance/seals`.