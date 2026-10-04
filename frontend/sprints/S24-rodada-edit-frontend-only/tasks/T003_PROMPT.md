---
id: "T003"
status: "pending"
type: "frontend"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "frontend"
estimatedEffort: 1.5
complexity: "medium"
dependencies: ["T002"]
---

# Task T003 — Componente `rodada-captacao-tab.tsx`

## Contexto

A aba "Captação" dentro de `/founder/startups/:id/edit/rodada` agrupa 3 seções reusáveis já existentes + 1 novo card de status. Esta tab é a "Tab 1" do segmented control do plano §3 (Opção B). É puramente compositiva — **ZERO lógica de negócio nova**, apenas orquestração de componentes com defaults mockados.

## Descrição

Criar `app/components/founder/rodada-captacao-tab.tsx`. Props: `{ startup: StartupDetail }`. Composição:

```typescript
export function RodadaCaptacaoTab({ startup }: { startup: StartupDetail }) {
  // 1. Mock defaults extraídos do startup (hardcoded em R$ 500k / 20% / 90 dias)
  const roundTermsDefaults: RoundTermsValues = {
    metaCaptacao: 500_000,
    equityOferecido: 20,
    prazoCaptacao: 90,
  };

  // 2. Mock 3 datas (abertura hoje, encerramento +90d, liquidação +120d)
  const scheduleDefaults = { abertura: "2026-07-13", encerramento: "2026-10-11", liquidacao: "2026-11-10" };

  // 3. Token price mock (R$ 1,00)
  const tokenPriceMock = 1.0;

  // 4. Status mock
  const reservationStatus: ReservationStatusCardProps = {
    status: 'PAGO',
    paidAt: '2026-07-10',
    valorPago: 500,
  };

  return (
    <div className="space-y-8">
      <ReservationStatusCard {...reservationStatus} />
      <RoundTerms defaults={roundTermsDefaults} mode="edit" reportStatus={...} registerReset={...} />
      <RoundSchedule defaults={scheduleDefaults} reportStatus={...} registerReset={...} />
      <TokenEconomicsCalculator mode="edit" meta={roundTermsDefaults.metaCaptacao} equity={roundTermsDefaults.equityOferecido} tokenPrice={tokenPriceMock} />
    </div>
  );
}
```

**Imports:**
- `RoundTerms` de `~/components/founder/round-terms`
- `RoundSchedule` de `~/components/founder/round-schedule`
- `TokenEconomicsCalculator` de `~/components/founder/token-economics-calculator`
- `ReservationStatusCard` de `./reservation-status-card` (T02)
- Tipos `RoundTermsValues`, `ReservationStatus` derivados dos componentes importados

## Escopo Cirúrgico

### Paths allowlist (CRIAÇÃO)

- `app/components/founder/rodada-captacao-tab.tsx` (novo)

### Paths proibidos

- `app/components/founder/round-terms.tsx` (NÃO modificar)
- `app/components/founder/round-schedule.tsx` (NÃO modificar)
- `app/components/founder/token-economics-calculator.tsx` (NÃO modificar)
- `app/components/founder/reservation-status-card.tsx` (apenas consumir — T02)
- `app/routes/**` (T005)

## Acceptance Criteria

- [ ] Renderiza `ReservationStatusCard` (de T02) no topo da tab
- [ ] Renderiza `RoundTerms` no modo `edit` com `defaults` mock
- [ ] Renderiza `RoundSchedule` com 3 datas mock
- [ ] Renderiza `TokenEconomicsCalculator` no modo `edit` com `tokenPrice` mock
- [ ] Props `reportStatus` e `registerReset` propagados para os sub-componentes (EditSectionProps)
- [ ] Tipo `StartupDetail` consumido corretamente — extrair via `useRouteLoaderData<typeof layoutLoader>` em T05 (T03 apenas recebe a prop)
- [ ] `npm run typecheck` passa
- [ ] Sem regressão visual nos 3 componentes reusados

## Ponteiros de Contexto

- **Componentes reusados (NÃO duplicar):**
  - `app/components/founder/round-terms.tsx` (208 LOC, modo edit funcional)
  - `app/components/founder/round-schedule.tsx` (147 LOC, 3 datas + validação de ordem)
  - `app/components/founder/token-economics-calculator.tsx` (89 LOC, readonly valuation)
  - `app/components/founder/reservation-status-card.tsx` (T02)
- **Tipos:**
  - `EditSectionProps` de `app/components/founder/_section-props.ts`
  - `RoundTermsValues` (verificar em `round-terms.tsx`)
- **Pattern:** `app/routes/private/edit-startup-identidade.tsx:68-83` (múltiplas seções com grid)

## Dependências

- **Bloqueia:** T005 (compõe esta tab na rota)
- **Bloqueada por:** T002 (componente ReservationStatusCard pronto)

## Status Final Esperado

Arquivo `app/components/founder/rodada-captacao-tab.tsx` (~80 LOC) compondo 4 sub-componentes com defaults mock. Typecheck verde. Sem código de negócio novo.