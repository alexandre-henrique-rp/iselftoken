# installment-requests

**Propósito:** Endpoints do Fundador para criar/re-submeter InstallmentRequest (FIN-10) e consultar dashboard consolidado do Repasse.

**Dependências:**
- `[src/prisma]` (acesso ao DB)
- `[src/auth]` (AuthGuard via cookie session)
- `[src/common/sla]` (SlaCalculatorService — 5 dias uteis)
- `[src/common/allocation]` (AllocationConverterService — soma 100%)
- `[src/api/repasses]` (RepassesModule — FK Installment → Repasse)
- `[src/api/transparency]` (TransparencyAutoPostService — listener de eventos)

**Mapa de Arquivos:**
- [installment-requests.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/installment-requests/installment-requests.module.ts) — modulo NestJS
- [installment-requests.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/installment-requests/installment-requests.controller.ts) — POST /api/founder/startups/:id/repasse/installments/:installmentId/request|resubmit, GET /api/founder/startups/:id/repasse/dashboard
- [installment-requests.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/installment-requests/installment-requests.service.ts) — createOrResubmit + getDashboard
- [dto/create-installment-request.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/installment-requests/dto/create-installment-request.dto.ts) — allocationPercents (7 campos) + observacao
- [dto/resubmit-installment-request.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/installment-requests/dto/resubmit-installment-request.dto.ts) — mesmo body do create
- [installment-requests.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/installment-requests/installment-requests.service.spec.ts) — 13 testes
