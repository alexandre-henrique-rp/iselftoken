# Opiniões sobre Startups

**Propósito:** Gerencia opiniões e avaliações vinculadas a startups, incluindo consultas públicas gerais ou por startup e manutenção autenticada com desativação lógica.

**Dependências:**
- `../../auth` (proteção das operações de escrita com `AuthGuard`)
- `../../common` (payload autenticado e padronização de respostas)
- `../../prisma` (acesso ao banco, startups e opiniões persistidas)

**Mapa de Arquivos:**
- [startup-opinion.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/startup-opinion.module.ts) - Registra controller, service e integração com Prisma.
- [startup-opinion.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/startup-opinion.controller.ts) - Expõe consultas públicas e rotas autenticadas de manutenção.
- [startup-opinion.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/startup-opinion.service.ts) - Valida startups e implementa CRUD, listagens e soft delete.
- [startup-opinion.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/startup-opinion.controller.spec.ts) - Testes unitários do controller.
- [startup-opinion.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/startup-opinion.service.spec.ts) - Testes unitários do service.
- [dto/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/dto) - DTOs de criação e atualização com validação e Swagger.
- [dto/create-startup-opinion.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/dto/create-startup-opinion.dto.ts) - Define os dados aceitos para criar uma opinião vinculada à startup.
- [dto/update-startup-opinion.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/dto/update-startup-opinion.dto.ts) - Torna opcionais os campos usados na atualização.
- [entities/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/entities) - Tipos de entidade do domínio.
- [entities/startup-opinion.entity.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/startup-opinion/entities/startup-opinion.entity.ts) - Representa a entidade de opinião sobre startup.
