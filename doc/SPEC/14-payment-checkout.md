# SPEC — Checkout Pagamento (14-payment-checkout)

## 1. Objetivo
- Padronizar o checkout de pagamento com validação de token.

## 2. Referências
- PRD: `../PRD/14-payment-checkout.md`
- Descritivo: `../descritivo/14-checkuot_pagamento.md`
- Style: `../style/14-payment-checkout.md`
- Exemplo: `../style/14-payment-checkout.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/payment/checkout/:token`
- **Path:** `app/routes/public/payment/checkout/index.tsx`
- **Componentes únicos:** `app/routes/public/payment/checkout/components/*`

## 4. APIs
- `PaymentApi.validateTransaction()`
- `PaymentApi.processCardPayment()`
- `PaymentApi.generatePixCode()`
- `PaymentApi.checkPixStatus()`

## 5. Fluxo Principal
1. Descriptografar e validar JWT da transação.
2. Renderizar resumo do pedido.
3. Selecionar forma de pagamento (cartão/PIX).
4. Processar pagamento e atualizar status.

## 6. Estados
- `isValidToken`, `paymentStatus`, `activeTab`, `errorMessage`.

## 7. Validações
- Token válido e não expirado.
- Campos obrigatórios do cartão preenchidos.

## 8. Componentes
- Tabs de checkout, formulário de cartão, bloco de PIX.

## 9. Regras de UI
- Resumo fixo visível durante o fluxo.
- Botões com estados de loading.

## 10. Acessibilidade
- Foco visível nos botões.

## 11. Exemplo JSX
```jsx
<CheckoutTabs value={activeTab} onChange={setActiveTab}>
  <CheckoutSummary data={summary} />
  <CreditCardForm onSubmit={handleCardPayment} />
</CheckoutTabs>
```
