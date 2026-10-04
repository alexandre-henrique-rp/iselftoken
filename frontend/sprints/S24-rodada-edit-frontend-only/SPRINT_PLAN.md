# Sprint Plan — S24-rodada-edit-frontend-only

> **Marco:** M4 — Edição de Rodada (apenas frontend, mock estático).
> **Origem:** `sprints/PLANO_ACAO_EDICAO_RODADA_FRONTEND_ONLY.md` (commit `5f1070d`, 378 LOC, status **APROVADO**).
> **Substitui:** `PLANO_ACAO_EDICAO_RODADA.md` v1 (com integração backend — preservada como histórico).
> **Decisão estrutural:** single-route com tabs internas via `useState` (Opção B do plano §3). Migração futura para `useSearchParams` se necessário.
> **Backend status:** PATCH `/startup/{id}/rodada/{id}` continua com bugs no NestJS — escopo desta sprint é **FRONTEND-ONLY**.

---

## Objetivo da Sprint

Adicionar a aba **'Rodada'** em `/founder/startups/:id/edit` com 2 tabs internas (Captação + Distribuição). Mock estático — sem integração backend. **80% dos componentes já existem reusáveis** (round-terms, round-schedule, token-economics-calculator); apenas 4 novos arquivos de código são criados.

---

## Tarefas Planejadas

### Frontend (9 tasks)

- [ ] **T001** — Extrair schema Zod `app/lib/round-distribution-schema.ts` com 7 campos `recursosFundador..recursosCaixa` + superRefine validando `soma === 100`. Fonte canônica: `app/lib/new-startup-schema.ts:211-218` (campos) + `:253-270` (superRefine). (0.5h)
- [ ] **T002** — Componente `app/components/founder/reservation-status-card.tsx` (read-only, simplificado de `token-reservation.tsx`). Props: `{ status, paidAt?, valorPago? }`. Border-l-4 colorido + CheckCircle2/Loader2/XCircle. SEM botão de pagar. (1.0h)
- [ ] **T003** — Componente `app/components/founder/rodada-captacao-tab.tsx` (compõe RoundTerms + RoundSchedule + TokenEconomicsCalculator + ReservationStatusCard). Props: `{ startup: StartupDetail }`. Mocks via `useState`. (1.5h)
- [ ] **T004** ⚠️ — Componente `app/components/founder/rodada-distribuicao-tab.tsx` (**COMPLEXO** — 7 inputs nomeados + pill soma=100 + dirty + grid 2 colunas + EditSectionProps). Inspiração: `use-of-funds.tsx:58-79` (sumPct + dirty) — NÃO cópia direta (shape incompatível). (2.5h)
- [ ] **T005** — Rota `app/routes/private/edit-startup-rodada.tsx` (shell + tabs internas `useState<'captacao'|'distribuicao'>` + segmented control + TipCard aside + `useEditStartupForm()` mock handlers). (1.5h)
- [ ] **T006** — Adicionar `route('rodada', 'routes/private/edit-startup-rodada.tsx')` em `app/routes.ts` (children de `founder/startups/:id/edit`, após `bancario`). (0.2h)
- [ ] **T007** — Adicionar `{ label: 'Rodada', href: 'rodada', icon: Coins }` em `app/components/founder/edit-startup-nav.tsx` (posição 2 — entre Identidade e Time). (0.3h)
- [ ] **T008** — Atualizar `AGENTS.md` de `app/routes/private/` (renomear 'Founder (8 rotas)' → 'Founder (9 rotas)' + adicionar `edit-startup-rodada.tsx`) e `app/components/founder/` (adicionar 4 componentes na seção 'Identidade, banca, rodada, financeiro'). (0.5h)
- [ ] **T010** — Verificação visual + screenshot em `doc/screenshots/rodada-edit.png` (smoke test manual via `npm run dev`). (0.5h)

### Test (1 task)

- [ ] **T009** — Vitest para `app/lib/round-distribution-schema.ts` (6 cenários: soma=100 aceita, 99.99 rejeita, 100.01 rejeita, 0 rejeita, campo negativo rejeita, campo >100 rejeita). Cobertura ≥70%. (1.0h)

**Total: 10 tasks / 9.5h** (perfil lean, bem abaixo do limite de 80h).

---

## Componentes Reutilizados (NÃO duplicar — reusar)

| Componente | Modo | Função | LOC |
|---|---|---|---|
| `app/components/founder/round-terms.tsx` | `mode='edit'` + `defaults` mock | Meta (R$) + Equity (%) + Prazo (dias) | 208 |
| `app/components/founder/round-schedule.tsx` | edit | 3 datas (abertura/encerramento/liquidação) | 147 |
| `app/components/founder/token-economics-calculator.tsx` | `mode='edit'` + props mock | Readonly valuation (preço/tokens/valuation) | 89 |
| `app/components/founder/edit-startup-rail.tsx` | — | `TipCard` para aside | (export) |
| `app/components/founder/public-preview-card.tsx` | — | `PublicPreviewCard` para aside | (export) |
| `app/components/founder/_section-props.ts` | — | Tipos `EditSectionProps`, `SectionStatus`, `SectionStatusReporter`, `SectionResetRegistrar` | 15 |
| `app/lib/currency-format.ts` | — | `formatCurrencyInput`, `formatCurrencyBRL` | (helpers) |
| `app/lib/utils.ts` | — | `cn()` (clsx + tailwind-merge) | (helper) |
| `app/components/founder/edit-startup-nav.tsx` | modificar | Nav lateral (adicionar item Rodada) | 56 |

---

## Dependências (Grafo de Execução)

```
T001 ─┬─→ T002 ─→ T003 ─┐
      └─→ T004 ─────────┤
                        └─→ T005 ─┬─→ T006
                                  ├─→ T007
                                  ├─→ T008
                                  └─→ T010
      └─→ T009 ─────────────────┘  (paralelo)
```

- **T001** (schema) é fundamento — sem ele T002/T003/T004 não conseguem tipar props.
- **T009** (testes Vitest) é paralelo a T002-T04 e pode rodar em paralelo desde T001 concluído.
- **T005** (rota) compõe T03+T04.
- **T06/T07/T08** são pós-rota (registro, nav item, AGENTS.md).
- **T10** é smoke final após tudo.

---

## Acceptance Criteria (macro)

- [ ] Item "Rodada" visível no nav lateral de `/founder/startups/:id/edit` entre Identidade e Time, com ícone `Coins`
- [ ] `/founder/startups/:id/edit/rodada` renderiza sem erro (loader mock retorna dados)
- [ ] Tab "Captação" (default) mostra: RoundTerms + RoundSchedule + TokenEconomicsCalculator + ReservationStatusCard
- [ ] Tab "Distribuição" mostra 7 inputs nomeados (Fundador, Desenvolvimento, Comercial, Marketing, Nuvem, Jurídico, Reserva de Caixa) com sufixo %
- [ ] Pill no header da Tab Distribuição: **verde** "100/100" quando `Math.abs(sumPct-100) < 0.01`, **vermelho** "X/100" quando ≠ 100
- [ ] Tab Distribuição **NÃO permite submit** (pill indica erro) enquanto soma ≠ 100
- [ ] Action bar global: ao clicar "Salvar Alterações", dispara toast mock "Alterações salvas (mock)"
- [ ] Sem regressão nas 4 abas existentes (Identidade/Time/Documentos/Bancário)
- [ ] Visual consistente com `edit-startup-time` (cores neon `#d500f9`, glow background)
- [ ] `app/lib/round-distribution-schema.test.ts` passa todos os 6 cenários
- [ ] Typecheck + lint passam
- [ ] Dev server sobe sem warnings novos
- [ ] Cobertura ≥ 70% no novo schema (perfil Lean)
- [ ] AGENTS.md de `app/routes/private/` e `app/components/founder/` atualizados
- [ ] Screenshot capturado em `doc/screenshots/rodada-edit.png`

---

## Riscos Identificados

| # | Risco | Sev | Mitigação |
|---|---|---|---|
| R1 | Loader mock retorna "FinFlow" hardcoded — dados podem não bater com mocks da nova página | 🟡 Médio | Usar defaults HARDCODED na nova rota (não depender do loader para hidratar) |
| R2 | `EditSectionProps` com `registerReset` pode disparar discard que reseta state — comportamento indesejado em mock | 🟢 Baixo | **NÃO** implementar `registerReset` nas tabs mock (deixar `undefined`) — só implementar em T04 onde dirty é trivial |
| R3 | Reuso de `RoundTerms` no modo `edit` espera `defaults` no shape `RoundTermsValues` — incompatibilidade com mock | 🟡 Médio | Mockar `defaults` localmente com shape exato `{ metaCaptacao, equityOferecido, prazoCaptacao }` |
| R4 | Tabs internas via useState — F5 perde estado | 🟢 Baixo | Aceitável para protótipo. Migrar para `useSearchParams` se necessário |
| R5 | Pattern de tabs internas novo no codebase — pode divergir de convenções futuras | 🟢 Baixo | Documentar no AGENTS.md a decisão e justificativa (T08) |
| R6 | `use-of-funds.tsx` tem 250 LOC — copiar sua lógica parcialmente pode introduzir bugs | 🟡 Médio | Reusar padrão mas implementar fresh com 7 campos fixos (NÃO tentar reaproveitar o state dinâmico) |
| R7 | Schema Zod extraído pode ficar desatualizado em relação ao `complementaryStartupSchema` | 🟢 Baixo | Adicionar comentário JSDoc "MANTER SINCRONIZADO com complementaryStartupSchema se backend mudar" |

---

## Migração Futura (Pós-S24)

Quando o backend NestJS corrigir a rota `PATCH /startup/{id}/rodada/{id}`:

1. **S25 (backend)** — corrigir validação dos 7 campos + soma=100 no NestJS, retornar `RoundDistribution` tipado.
2. **S26 (frontend integration)** — substituir `useState` mock por `useMutation` (`useUpdateRoundDistributionMutation`), adicionar `roundQueryOptions` para GET, hidratar loader do `edit-startup-layout.tsx`.
3. **Cleanup** — remover toasts mock, ativar persistência real, opcionalmente migrar tabs internas para `useSearchParams` para deep-link.

---

## Referências

- **Plano detalhado aprovado:** [`sprints/PLANO_ACAO_EDICAO_RODADA_FRONTEND_ONLY.md`](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/sprints/PLANO_ACAO_EDICAO_RODADA_FRONTEND_ONLY.md) (378 LOC, commit `5f1070d`)
- **Sprint JSON:** [`sprints/S24-rodada-edit-frontend-only.json`](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/sprints/S24-rodada-edit-frontend-only.json)
- **Index atualizado:** [`sprints/index.json`](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/sprints/index.json) (S24 entry lines 67-110, commit `cd55072`)
- **Cross-sprint update:** [`sprints/cross-sprint.json`](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/sprints/cross-sprint.json) (S24 será adicionada como EXT-FLOW-S24 — sprint handoff)
- **RAG de padrões reutilizados:**
  - `app/lib/new-startup-schema.ts:211-218` (campos Zod) + `:253-270` (superRefine)
  - `app/components/founder/use-of-funds.tsx:58-79` (sumPct + dirty + pill)
  - `app/components/founder/current-metrics.tsx:62-80` (segmented control)
  - `app/routes/private/edit-startup-identidade.tsx` (route shell reference)
  - `app/components/founder/_section-props.ts` (EditSectionProps)

---

## Artefatos Produzidos (S24)

```
sprints/S24-rodada-edit-frontend-only/
├── SPRINT_PLAN.md                          ← este arquivo
└── tasks/
    ├── T001_PROMPT.md                      ← schema Zod extraído
    ├── T002_PROMPT.md                      ← reservation-status-card
    ├── T003_PROMPT.md                      ← rodada-captacao-tab
    ├── T004_PROMPT.md                      ← rodada-distribuicao-tab (COMPLEXO)
    ├── T005_PROMPT.md                      ← edit-startup-rodada rota
    ├── T006_PROMPT.md                      ← registrar rota em routes.ts
    ├── T007_PROMPT.md                      ← nav item
    ├── T008_PROMPT.md                      ← AGENTS.md
    ├── T009_PROMPT.md                      ← Vitest schema
    └── T010_PROMPT.md                      ← screenshot verificação
```

**Não produzidos nesta sprint:**
- Mudanças em `app/**` (escopo de planejamento — implementação é de responsabilidade do frontend agent na Fase 5)
- Mudanças em `.harness/state.json` ou `.harness/events.jsonl` (boundary explícito)
- BFFs em `app/routes/api/` (escopo FRONTEND-ONLY)
- Hooks TanStack novos (apenas `useState` local)

---

## Coexistência com S01 e S02

> ⚠️ **Importante — relação com sprints anteriores**:
>
> Esta sprint **NÃO deleta nem sobrescreve** artefatos de S01 ou S02. Coexistem lado a lado:
>
> - `sprints/S01-cnpj-alfanumerico/` (entregue, M1)
> - `sprints/S01-cnpj-alfanumerico.json`
> - `sprints/S02-m2-debts/` (planejada, M2)
> - `sprints/S02-m2-debts.json`
> - `sprints/S24-rodada-edit-frontend-only/` (esta sprint, M4)
> - `sprints/S24-rodada-edit-frontend-only.json`
>
> A regra é cumulativa: S24 **estende** o que existe (reusa componentes, adiciona rota, NÃO duplica schema).

---

## Path-Boundary Caveat

> ⚠️ **Decisão de localização:**
>
> O hook `path-boundary.ts` do opencode bloqueia writes em `.harness/sprints/**` para tools Write/Edit (DEBT-05 em `cross-sprint.json`). Padrão adotado em S01 e S02: artefatos criados em `sprints/` (raiz do projeto frontend). S24 segue este padrão.
>
> Conteúdo legado em `.harness/sprints/S01-cnpj-alfanumerico/` (esqueleto de 5 tasks desatualizadas, pré-S01 refino) deve ser apagado ou movido em housekeeping posterior — **NÃO** escopo desta sprint.