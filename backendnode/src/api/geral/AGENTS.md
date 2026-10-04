# Geral

**Propósito:** Endpoints genéricos de lookup via BrasilAPI. Disponibiliza a lista de bancos brasileiros (cache 7 dias) e consulta de CNPJ na Receita Federal (cache 24h), com throttle global de 1 req/s para respeitar o limite do provedor gratuito.

**Dependências:**
- `[src/prisma]` — não utilizada diretamente; módulo puramente utilitário
- `[src/common]` — DTOs de erro compartilhados
- `[@nestjs-modules/ioredis]` — cache Redis e contador atômico via Lua para throttle
- `[brasilapi.com.br]` — provedor externo de bancos e dados de CNPJ

**Mapa de Arquivos:**
- [geral.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/geral/geral.controller.ts) — rotas `GET /geral/bancos` e `GET /geral/cnpj/:cnpj`
- [geral.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/geral/geral.service.ts) — integração BrasilAPI, cache Redis, throttle de saída
- [geral.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/geral/geral.module.ts) — wiring do RedisModule e ConfigModule
- [geral.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/geral/geral.service.spec.ts) — testes do service
- [dto/banco-response.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/geral/dto/banco-response.dto.ts) — resposta da listagem de bancos
- [dto/cnpj-lookup-response.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/geral/dto/cnpj-lookup-response.dto.ts) — resposta da consulta de CNPJ