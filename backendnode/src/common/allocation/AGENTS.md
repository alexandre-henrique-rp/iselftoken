# common/allocation

**Propósito:** AllocationConverterService — converte allocationPercents (JSON) em allocationValues (R$) com precisao Decimal (FIN-10).

**Dependências:**
- `@prisma/client` (Prisma.Decimal)

**Mapa de Arquivos:**
- [allocation-converter.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/allocation/allocation-converter.service.ts) — validatePercentsSum + percentsToValues (reservaCaixa absorve residual)
- [allocation-converter.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/allocation/allocation-converter.service.spec.ts) — 9 testes
