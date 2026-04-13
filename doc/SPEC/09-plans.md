# SPEC — Plans (09-plans)

## 1. Objetivo
- Padronizar a página de seleção de planos.

## 2. Referências
- PRD: `../PRD/09-plans.md`
- Descritivo: `../descritivo/09-plans.md`
- Style: `../style/09-plans.md`
- Exemplo: `../style/09-plans.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/plans`
- **Path:** `app/routes/private/plans/index.tsx`
- **Componentes únicos:** `app/routes/private/plans/components/*`

## 4. APIs
- `ApiPage.getPlans()`

## 5. Fluxo Principal
1. Buscar lista de planos.
2. Renderizar cards responsivos.
3. Destacar plano recomendado.

## 6. Estados
- `isLoading`, `error`, `selectedPlan`.

## 7. Validações
- Lista de planos deve existir antes de renderizar cards.

## 8. Componentes
- Cards de planos e CTA.

## 9. Regras de UI
- Card recomendado 5% maior.
- Grid responsivo (desktop ≥ 2 colunas).

## 10. Acessibilidade
- Foco visível em botões.

## 11. Exemplo JSX
```jsx
<section className="grid gap-6 md:grid-cols-2">
  {plans.map((plan) => (
    <PlanCard key={plan.id} data={plan} featured={plan.isFeatured} />
  ))}
</section>
```
