---
id: "T002"
status: "pending"
type: "frontend"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "frontend"
estimatedEffort: 1.0
complexity: "simple"
dependencies: ["T001"]
---

# Task T002 — Componente `reservation-status-card.tsx` (read-only)

## Contexto

O componente `token-reservation.tsx` (219 LOC) implementa a UI completa de reserva de tokens com botão "Pagar reserva". Para a aba "Rodada" em modo mock (frontend-only, sem integração de pagamento), precisamos apenas do **visual de status** (paid/pending/cancelled) — sem ação de pagamento.

## Descrição

Criar `app/components/founder/reservation-status-card.tsx` — versão simplificada e **read-only** do card de status. Props:

```typescript
type ReservationStatus = 'PAGO' | 'AGUARDANDO' | 'CANCELADO';

interface ReservationStatusCardProps {
  status: ReservationStatus;
  paidAt?: string;       // ISO date — ex: "2026-07-10"
  valorPago?: number;    // ex: 500.00
}
```

Visual baseado em `token-reservation.tsx:128-139` (paid) e `:142-217` (pending):

- **PAGO** → border-l-4 verde, ícone `CheckCircle2` (lucide-react), texto "Reserva confirmada em {paidAt}" + valor formatado
- **AGUARDANDO** → border-l-4 amarelo, ícone `Loader2`, texto "Aguardando pagamento da reserva"
- **CANCELADO** → border-l-4 vermelho, ícone `XCircle`, texto "Reserva cancelada"

**NÃO** renderiza botão "Pagar reserva" — versão pura de status (mock).

## Escopo Cirúrgico

### Paths allowlist (CRIAÇÃO)

- `app/components/founder/reservation-status-card.tsx` (novo)

### Paths proibidos

- `app/components/founder/token-reservation.tsx` (NÃO modificar — apenas inspiração visual)
- `app/lib/**`, `app/routes/**` (T001/T003/T004/T005)

## Acceptance Criteria

- [ ] Renderiza status `PAGO` com border-l-4 verde + `CheckCircle2` + `paidAt` formatado
- [ ] Renderiza status `AGUARDANDO` com border-l-4 amarelo + `Loader2`
- [ ] Renderiza status `CANCELADO` com border-l-4 vermelho + `XCircle`
- [ ] **NÃO** renderiza botão "Pagar reserva" (read-only puro)
- [ ] Aceita `paidAt` e `valorPago` opcionais sem quebrar quando `undefined`
- [ ] `valorPago` formatado via `formatCurrencyBRL` de `app/lib/currency-format.ts`
- [ ] Usa `cn()` de `app/lib/utils.ts` para classes condicionais
- [ ] Visual consistente com `glass-card` pattern dos outros componentes (rounded-3xl, p-8)
- [ ] `npm run typecheck` passa

## Ponteiros de Contexto

- **Inspiração visual:** `app/components/founder/token-reservation.tsx:128-139` (paid) + `:142-217` (pending)
- **Helpers:** `cn()` de `app/lib/utils.ts`, `formatCurrencyBRL` de `app/lib/currency-format.ts`
- **Icons:** `CheckCircle2`, `Loader2`, `XCircle` de `lucide-react`
- **AGENTS.md:** `app/components/founder/AGENTS.md` (padrão visual dos componentes)

## Dependências

- **Bloqueia:** T003 (compõe este componente na Tab Captação)
- **Bloqueada por:** T001 (define tipo relacionado, embora T02 seja independente no runtime)

## Status Final Esperado

Arquivo `app/components/founder/reservation-status-card.tsx` (~60 LOC) com componente read-only funcional para 3 status visuais. Typecheck verde.