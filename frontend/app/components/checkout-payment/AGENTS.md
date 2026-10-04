# AGENTS.md - app/components/checkout-payment

## Propósito
Componentes do fluxo unificado de pagamento pós-checkout (selector de método + PIX + redirect cartão). Camada intermediária entre `routes/private/checkout-payment.tsx` e o BFF `/api/payment`.

## Dependências
- Internas: `app/lib/api-config` (BACKEND_URL), `app/hooks/use-plan`
- Externas: `react`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [MethodSelector.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/checkout-payment/MethodSelector.tsx) | Tabs PIX/Cartão; emite seleção p/ pai |
| [PixPayment.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/checkout-payment/PixPayment.tsx) | Render do QR + polling de status |
| [CreditCardRedirect.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/checkout-payment/CreditCardRedirect.tsx) | Wrapper de redirect p/ gateway externo |