# Admin

**Propósito:** Endpoints administrativos (dashboard, KYC, financeiro, compliance, subscriptions, plans, payments, transactions, delete de startup). Protegidos por AuthGuard + AdminGuard.

**Dependências:**
- `[../../prisma/prisma.module]` (acesso direto a todas as tabelas)
- `[../../auth/auth.guard, ../../auth/admin.guard]` (autenticação + role admin)
- `[../users/users.module]` (UsersService para gestão de usuários)
- `[../subscriptions, ../plans, ../startup, ../payment, ../transactions]` (módulos de domínio)
- `[../seals, ../coupon]` (módulos auxiliares admin)

**Mapa de Arquivos:**
- [admin.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin.module.ts) - módulo agregador com 14 controllers
- [admin.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin.controller.ts) - CRUD de usuários (admin/users)
- [admin-dashboard.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-dashboard.controller.ts) - GET /admin/dashboard (delegates to summary service)
- [admin-dashboard-summary.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-dashboard-summary.service.ts) - agrega 8 KPIs + 3 séries + 2 filas + split financeiro (4 KPIs + série mensal emparelhada) para o dashboard executivo (TDD)
- [admin-dashboard-summary.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-dashboard-summary.service.spec.ts) - testes Jest (32 cenários RED→GREEN)
- [admin-withdrawals.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-withdrawals.controller.ts) - POST /admin/withdrawals/:id/{approve,reject}
- [admin-withdrawals.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-withdrawals.service.ts) - regras de transição Withdrawal (REQUESTED → PROCESSING/REJECTED)
- [admin-withdrawals.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-withdrawals.service.spec.ts) - testes Jest (10 cenários RED→GREEN)
- [admin-kyc.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-kyc.controller.ts) - gestão KYC de usuários e startups
- [admin-financeiro.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-financeiro.controller.ts) - conciliação financeira
- [admin-financeiro-split.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-financeiro-split.controller.ts) - auditoria do split financeiro por campanha (lista + detalhe + export CSV)
- [admin-financeiro-split.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-financeiro-split.service.ts) - agregação via `Investment.groupBy` por `campaignId` + breakdown + export CSV
- [admin-financeiro-split.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-financeiro-split.service.spec.ts) - testes Jest (16 cenários RED→GREEN)
- [dto/financeiro-split-query.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/dto/financeiro-split-query.dto.ts) - filtros de listagem (from, to, status, search, page, pageSize)
- [admin-compliance.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-compliance.controller.ts) - compliance
- [admin-compliance-delete.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-compliance-delete.controller.ts) - hard delete de startup (COMPLIANCE)
- [admin-subscriptions.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-subscriptions.controller.ts) - gestão de assinaturas
- [admin-other.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-other.controller.ts) - plans, startups, payments, transactions
- [admin.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin.service.ts) - lógica de negócio admin
- [financeiro-reconciliation.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/financeiro-reconciliation.service.ts) - reconciliação financeira
- [compliance-delete.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/compliance-delete.service.ts) - hard delete com audit log
- [dto/admin.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/dto/admin.dto.ts) - DTOs de paginação, filtros e decisões
- [dto/delete-startup.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/dto/delete-startup.dto.ts) - DTO de delete com motivo
- [admin.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin.controller.spec.ts) - testes do controller principal
- [admin-t036.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/admin/admin-t036.spec.ts) - testes da task T036
