# AGENTS.md - app/components/financeiro

## Propósito
Modais do módulo Financeiro (área admin) — aprovar/rejeitar/marcar-pago parcelas de Repasse (FIN-09..FIN-11) e cancelar/ aprovar comprovantes antigos (legado).

## Dependências
- Internas: `app/hooks/use-*-mutation` (cancel/approve), `~/hooks/use-approve-installment`, `~/hooks/use-reject-installment`, `~/hooks/use-mark-installment-paid`, `~/hooks/use-financeiro-configure-repasse`, `~/components/foundation/repasse-sla-countdown`, `~/types/repasse`
- Externas: `react`, `react-hook-form`, `zod`, `sonner`, `radix-ui`, `lucide-react`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [ApprovePaymentModal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/financeiro/ApprovePaymentModal.tsx) | (legado) Modal de aprovação de pagamento com observação |
| [CancelModal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/financeiro/CancelModal.tsx) | (legado) Modal de cancelamento de pagamento/subscription |
| [repasse-config-modal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/financeiro/repasse-config-modal.tsx) | Modal de configuração do Repasse (valor + intervalo). So habilita se compliance ja deliberou. |
| [repasse-review-modal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/financeiro/repasse-review-modal.tsx) | Modal de revisão/aprovação de solicitacao com countdown SLA, alocacao visualizada e valorOverride opcional. |
| [plan-card.tsx](file:///home/kingdev/Documentos/Gitoken/Iselftokenv2/frontend/app/components/financeiro/plan-card.tsx) | Card de plano para `/financeiro/plans` (preço, status, contagem de assinantes, ações) |
| [plan-edit-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/financeiro/plan-edit-form.tsx) | Form de criação/edição com lista dinâmica de benefícios + chips de sugestões (DEFAULT_BENEFITS) |
| [plan-preview.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/financeiro/plan-preview.tsx) | Preview ao vivo do card de plano (replica visual do `pricing-card.tsx`) |
| [plan-stats-card.tsx](file:///home/kingdev/Documentos/Gitoken/Iselftokenv2/frontend/app/components/financeiro/plan-stats-card.tsx) | Card de estatísticas (MRR + assinantes ativos + receita total) |
