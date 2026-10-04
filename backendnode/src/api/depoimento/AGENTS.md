# Depoimento

**Propósito:** Gerencia depoimentos públicos exibidos pela plataforma, com consulta pública e operações autenticadas de criação, atualização e desativação lógica.

**Dependências:**
- `../../auth` (proteção das operações de escrita com `AuthGuard`)
- `../../common` (payload autenticado e padronização de respostas)
- `../../prisma` (acesso ao banco e persistência dos depoimentos)

**Mapa de Arquivos:**
- [depoimento.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/depoimento.module.ts) - Registra controller, service e integração com Prisma.
- [depoimento.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/depoimento.controller.ts) - Expõe rotas públicas de consulta e rotas autenticadas de manutenção.
- [depoimento.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/depoimento.service.ts) - Implementa CRUD, limite de listagem e soft delete.
- [depoimento.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/depoimento.controller.spec.ts) - Testes unitários do controller.
- [depoimento.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/depoimento.service.spec.ts) - Testes unitários do service.
- [dto/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/dto) - DTOs de criação e atualização com validação e Swagger.
- [dto/create-depoimento.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/dto/create-depoimento.dto.ts) - Define os dados aceitos para criar um depoimento.
- [dto/update-depoimento.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/dto/update-depoimento.dto.ts) - Torna opcionais os campos usados na atualização.
- [entities/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/entities) - Tipos de entidade do domínio.
- [entities/depoimento.entity.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/depoimento/entities/depoimento.entity.ts) - Representa a entidade de depoimento.
