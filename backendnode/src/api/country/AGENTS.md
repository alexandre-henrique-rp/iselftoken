# Country

**Propósito:** Disponibiliza dados geográficos hierárquicos (país → estado → cidade) via `GET /country`. Sem parâmetros retorna países; com `country` retorna estados; com `country` + `states` retorna cidades. Endpoint atualmente aberto (AuthGuard comentado).

**Dependências:**
- `[../../prisma]` — acesso às tabelas de países, estados e cidades
- `[../../common]` — `ResponseDto` e entidades de resposta padronizadas

**Mapa de Arquivos:**
- [country.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/country/country.controller.ts) — rota `GET /country` com query params
- [country.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/country/country.service.ts) — consultas Prisma e montagem da hierarquia
- [country.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/country/country.module.ts) — registro do controller e service
- [country.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/country/country.controller.spec.ts) — testes do controller
- [country.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/country/country.service.spec.ts) — testes do service
- [dto/create-country.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/country/dto/create-country.dto.ts) — DTO de criação
- [dto/update-country.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/country/dto/update-country.dto.ts) — DTO de atualização
- [entities/country.entity.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/country/entities/country.entity.ts) — entidades `CountryEntity`, `StateEntity` e `CityEntity`