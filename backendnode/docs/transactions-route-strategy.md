---
description: Estratégia da rota de transações e ledger financeiro
---

# Arquitetura Financeira: Rota Transaction & Wallet Ledger

## 🎯 Objetivo

Definir como a rota `transactions` vai **criar, consultar e confirmar pagamentos**, integrando `Payment`, `Wallet` e os módulos de assinatura, investimento e serviços avulsos.

## 🧭 Visão Geral

A rota `transactions` é o **gateway central** para movimentações financeiras. Ela decide se a cobrança será processada via **Gateway/PSP** (PIX, cartão, boleto) ou via **Wallet** (saldo interno).

## 🧱 Modelos e Relacionamentos (Prisma)

- **Payment**: registro financeiro (método, status, propósito, txid, QRCode, etc.).
- **Wallet / WalletTransaction**: ledger interno para crédito/débito.
- **Subscription / Investment / Campaign**: destinos do pagamento.

Relacionamentos principais:

- Payment N:1 User
- Payment 1:1 Investment
- Payment N:1 Subscription
- Payment N:1 Campaign (para `INVESTMENT` e `TOKEN_RESERVATION`)
- Payment.serviceDetails (metadados de serviços avulsos)
- WalletTransaction N:1 Wallet (rastreio por `relatedPaymentId`/`relatedInvestId`)

## 🧩 Enums e Tipos

### `PaymentPurpose` (O que está sendo pago?)

| Tipo | Descrição | Regra de Valor |
| :--- | :--- | :--- |
| `SUBSCRIPTION` | Assinatura de Planos (SaaS) | Valor do `Plan` no banco. |
| `INVESTMENT` | Compra de Tokens em Campanha | `Campaign.tokenPrice` * **tokensQty** (regra oficial). |
| `TOKEN_RESERVATION` | Taxa para Fundador criar tokens | **5%** do `Campaign.targetAmount`. |
| `EARLY_ACCESS` | Acesso antecipado/Destaque | Valor fixo (**R$ 5.000,00**). |
| `P2P_BUY` | Compra de tokens de outro usuário | Valor definido na ordem de venda. |

### `PaymentMethod` (Como vai pagar?)

- `PIX`

- `CREDIT_CARD`
- `BOLETO`
- `WALLET`

### `WalletType` (Ledger interno)

- `DEPOSIT`, `WITHDRAWAL`, `INVESTMENT`, `SUBSCRIPTION`

- `CAMPAIGN_SETTLEMENT`, `DIVIDEND_EXIT`, `P2P_SALES`, `P2P_PURCHASE`

## 🔒 Regras de Negócio (Guardrails)

1. **Cálculo no Backend:** o valor final é calculado no backend a partir do ID e das regras.
2. **Idempotência:** se existir pagamento `PENDING` para o mesmo usuário/item nos últimos 5 minutos, retornar o existente.
3. **Owner Check (P2P):** usuário não pode comprar token próprio.

### Regras por `PaymentPurpose`

- **SUBSCRIPTION**
  - Validar plano ativo.
  - Valor = `Plan.preco`.
- **INVESTMENT**
  - `Campaign.status` deve ser `OPEN`.
  - `tokensQty` não pode exceder `Campaign.totalTokens - tokensSold`.
  - Valor = `Campaign.tokenPrice * tokensQty`.
- **TOKEN_RESERVATION**
  - Usuário deve ser `founderId`.
  - `reservationFeePaid` deve ser `false`.
- **EARLY_ACCESS**
  - `serviceDetails.product = EARLY_ACCESS`.
  - Valor fixo (R$ 5.000,00).
- **P2P_BUY**
  - Deve existir ordem de venda ativa (futuro `SellOrder`).
  - Pagamento **obrigatoriamente** via `WALLET`.

### Pagamento via `WALLET`

- Bloquear se `Wallet.balance < amount`.
- Operação deve ser **atômica** (debitar + criar payment + entregar item).

## 🔁 Fluxos Principais

### A) Token Reservation (Founder)

1. `POST /transactions` com `purpose=TOKEN_RESERVATION` + `campaignId`.
2. Calcula 5% do `targetAmount`.
3. Cria `Payment` PENDING e gera payload PIX.
4. No webhook/confirm:
   - `Payment.status = PAID`
   - `Campaign.reservationFeePaid = true`
   - `Campaign.status = OPEN`
   - Mint de tokens.

### B) Investment (Investor)

1. `POST /transactions` com `purpose=INVESTMENT`, `campaignId`, `tokensQty`, `method`.
2. Calcula valor baseado em `tokenPrice * tokensQty`.
3. Cria `Payment` PENDING e payload do gateway.
4. Confirmado:
   - `Payment.status = PAID`
   - `Investment.status = CONFIRMED`
   - `Campaign.tokensSold += tokensQty`
   - Cria `Token` + `TokenHistory`.

### C) Subscription (SaaS)

1. `POST /transactions` com `purpose=SUBSCRIPTION`, `planId`.
2. Valor = `Plan.preco`.
3. Confirmado:
   - `Subscription.status = ACTIVE`
   - Atualiza `startedAt` e `expiresAt`.

### D) P2P Buy (futuro)

Fluxo condicionado à criação de `SellOrder` e purpose `P2P_BUY`.

## 📦 Especificação da API (prévia)

### `POST /transactions`

```json
{
  "method": "PIX" | "CREDIT_CARD" | "BOLETO" | "WALLET",
  "purpose": "SUBSCRIPTION" | "INVESTMENT" | "TOKEN_RESERVATION" | "EARLY_ACCESS" | "P2P_BUY",

  "planId": 1,
  "campaignId": 20,
  "tokensQty": 100,
  "serviceDetails": { "product": "EARLY_ACCESS" },
  "p2pOrderId": 55
}
```

### Response (PIX)

```json
{
  "id": 102,
  "status": "PENDING",
  "amount": 10000.00,
  "gatewayData": {
    "txid": "e728...",
    "qrCode": "00020126580014br.gov.bcb.pix...",
    "copyPaste": "00020126580014br.gov.bcb.pix..."
  }
}
```

### Response (Confirmado)

```json
{
  "id": 103,
  "status": "PAID",
  "paidAt": "2026-02-02T14:00:00Z",
  "message": "Transação aprovada e serviço liberado."
}
```

## ✅ Próximos Passos

1. Atualizar `schema.prisma`:
   - `PaymentMethod` incluir `WALLET`.
   - `PaymentPurpose` incluir `P2P_BUY`.
2. Definir DTOs (`CreateTransactionDto`, `ConfirmTransactionDto`).
3. Implementar `TransactionsController` + `TransactionsService`.
4. Criar testes para cálculos e operações atômicas.
