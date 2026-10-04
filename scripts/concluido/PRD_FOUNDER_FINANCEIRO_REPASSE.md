# PRD — Página Financeiro da Startup (Repasse de Fundos pelo Founder)

**Data:** 17/08/2026  
**Autor:** Agente IA  
**Status:** Rascunho  
**Prioridade:** Alta  
**Módulo:** Frontend — Founder / Repasse  
**Rota:** `/founder/startups/:id/financeiro`

---

## 1. Contexto

O backend já possui o fluxo completo de repasse:
- Founder solicita parcela (`POST /api/founder/startups/:id/repasse/installments/:installmentId/request`)
- Founder re-submete após rejeição (`POST .../resubmit`)
- Founder visualiza dashboard (`GET /api/founder/startups/:id/repasse/dashboard`)
- Financeiro aprova/rejeita/marca como paga
- Auto-post na transparência quando aprovado/pago

**Falta:** A página no frontend onde o founder visualiza e interage com o repasse.

---

## 2. Fluxo Completo

```
Campanha FUNDED → Compliance delibera N parcelas → Financeiro configura valores
     ↓
Founder acessa /founder/startups/:id/financeiro
     ↓
Vê: resumo do repasse, lista de parcelas com status
     ↓
Parcela 1 disponível (AWAITING_REQUEST) → Clica "Solicitar"
     ↓
Formulário: alocação de recursos (7 categorias = 100%) + observação
     ↓
Submete → status muda para REQUESTED → SLA: 5 dias úteis
     ↓
Financeiro aprova → Auto-post na Transparência
     ↓
Financeiro marca como paga (TXID) → Post atualizado com "Status Final"
     ↓
Parcela 2 disponível → Founder solicita → ciclo repete
```

---

## 3. Wireframe da Página

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Voltar ao Dashboard                                          │
│                                                                 │
│  FINANCEIRO — {Nome da Startup}                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ TOTAL    │  │ RECEBIDO │  │ PENDENTE  │  │ PARCELAS │       │
│  │ R$ 500k  │  │ R$ 125k  │  │ R$ 375k   │  │ 3/12     │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ═══ PARCELAS ══════════════════════════════════════════         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ #1  R$ 41.666  │ ✅ COMPLETED │ Pago 10/08 │ TXID: ... │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ #2  R$ 41.666  │ ✅ COMPLETED │ Pago 15/08 │ TXID: ... │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ #3  R$ 41.666  │ ⏳ PROCESSING │ Aprovado 16/08         │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ #4  R$ 41.666  │ 📨 REQUESTED │ SLA: 20/08             │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ #5  R$ 41.666  │ ○ AWAITING   │ [Solicitar Parcela]    │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ #6  R$ 41.666  │ 🔒 Aguardando parcela anterior        │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ ...                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ═══ FORMULÁRIO DE SOLICITAÇÃO (ao clicar "Solicitar") ═══      │
│                                                                 │
│  Distribua os recursos desta parcela (soma = 100%):             │
│  ┌───────────────────────────────────────────┐                  │
│  │ Marketing:       [____]%                  │                  │
│  │ Desenvolvimento: [____]%                  │                  │
│  │ Infraestrutura:  [____]%                  │                  │
│  │ Pessoal:         [____]%                  │                  │
│  │ Jurídico:        [____]%                  │                  │
│  │ Operacional:     [____]%                  │                  │
│  │ Reserva Caixa:   [____]%                  │                  │
│  │                  TOTAL: [100]%            │                  │
│  └───────────────────────────────────────────┘                  │
│                                                                 │
│  Observação (opcional): [________________________]               │
│                                                                 │
│  [████ SOLICITAR PARCELA ████]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Dados do Dashboard (GET /api/founder/startups/:id/repasse/dashboard)

O endpoint já retorna:

```typescript
{
  repasse: {
    id, campaignId, numeroParcelas, valorParcela, valorUltimaParcela,
    intervaloDias, valorTotalCaptacao, status
  },
  installments: [
    { id, numero, valor, scheduledDate, paidAt, status }
  ],
  currentInstallment: { ... } | null,  // próxima parcela solicitável
  kpis: {
    totalCaptado, totalRecebido, totalPendente,
    parcelasCompletadas, parcelasTotais
  }
}
```

---

## 5. Formulário de Solicitação

### 5.1 Campos

| Campo | Tipo | Validação |
|-------|------|-----------|
| marketing | number (%) | 0-100, inteiro |
| desenvolvimento | number (%) | 0-100, inteiro |
| infraestrutura | number (%) | 0-100, inteiro |
| pessoal | number (%) | 0-100, inteiro |
| juridico | number (%) | 0-100, inteiro |
| operacional | number (%) | 0-100, inteiro |
| reservaCaixa | number (%) | 0-100, inteiro |
| observacao | string (opcional) | max 1000 chars |

### 5.2 Validação

- **Soma = 100%** (tolerância 0.01 — implementada no backend)
- **Sequencialidade** — Só pode solicitar se parcela anterior está COMPLETED
- **Status** — Só parcelas AWAITING_REQUEST ou REJECTED podem ser solicitadas

### 5.3 Após Submissão

- Status muda para `REQUESTED`
- SLA de 5 dias úteis aparece (deadline de pagamento)
- Financeiro é notificado (via sistema de notificações)
- Botão muda para "Aguardando aprovação"

---

## 6. Status das Parcelas (labels e cores)

| Status | Label | Cor | Ação disponível |
|--------|-------|-----|-----------------|
| AWAITING_REQUEST | Disponível | Azul | "Solicitar Parcela" |
| REQUESTED | Solicitado | Amber | Aguardando (mostra SLA) |
| PROCESSING | Aprovado | Verde claro | Aguardando pagamento |
| COMPLETED | Pago | Verde | Mostra TXID + data |
| REJECTED | Rejeitado | Vermelho | "Re-submeter" + motivo |
| (bloqueada) | Aguardando anterior | Cinza | Desabilitado |

---

## 7. Regras de Negócio

| Regra | Detalhe |
|-------|---------|
| Sequencial | Parcela N só pode ser solicitada após N-1 estar COMPLETED |
| Ownership | Somente o founderId da startup pode acessar |
| Soma 100% | Alocação obrigatoriamente soma 100% |
| SLA 5 dias | Após solicitar, financeiro tem 5 dias úteis para pagar |
| Resubmissão | Se rejeitada, founder pode resubmeter (incrementa attemptNumber) |
| Auto-post | Aprovação e pagamento geram post automático na transparência |
| Sem comprovante | O financeiro registra TXID + endToEndId (sem upload de PDF) |

---

## 8. Integração com Transparência

Quando o financeiro **aprova** a parcela:
- Evento `installment.approved` é emitido
- `TransparencyAutoPostService` cria post tipo `FINANCIAL_REPORT`
- Título: "Solicitação de Repasse aprovada - Parcela X/Y"
- Conteúdo: valor, alocação por categoria, observações

Quando o financeiro **marca como paga**:
- Evento `installment.completed` é emitido
- O MESMO post é **atualizado** com seção "Status Final" + TXID + data

---

## 9. Impacto Técnico

### 9.1 Frontend — Criar

| Arquivo | Propósito |
|---------|-----------|
| `routes/private/founder-startup-financeiro.tsx` | Página principal com KPIs + lista parcelas + form |
| `routes/api/founder.startups.$id.repasse.dashboard.ts` | BFF proxy para GET dashboard |
| `routes/api/founder.startups.$id.repasse.request.ts` | BFF proxy para POST request/resubmit |

### 9.2 Frontend — Alterar

| Arquivo | Alteração |
|---------|-----------|
| `routes.ts` | Registrar rota `founder/startups/:id/financeiro` |

### 9.3 Backend

Tudo já existe. Nenhuma alteração necessária.

---

## 10. Critérios de Aceite

- [ ] **AC-01:** Página acessível em `/founder/startups/:id/financeiro`
- [ ] **AC-02:** KPIs exibidos: total captado, total recebido, total pendente, parcelas X/Y
- [ ] **AC-03:** Lista de parcelas com status visual (cor + label + ação)
- [ ] **AC-04:** Formulário de alocação com 7 campos + validação soma = 100%
- [ ] **AC-05:** Botão "Solicitar Parcela" desabilitado se parcela anterior não está COMPLETED
- [ ] **AC-06:** Após solicitação, mostra "Aguardando aprovação" + SLA
- [ ] **AC-07:** Parcela rejeitada mostra motivo + botão "Re-submeter"
- [ ] **AC-08:** Parcela paga mostra data + TXID
- [ ] **AC-09:** Somente founder da startup pode acessar (403 para outros)
- [ ] **AC-10:** Repasse não configurado mostra mensagem "Aguardando configuração pelo financeiro"

---

## 11. Fora de Escopo

- Upload de comprovante de pagamento (financeiro usa TXID)
- Nota fiscal (existe no modelo mas não é gerida pelo founder)
- Notificações push/email (follow-up)
- Gráfico de progresso temporal
