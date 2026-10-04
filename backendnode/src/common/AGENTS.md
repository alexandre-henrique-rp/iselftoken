# common

**Propósito:** Utilitarios compartilhados em toda a aplicacao: decorators, filtros globais, interceptors, guardas, DTOs/entities padrao, validators, auditoria, PKI/CA interna e healthcheck.

**Dependências:**
- `[../prisma]` (acesso ao banco para audit e PKI)
- `[../auth]` (cookies/sessao usadas pelos interceptors)
- `[../email]` (notificacoes usadas por alguns helpers)

**Mapa de Arquivos:**
- [health.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/health.controller.ts) - endpoint /health simples
- [audit/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/audit) - modulo e service de trilha de auditoria
- [decorators/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/decorators) - finance-access e skip-session-filter
- [dto/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/dto) - ResponseDto e error.entity
- [entities/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/entities) - payload.entity e response.entity
- [filters/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/filters) - global-exception.filter
- [guards/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/guards) - finance-role.guard
- [interceptors/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/interceptors) - logging e response interceptors
- [pki/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/pki) - CA interna, certificate service, cron e key-storage
- [validators/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/validators) - cnpj.validator
