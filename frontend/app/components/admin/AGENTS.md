# AGENTS.md - app/components/admin

## Propósito
Painel administrativo global — KPIs, gráficos, tabelas de gestão (startups, usuários, KYC) e diálogos de hard-delete (S17).

## Dependências
- Internas: `app/hooks/use-*-mutation`, `app/types/auth`
- Externas: `react-router`, `sonner`, `recharts`

## Mapa de Arquivos

### Dashboard / métricas (Tile Mosaic — Wireframe 5)
[admin-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-header.tsx) (status do sistema, dots pulsantes),
[admin-dashboard-screen.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-dashboard-screen.tsx) (shell: hero + 4 secondary + 3 actions),
[admin-dashboard-skeleton.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-dashboard-skeleton.tsx) (loading state sem zeros fabricados),
[dashboard-tiles.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/dashboard-tiles.tsx) (HeroTile + SecondaryTile + ActionTile),
[sparkline.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/sparkline.tsx) (SVG inline minimalista)

### Gestão de startups (lista + hard-delete)
[admin-startup-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-startup-header.tsx), [admin-startup-filters.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-startup-filters.tsx), [admin-startup-table.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-startup-table.tsx), [hard-delete-startup-dialog.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/hard-delete-startup-dialog.tsx)

### Gestão de usuários
[admin-user-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-user-header.tsx),
[admin-user-filters.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-user-filters.tsx) (Form GET com 3 filtros: search, status, createdFrom),
[admin-user-table.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-user-table.tsx) (lista + paginação + ações: KYC, detalhe, toggle status),
[admin-user-table-skeleton.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-user-table-skeleton.tsx) (loading state sem zeros fabricados),
[admin-user-empty-state.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-user-empty-state.tsx) (ícone + CTA "Limpar filtros" quando filtro sem resultado),
[admin-users-content.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-users-content.tsx) (shell com 4 estados: loading skeleton / error alert+retry / empty CTA / data table)

### KYC review (fila + detalhe)
[admin-kyc-list-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-list-header.tsx) (editorial header "Verificação KYC"),
[admin-kyc-list-filters.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-list-filters.tsx) (Form GET responsivo: search + status; contraste WCAG),
[admin-kyc-list-skeleton.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-list-skeleton.tsx) (loading state sem zeros fabricados),
[admin-kyc-list-empty-state.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-list-empty-state.tsx) (empty CTA: "Nenhum cadastrado" ou "Nenhum encontrado" + Limpar filtros),
[admin-kyc-list-pagination.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-list-pagination.tsx) (paginação responsiva),
[admin-kyc-list.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-list.tsx) (tabela 6 colunas: status primary/warning/destructive, NÃO emerald),
[admin-kyc-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-header.tsx) (detalhe: header com protocol + status badge),
[admin-kyc-docs.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-docs.tsx) (detalhe: documentos),
[admin-kyc-data-summary.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-data-summary.tsx) (detalhe: resumo do perfil),
[admin-kyc-biofacial.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-biofacial.tsx) (detalhe: verificação facial),
[admin-kyc-residence.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-residence.tsx) (detalhe: comprovante de residência),
[admin-kyc-decision-panel.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/admin-kyc-decision-panel.tsx) (detalhe: aprovar/rejeitar/reenvio)

### Email Templates (FIN-05)
[email-templates-list.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/email-templates/email-templates-list.tsx) (tabela c/ 11 templates + badge status), [email-template-editor.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/email-templates/email-template-editor.tsx) (TipTap WYSIWYG + 3 abas + painel variáveis + LGPD warning), [email-template-preview-modal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/email-templates/email-template-preview-modal.tsx) (modal preview), [email-template-version-history.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/email-templates/email-template-version-history.tsx) (histórico versões), [email-template-variables-panel.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/admin/email-templates/email-template-variables-panel.tsx) (painel variáveis disponíveis)