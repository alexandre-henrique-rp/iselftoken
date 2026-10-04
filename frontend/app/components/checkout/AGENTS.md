# AGENTS.md - app/components/checkout

## Propósito
Componentes da jornada de checkout de assinatura/pagamento (header, form de cartão, PIX, summary).

## Dependências
- Internas: `app/lib/mask-utils` (máscaras), `app/hooks/use-plan`
- Externas: `react-hook-form`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [checkout-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/checkout/checkout-header.tsx) | Cabeçalho com logo + título do plano |
| [credit-card-form.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/checkout/credit-card-form.tsx) | Form de cartão (número, validade, CVV) |
| [pix-payment.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/checkout/pix-payment.tsx) | Tela PIX (QR code + copia/cola) |
| [checkout-summary.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/checkout/checkout-summary.tsx) | Resumo lateral (plano, valor, descontos) |