# AGENTS.md - app/hooks

## Propósito
Hooks React customizados — auth, mutations TanStack Query, validação de arquivos, queries de domínio. Substitui AuthContext (eliminado na Fase 3C).

## Dependências
- Internas: `app/lib/api-config`, `app/lib/queries`, `app/types/*`
- Externas: `@tanstack/react-query`, `react`, `react-hook-form`, `zod`

## Mapa de Arquivos

### Auth / sessão (Fase 3A + 3C)
[use-user.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-user.ts) (composto `{user, isAuthenticated, isAuthorized, isLoading}`), [use-auth-status.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-auth-status.ts), [use-login-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-login-mutation.ts), [use-register-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-register-mutation.ts), [use-logout-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-logout-mutation.ts), [use-user-role.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-user-role.ts), [use-plan.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-plan.ts)

### Real-time (Sprint WS-01)
[use-notifications-socket.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-notifications-socket.ts) (singleton socket.io por userId; ref-count; reconexão automática; cookie HTTP-only via withCredentials; invalida `["notifications-unread-count"]` + prepend na `["notifications","all",1]`), [use-mark-as-read-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-mark-as-read-mutation.ts) (POST `/api/notifications/:id/mark-as-read`), [use-mark-all-as-read-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-mark-all-as-read-mutation.ts) (POST `/api/notifications/mark-all-as-read`)

### Admin / mutations
[use-admin-dashboard-summary.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-admin-dashboard-summary.ts) (query do dashboard executivo),
[use-update-user-status-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-update-user-status-mutation.ts) (PUT /api/admin/users/:id/status; invalida `["admin-users"]`),
[use-admin-startups.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-admin-startups.ts), [use-admin-kyc.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-admin-kyc.ts), [use-admin-users.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-admin-users.ts) (query paginada com filtros search/status/createdFrom/role)

### Upload / documentos
[use-upload.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-upload.ts) (compartilhado kyc-header/uploads), [use-file-validation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-file-validation.ts), [use-file-validation.test.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-file-validation.test.ts)

### Founder / Startup
[use-delete-startup-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-delete-startup-mutation.ts), [use-cancel-round-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-cancel-round-mutation.ts), [use-pause-round-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-pause-round-mutation.ts), [use-dashboard-overview.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-dashboard-overview.ts) (M5-S12, staleTime 60s), [use-dashboard-overview.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-dashboard-overview.spec.ts)

### Termo de adesão (S18)
[use-termo-adesao-status.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-termo-adesao-status.ts) (GET status), [use-termo-adesao-mutation.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-termo-adesao-mutation.ts) (PATCH assinar, c/ QR), [use-documento-verificacao.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-documento-verificacao.ts) (GET público, cache 5min)

### Compliance (Sprint Compliance-QuickWins)
[use-audit-logs.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-audit-logs.ts) (GET timeline genérica por `entity`+`entityId`, staleTime 60s), [use-startup-documents.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-startup-documents.ts) (GET StartupDocument + checklist CVM), [use-document-requests.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-document-requests.ts) (TanStack: listar/criar/cancelar — AC-07)

### Financeiro (Sprint Plans-CRUD)
[use-plans-admin.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-plans-admin.ts) (TanStack: useAdminPlansQuery + useAdminPlanStatsQuery + useCreatePlanMutation + useUpdatePlanMutation + useDeletePlanMutation)

### Email Templates (FIN-05)
[use-email-templates.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-email-templates.ts) (query lista), [use-email-template.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-email-template.ts) (query detalhe), [use-create-email-template-version.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-create-email-template-version.ts) (mutation criar), [use-update-email-template-version.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-update-email-template-version.ts) (mutation editar), [use-publish-email-template-version.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-publish-email-template-version.ts) (mutation publicar), [use-preview-email-template-version.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/hooks/use-preview-email-template-version.ts) (mutation preview)

### REMOVIDOS NA SPRINT 1 (dead code, 0 imports)
Os hooks abaixo foram deletados após auditoria que confirmou 0 imports. Se reaparecerem em alguma página, restaurá-los ou substituí-los pelo hook equivalente já listado acima:
- `use-affiliate-triagem.ts` — substituído por mutation inline no componente
- `use-approve-kyc-mutation.ts` + `.test.tsx` — substituído por mutation inline em `compliance-user-detail-kyc.tsx` chamando `/api/compliance/kyc/:id/decide`
- `use-approve-startup-mutation.ts` — substituído por mutation inline em `compliance-user-detail-startups.tsx`
- `use-coupon-error-toast.ts` — catálogo movido para `~/lib/api/coupons`
- `use-create-change-request-mutation.ts` — não implementado
- `use-create-startup-mutation.ts` — substituído por mutation inline em `founder-dashboard.tsx`
- `use-efi-error-toast.ts` — não implementado
- `use-email-templates.ts` — substituído pelos hooks `use-email-template*` listados acima
- `use-fund-transfer-status.ts` — substituído por `use-repasse-status` direto via loader SSR
- `use-initiate-fund-transfer.ts` — não implementado
- `use-refresh-upload-url.ts` — backend não tem endpoint; reativar quando implementar
- `use-reject-kyc-mutation.ts` — substituído por mutation inline em `compliance-user-detail-kyc.tsx`
- `use-reject-startup-mutation.ts` — substituído por mutation inline em `compliance-user-detail-startups.tsx`
- `use-update-user-role-mutation.ts` — não implementado