# AGENTS.md - app/components/pricing

## Propósito
Componentes da tela `/pricing` — header explicativo, card de plano e modal de troca de plano.

## Dependências
- Internas: `app/hooks/use-user`, `app/types/auth`
- Externas: `react-router`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [pricing-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/pricing/pricing-header.tsx) | Cabeçalho da página de planos |
| [pricing-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/pricing/pricing-card.tsx) | Card de plano (preço, features, CTA checkout) |
| [SwitchPlanModal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/pricing/SwitchPlanModal.tsx) | Modal de upgrade/downgrade entre planos |