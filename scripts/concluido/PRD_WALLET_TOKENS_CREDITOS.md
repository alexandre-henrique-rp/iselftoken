# PRD — Wallet: Tokens + Créditos + Histórico de Transações

**Data:** 17/08/2026  
**Autor:** Agente IA  
**Status:** Rascunho  
**Prioridade:** Alta  
**Módulo:** Frontend + Backend — Wallet

---

## 1. Contexto

A página `/wallet` já existe com componentes básicos (WalletHeader, WalletStats, AssetList, TransactionHistory), mas precisa ser reestruturada para separar claramente dois tipos de ativos:

1. **Tokens** — Ativos digitais de investimento em startups (valor patrimonial, informativo)
2. **Créditos (R$)** — Saldo monetário sacável na carteira (reembolsos, comissões afiliado, EXIT)

O crédito sempre é exibido como R$ (Real Brasileiro) para o cliente.

---

## 2. Regras de Negócio Fundamentais

### 2.1 Tokens ≠ Crédito

| Aspecto | Tokens | Créditos (R$) |
|---------|--------|---------------|
| Natureza | Ativo de investimento (patrimonial) | Dinheiro sacável |
| Sacável diretamente? | ❌ NÃO | ✅ SIM |
| Valor | Variável (`currentVal` pode subir/descer) | Fixo (R$ nominal) |
| Fonte | Compra via campanha de startup | Comissão afiliado, EXIT, depósito PIX, venda P2P, reembolso |
| Destino | Portfólio do investidor | Conta bancária (via saque) |

### 2.2 Preço do Token

- **Valor inicial padrão:** R$ 200,00 por token
- **Configurável:** O financeiro define o `tokenPrice` por campanha (`Campaign.tokenPrice`)
- **`purchaseVal`:** Valor no momento da compra — **congelado, nunca muda**
- **`currentVal`:** Valor atual do token — pode variar (valorização/desvalorização, ROI)
- O valor do card de Tokens na wallet é **informativo** (quanto o portfólio vale hoje)

### 2.3 Saque (Resgate)

| Regra | Detalhe |
|-------|---------|
| Saque só com crédito | Só é permitido quando `Wallet.balance > 0` |
| Tokens não são sacáveis | Precisam primeiro virar crédito via EXIT, P2P, ou dividendos |
| Saque parcial | Permitido (sacar qualquer valor ≤ balance disponível) |
| Bloqueio | Ao solicitar saque, valor sai do `balance` e vai para `blocked` |
| Aprovação | Financeiro aprova/rejeita o saque |
| Botão desabilitado | Se `balance = 0`, botão "Solicitar Resgate" fica desabilitado |

### 2.4 Como Tokens Viram Crédito

| Evento | Descrição | WalletType |
|--------|-----------|------------|
| EXIT | Startup é vendida/faz IPO → distribuição pro-rata aos token-holders | `DIVIDEND_EXIT` |
| Venda P2P | Investidor vende tokens para outro usuário | `P2P_SALES` |
| Dividendos | Startup distribui lucros (`participacaoLucros = true`) | `DIVIDEND_EXIT` |

### 2.5 Comissões de Afiliado

- Quando `AffiliateCommission.status` muda para `PAID`:
  - Crédito é adicionado à `Wallet.balance` do afiliado
  - Cria `WalletTransaction` com type `AFFILIATE_COMMISSION`
  - Aparece no histórico automaticamente

---

## 3. Wireframe da Página Wallet

```
┌─────────────────────────────────────────────────────────────────┐
│  MINHA CARTEIRA                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │ 🪙 TOTAL EM TOKENS       │  │ 💰 CRÉDITOS (R$)          │    │
│  │                          │  │                           │    │
│  │ 480 tokens               │  │ R$ 12.450,00              │    │
│  │ Valor atual: R$ 52.800   │  │ Disponível para resgate   │    │
│  │ ROI médio: +10.2%        │  │                           │    │
│  │ Em 6 startups            │  │ Bloqueado: R$ 2.000,00    │    │
│  │                          │  │ (saque em andamento)       │    │
│  │ * Valor patrimonial.     │  │                           │    │
│  │   Não sacável.           │  │ [Solicitar Resgate]       │    │
│  │                          │  │ (desabilitado se R$ 0)    │    │
│  │ [Ver investimentos]      │  │                           │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 HISTÓRICO DE TRANSAÇÕES                     [Filtros ▾]     │
│  ──────────────────────────                                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ↗ COMISSÃO AFILIADO           +R$ 500,00    15/08/2026   │   │
│  │   CloudPilot — investimento #42                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ ↙ INVESTIMENTO                -R$ 10.000    14/08/2026   │   │
│  │   NeuralForge — 50 tokens comprados                      │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ ↗ DEPÓSITO PIX               +R$ 25.000    13/08/2026   │   │
│  │   Via PIX — txid: DEP8A3B...                             │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ ↙ SAQUE                      -R$ 5.000     12/08/2026   │   │
│  │   Banco 001 — Ag 0001 Cc 12345-0                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ ↗ EXIT/DIVIDENDO             +R$ 8.200     10/08/2026   │   │
│  │   PaySwift — distribuição pro-rata                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Carregar mais...]                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Card de Tokens (Informativo / Patrimonial)

### 4.1 Dados Exibidos

| Campo | Fonte | Cálculo |
|-------|-------|---------|
| Total de tokens | `count(Token where userId)` | Soma de quantity |
| Valor atual total | `sum(Token.currentVal)` | Soma de currentVal de todos tokens |
| ROI médio | `(totalCurrentVal - totalPurchaseVal) / totalPurchaseVal * 100` | % |
| Qtd startups | `count(distinct Token.startupId)` | Startups únicas |

### 4.2 Nota Informativa

Exibir texto discreto: "Valor patrimonial. Não sacável diretamente."

### 4.3 Ação

- **"Ver investimentos"** → Navega para `/transparencia` (lista de startups investidas)

---

## 5. Card de Créditos R$ (Transacional / Sacável)

### 5.1 Dados Exibidos

| Campo | Fonte |
|-------|-------|
| Saldo disponível | `Wallet.balance` formatado como R$ |
| Saldo bloqueado | `Wallet.blocked` formatado como R$ (se > 0) |
| Label bloqueado | "Saque em andamento" |

### 5.2 Fontes de Crédito

| Tipo | Descrição | WalletType |
|------|-----------|------------|
| Comissão afiliado | AffiliateCommission paga | `AFFILIATE_COMMISSION` |
| EXIT/Dividendo | Startup faz exit | `DIVIDEND_EXIT` |
| Depósito PIX | Usuário deposita | `DEPOSIT` |
| Venda P2P | Vende tokens para outro | `P2P_SALES` |
| Recebimento Captação | Founder recebe arrecadado | `CAMPAIGN_SETTLEMENT` |

### 5.3 Ação

- **"Solicitar Resgate"** → Navega para `/wallet/withdraw`
- **Desabilitado** quando `Wallet.balance = 0` com tooltip: "Você não possui créditos disponíveis para resgate"

---

## 6. Histórico de Transações

### 6.1 Dados por Transação

| Campo | Fonte |
|-------|-------|
| Tipo | `WalletTransaction.type` (traduzido para PT-BR) |
| Valor | `WalletTransaction.amount` (R$, + verde ou − vermelho) |
| Descrição | `WalletTransaction.description` |
| Data | `WalletTransaction.createdAt` (formatada dd/mm/yyyy) |
| Direção | Entrada (↗ verde) ou Saída (↙ vermelho) |

### 6.2 Filtros

| Filtro | Opções |
|--------|--------|
| Tipo | Todos, Depósitos, Saques, Investimentos, Comissões, EXIT |
| Período | Últimos 7 dias, 30 dias, 90 dias, Tudo |

### 6.3 Mapeamento de Tipos

| WalletType | Label PT-BR | Direção | Cor |
|------------|-------------|---------|-----|
| `DEPOSIT` | Depósito PIX | Entrada | Verde |
| `WITHDRAWAL` | Saque | Saída | Vermelho |
| `INVESTMENT` | Investimento | Saída | Vermelho |
| `SUBSCRIPTION` | Pagamento de Plano | Saída | Vermelho |
| `CAMPAIGN_SETTLEMENT` | Recebimento de Captação | Entrada | Verde |
| `DIVIDEND_EXIT` | EXIT / Dividendo | Entrada | Verde |
| `P2P_SALES` | Venda P2P | Entrada | Verde |
| `P2P_PURCHASE` | Compra P2P | Saída | Vermelho |
| `AFFILIATE_COMMISSION` | Comissão de Afiliado | Entrada | Verde |

### 6.4 Paginação

- Exibir 20 transações por vez
- Botão "Carregar mais" para próxima página
- Ordenação: mais recentes primeiro (`createdAt DESC`)

---

## 7. Ajustes Necessários

### 7.1 Backend

| Ajuste | Detalhe |
|--------|---------|
| `GET /wallet` | Adicionar ao retorno: `tokenStats: { total, totalValue, averageRoi, startupsCount }` |
| `GET /wallet/transactions` | **NOVO** endpoint paginado: query params `type`, `dateFrom`, `dateTo`, `page`, `limit` |
| Validação saque | Garantir que `withdrawDto.amount <= wallet.balance` (já existe) |

### 7.2 Frontend

| Ajuste | Detalhe |
|--------|---------|
| `wallet.tsx` | Reestruturar: 2 cards lado a lado + histórico paginado com filtros |
| Loader | Buscar `GET /wallet` (com tokenStats) + `GET /wallet/transactions?page=1&limit=20` |
| `withdraw.tsx` | Usar `balance` real do loader (remover hardcoded "R$ 12.450,00") |
| Botão Resgate | Desabilitado se balance = 0, com tooltip explicativo |
| Card Tokens | Nota "valor patrimonial, não sacável" |

---

## 8. Critérios de Aceite

- [ ] **AC-01:** Card "Total em Tokens" exibe contagem, valor atual, ROI médio e nº startups
- [ ] **AC-02:** Card "Créditos" exibe saldo disponível (R$) e bloqueado
- [ ] **AC-03:** Nota "Valor patrimonial. Não sacável." visível no card de tokens
- [ ] **AC-04:** Botão "Solicitar Resgate" desabilitado quando balance = 0
- [ ] **AC-05:** Tooltip informativo quando botão desabilitado
- [ ] **AC-06:** Histórico de transações paginado (20 por vez) com "Carregar mais"
- [ ] **AC-07:** Filtros por tipo de transação e período funcionam
- [ ] **AC-08:** Transações de entrada em verde (+), saída em vermelho (−)
- [ ] **AC-09:** Comissões de afiliado aparecem no histórico quando pagas
- [ ] **AC-10:** Botão "Ver investimentos" navega para /transparencia
- [ ] **AC-11:** Página de withdraw usa saldo real (não hardcoded)
- [ ] **AC-12:** Backend retorna tokenStats no GET /wallet
- [ ] **AC-13:** Novo endpoint GET /wallet/transactions com filtros e paginação

---

## 9. Fora de Escopo

- Implementação do fluxo EXIT/distribuição pro-rata (feature separada)
- Mercado P2P de tokens (compra/venda entre usuários)
- Depósito via cartão de crédito (somente PIX hoje)
- Push notifications de movimentação
- Exportação de extrato em PDF/CSV
- Conversão direta token → crédito (requer mecanismo de mercado)
