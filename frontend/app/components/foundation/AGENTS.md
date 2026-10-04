# AGENTS.md - app/components/foundation

## Propósito
Primitivos reutilizaveis cross-feature do frontend iSelfToken. Diferente de
`components/ui/*` (building blocks atomicos shadcn-style), aqui ficam
componentes compartilhados entre features (founder, compliance, financeiro)
mas ainda com certo nivel de especializacao de dominio.

## Dependências
- `app/types/*` — DTOs compartilhados
- `app/lib/*` — schemas Zod, formatadores (currency-format)

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [repasse-sla-countdown.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/foundation/repasse-sla-countdown.tsx) | Countdown em tempo real de SLA (5 dias uteis) — verde/amarelo/vermelho. |
