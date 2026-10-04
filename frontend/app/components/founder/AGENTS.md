# AGENTS.md - app/components/founder

## Propósito
Painel do Fundador: dashboard, criação/edição de startup (wizard 4 steps + tabs), rodada, financeiro, equipe, termo de adesão (S18), repasse de fundos (FIN-09..FIN-11).

## Dependências
- Internas: `app/hooks/use-dashboard-overview`, `use-*-mutation` (startup/round/termo), `app/lib/startup-schema`, `app/lib/repasse-schemas`, `~/hooks/use-repasse-dashboard`, `~/hooks/use-create-solicitacao`, `~/hooks/use-resubmit-solicitacao`
- Externas: `react-router`, `react-hook-form`, `zod`, `sonner`, `radix-ui`, `lucide-react`

## Mapa de Arquivos

### Dashboard / listagem
[founder-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/founder-header.tsx), [founder-filters.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/founder-filters.tsx), [founder-metrics.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/founder-metrics.tsx), [founder-pagination.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/founder-pagination.tsx), [current-metrics.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/current-metrics.tsx)

### Repasse de Fundos (FIN-09..FIN-11)
[repasse-dashboard.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/repasse-dashboard.tsx) (rota founder: header + 4 KPI + stepper + detalhe + historico), [repasse-installment-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/repasse-installment-form.tsx) (form de solicitacao com dicas + **Relatorio do Mes** + alocacao 100%), [repasse-monthly-report-fields.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/repasse-monthly-report-fields.tsx) (**NOVO Sprint S36 — FIN-11 §8.2**: 4 campos opcionais do relatorio do mes: mensagem, uso, lucro, marco), [repasse-allocation-input.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/repasse-allocation-input.tsx) (7 sliders sincronizados), [repasse-educacional-tips.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/repasse-educacional-tips.tsx) (4 cards colapsaveis PT-BR), [repasse-stepper.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/repasse-stepper.tsx) (stepper vertical colorido por status), [repasse-history.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/repasse-history.tsx) (tabela compacta 5 ultimas)

### Views (list/grid/kanban/card)
[startup-list-view.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/startup-list-view.tsx), [startup-grid-view.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/startup-grid-view.tsx), [startup-kanban-board.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/startup-kanban-board.tsx), [startup-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/startup-card.tsx), [startup-grid-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/startup-grid-card.tsx), [startup-actions-cell.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/startup-actions-cell.tsx), [status-pills.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/status-pills.tsx)

### Wizard de criação (4 steps + header/stepper/action-bar)
[new-startup-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/new-startup-header.tsx), [new-startup-stepper.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/new-startup-stepper.tsx), [new-startup-step-1-identity.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/new-startup-step-1-identity.tsx), [new-startup-step-2-offer.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/new-startup-step-2-offer.tsx), [new-startup-step-3-media.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/new-startup-step-3-media.tsx), [new-startup-step-4-banking-review.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/new-startup-step-4-banking-review.tsx), [new-startup-action-bar.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/new-startup-action-bar.tsx)

### Formulário de captação (Sprint S34-d, refator Sprint S34-k)
[new-captacao-from-step3.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/new-captacao-from-step3.tsx) — **wrapper que reusa EXATAMENTE o `NewStartupStep3Fundraising`** (a aba captação do wizard `/founder/startups/new`). Garante UI visual e UX identicas entre o wizard e a pagina standalone de nova captacao.

Por que reusar o step 3?
- User pediu explicitamente que a pagina de nova captacao siga o padrao visual do wizard
- O `NewCaptacaoForm` original (com alocacao de 7 categorias + deadline + affiliate) divergiu; unificamos aqui

Como funciona:
1. Monta `useForm<NewStartupFormData>` minimo (3 campos: metaCaptacao, equityOferecido, wantsFastTrackReview)
2. Renderiza `<NewStartupStep3Fundraising>` com props identicas ao wizard
3. No submit, converte os campos do wizard para payload de campaign (targetAmount, equityPercent, valuation, tokenPrice, totalTokens, deadline, affiliateCommissionPct) e chama `useCreateRoundMutation`
4. `deadline = now + 90 dias` (padrao de 3 meses para fechamento)
5. `affiliateCommissionPct = 5` (padrao, ajustavel depois em Retornos)

Usado por:
- `routes/private/founder-new-round.tsx` (rota canônica com 6 gates no loader)
- `routes/private/founder-new-captacao.tsx` (rota standalone `/founder/captacao/nova` com seletor de startup)

Recebe `startupId` + opcional `startupName` + opcional `hideStepHeader` (default true).

### Edição de startup (header/nav/rail/action)
[edit-startup-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/edit-startup-header.tsx), [edit-startup-nav.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/edit-startup-nav.tsx), [edit-startup-rail.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/edit-startup-rail.tsx), [edit-startup-action-bar.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/edit-startup-action-bar.tsx)

### Equipe / docs / revisão / rodadas-ações
[team-member-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/team-member-card.tsx), [team-member-list.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/team-member-list.tsx), [advisors-section.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/advisors-section.tsx), [employees-section.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/employees-section.tsx), [documents-section.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/documents-section.tsx), [review-accordion.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/review-accordion.tsx), [confirm-cancel-round-dialog.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/confirm-cancel-round-dialog.tsx), [confirm-pause-round-dialog.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/confirm-pause-round-dialog.tsx)

### Termo de adesão (S18)
[termo-adesao-section.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/termo-adesao-section.tsx) (checkbox + selo S18.4), [documento-verificacao-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/documento-verificacao-card.tsx) (verificação pública S18.5), [document-request-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/document-request-card.tsx) (solicitação de documento extra do compliance — AC-07; CTA "Enviar agora")

### Termo de adesão — Leitura integral (`/founder/termo-adesao/texto`)
[termo-adesao-content.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/termo-adesao-content.tsx) (render dark do HTML do termo, glass-panel + tipografia editorial; recebe `html` ja processado por `getTermoAdesaoBody()`), [termo-adesao-legal-banner.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/termo-adesao-legal-banner.tsx) (banner obrigatorio Lei 14.063/2020 + X.509 + PAdES), [termo-adesao-actions.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/termo-adesao-actions.tsx) (3 botoes: Voltar / Imprimir / Fechar aba — usado em `headerActions` do `EditorialWalletShell`), [termo-adesao-skeleton.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/termo-adesao-skeleton.tsx) (placeholder de loading preservando layout — usado como `HydrateFallback` da rota; segue padrao `bg-accent/40 animate-pulse`)

### State / utilitários
[dashboard-state.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/dashboard-state.ts), [_section-props.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/founder/_section-props.ts)
