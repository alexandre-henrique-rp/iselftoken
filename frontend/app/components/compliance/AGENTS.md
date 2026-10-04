# AGENTS.md - app/components/compliance

## Propósito
Componentes da área de Compliance Officer — detalhe do usuário (header, action bar, nav lateral), modais de Repasse (FIN-09..FIN-11), gestão de selos (Sprint Compliance-QuickWins) e stepper de onboarding de startup.

## Dependências
- Internas: `app/types/auth`, `app/hooks/use-user`, `~/hooks/use-compliance-deliberate`, `~/types/repasse`, `~/lib/seal-types`
- Externas: `react-router`, `react-hook-form`, `zod`, `sonner`, `radix-ui`, `lucide-react`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [compliance-user-detail-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/compliance-user-detail-header.tsx) | Cabeçalho da página de detalhe do usuário |
| [compliance-user-detail-nav.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/compliance-user-detail-nav.tsx) | Navegação por abas (Identidade/Endereço/KYC/etc) |
| [compliance-user-detail-action-bar.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/compliance-user-detail-action-bar.tsx) | Barra de ações (aprovar/rejeitar/suspender) |
| [review-change-request-modal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/review-change-request-modal.tsx) | Modal de revisão de change request (legado) |
| [repasse-deliberation-modal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/repasse-deliberation-modal.tsx) | Modal de deliberacao de numero de parcelas (FIN-11) |
| [seal-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/seal-card.tsx) | Card de selo com imagem, metadados e ações admin (ativar/desativar) — usado em `/compliance/seals` |
| [seal-assign-modal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/seal-assign-modal.tsx) | Modal de atribuição de selo a uma startup (selo + metadata opcional) |
| [user-list-table.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/user-list-table.tsx) | Tabela paginada de usuários (Avatar/Nome/Email/Role/KYC/Plano/Cadastro) — usado em `/compliance/users` |
| [user-filters.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/user-filters.tsx) | Filtros server-side (busca/role/kyc) — atualiza URL search params |
| [startup-onboarding-stepper.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/startup-onboarding-stepper.tsx) | Stepper visual do pipeline de onboarding (Reserva → Dados → Docs → Curadoria → Decisão) — exibido no topo de `/compliance/startups/:id` |
| [audit-timeline.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/audit-timeline.tsx) | Timeline vertical de AuditLogs (criado/aprovado/rejeitado) com cores por tipo de ação — exibido em `/compliance/startups/:id` |
| [startup-documents-tab.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/startup-documents-tab.tsx) | Checklist CVM (6 obrigatórios + 2 recomendados) + tabela completa de StartupDocument — exibido em `/compliance/startups/:id` |
| [document-requests-list.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/document-requests-list.tsx) | Lista de solicitações de documentos extras (AC-07) com status + ação de cancelar (PENDING) — exibido em `/compliance/startups/:id` |
| [request-document-modal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/compliance/request-document-modal.tsx) | Modal de criação de solicitação de documento (tipo + descrição + prazo opcional) — aberto pelo botão "Solicitar documento" na compliance-startup-detail |
