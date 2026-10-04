---
id: "T008"
status: "pending"
type: "frontend"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "documenter"
estimatedEffort: 0.5
complexity: "simple"
dependencies: ["T005"]
---

# Task T008 — Atualizar AGENTS.md (rotas + componentes founder)

## Contexto

Dois arquivos `AGENTS.md` precisam ser atualizados para refletir os novos arquivos criados em S24. **Atenção ao limite de 40 linhas** do lean profile — manter arquivos enxutos e focados.

## Descrição

### Mudança 1 — `app/routes/private/AGENTS.md`

**Localizar seção "Founder (8 rotas)"** e:

1. **Renomear** para `"Founder (9 rotas)"`.
2. **Adicionar** `edit-startup-rodada.tsx` no final da lista de rotas founder.

```diff
- ### Founder (8 rotas)
+ ### Founder (9 rotas)
  [founder-dashboard.tsx](file:///...), 
  [create-startup.tsx](file:///...) (wizard 4 steps),
  [edit-startup-identidade.tsx](file:///...),
  [edit-startup-documentos.tsx](file:///...),
  [edit-startup-bancario.tsx](file:///...),
  [edit-startup-layout.tsx](file:///...),
  [edit-startup-time.tsx](file:///...),
- [founder.startups.$id.checkout.tsx](file:///...)
+ [edit-startup-rodada.tsx](file:///...) (aba Rodada — 2 tabs internas: Captação + Distribuição, S24),
+ [founder.startups.$id.checkout.tsx](file:///...)
```

### Mudança 2 — `app/components/founder/AGENTS.md`

**Localizar seção "Identidade, banca, rodada, financeiro"** e adicionar 4 novos arquivos (1 rota + 3 componentes):

```diff
  ### Identidade, banca, rodada, financeiro
  [corporate-identity.tsx](file:///...), 
  [startup-branding.tsx](file:///...), 
  ...
  [token-economics-calculator.tsx](file:///...), 
  [token-reservation.tsx](file:///...), 
+ [rodada-captacao-tab.tsx](file:///...) (Tab Captação — compõe RoundTerms + RoundSchedule + TokenEconomicsCalculator + ReservationStatusCard, S24),
+ [rodada-distribuicao-tab.tsx](file:///...) (Tab Distribuição — 7 inputs nomeados + pill soma=100, S24 — COMPLEXO),
+ [reservation-status-card.tsx](file:///...) (Card read-only de status da reserva — simplificado de token-reservation, S24),
+ [edit-startup-rodada.tsx](file:///...) (Rota — segmented control + tabs internas via useState, S24),
  ...
```

## Escopo Cirúrgico

### Paths allowlist (MODIFICAÇÃO)

- `app/routes/private/AGENTS.md` (modificar)
- `app/components/founder/AGENTS.md` (modificar)

### Paths proibidos

- Qualquer outro arquivo (NÃO modificar)

## Acceptance Criteria

- [ ] `app/routes/private/AGENTS.md`: seção Founder renomeada para `(9 rotas)` + `edit-startup-rodada.tsx` listada com nota "(aba Rodada — 2 tabs internas: Captação + Distribuição, S24)"
- [ ] `app/components/founder/AGENTS.md`: 4 novos arquivos na seção 'Identidade, banca, rodada, financeiro' (rodada-captacao-tab, rodada-distribuicao-tab, reservation-status-card, edit-startup-rodada — 3 componentes + 1 rota)
- [ ] Ambos arquivos mantêm **limite de 40 linhas** (lean profile — instruções do `app/lib/AGENTS.md` raiz)
- [ ] Formatação consistente com entradas existentes (mesmo padrão `[nome.tsx](file:///...) (descrição curta)`)
- [ ] Indica que T004 (rodada-distribuicao-tab) é **COMPLEXO** na nota inline
- [ ] Não remove nenhuma entrada existente — APENAS ADICIONA

## Ponteiros de Contexto

- **Arquivos alvo:**
  - `app/routes/private/AGENTS.md` (seção "Founder (8 rotas)" → "(9 rotas)")
  - `app/components/founder/AGENTS.md` (seção "Identidade, banca, rodada, financeiro")
- **Convenção de formato:** cada entrada segue `[filename.tsx](file:///path) (descrição curta)`
- **Limite:** 40 linhas (lean profile — não estourar)

## Dependências

- **Bloqueia:** T010 (smoke test — AGENTS.md deve refletir o estado real)
- **Bloqueada por:** T005 (arquivos precisam existir antes de documentar)

## Status Final Esperado

2 arquivos `AGENTS.md` atualizados, ambos ≤40 linhas, com 4 novas entradas no `app/components/founder/AGENTS.md` e 1 nova entrada (com rename) no `app/routes/private/AGENTS.md`.