# Plano de Ação — Edição de Rodada (FRONTEND-ONLY, sem backend)

**Data:** 2026-07-13
**Status:** AGUARDANDO APROVAÇÃO
**Versão:** 2.0 (escopo reduzido — backend não será tocado)
**Substitui:** `PLANO_ACAO_EDICAO_RODADA.md` (versão 1.0 com integração backend — preservada como histórico)

---

## 1. MUDANÇA DE ESCOPO

| Aspecto | Versão 1.0 (descartada) | Versão 2.0 (esta) |
|---|---|---|
| Integração backend | PATCH /rodada/{id}, GET /rodada/{id}, mut. resources | **Nenhuma — mocks locais** |
| BFFs novos | `startup.$id.rodada.$rodadaId.ts` (PATCH+GET), update resources | Nenhum |
| Hooks TanStack | 3 hooks novos (use-update, use-resources, use-round-query) | Nenhum — só `useState` |
| Schema Zod | Criar `round-update-schema.ts` | **Extrair 7 campos de `new-startup-schema.ts:211-218`** (já existe!) |
| Componentes novos | 6+ novos | **3 novos** (shell + 2 wrappers) |
| Tasks totais | 28 | **~10 tasks simples** |
| Estimativa | ~55h | **~8-12h** |
| Sprints | 5 (S19-S23) | **1 sprint (S24)** |

---

## 2. ACHADOS CRÍTICOS (componentes já existentes — 80% reutilizáveis!)

### 2.1. Schema Zod dos 7 campos FIXOS já existe

**Localização:** `app/lib/new-startup-schema.ts:204-279` (`complementaryStartupSchema`)

```ts
// Linhas 211-218 — fonte canônica dos 7 campos
recursosFundador: z.number().min(0).max(100),
recursosDesenvolvimento: z.number().min(0).max(100),
recursosComercial: z.number().min(0).max(100),
recursosMarketing: z.number().min(0).max(100),
recursosNuvem: z.number().min(0).max(100),
recursosJuridico: z.number().min(0).max(100),
recursosCaixa: z.number().min(0).max(100),

// Linhas 253-270 — superRefine validando soma=100
const total = data.recursosFundador + data.recursosDesenvolvimento +
              data.recursosComercial + data.recursosMarketing +
              data.recursosNuvem + data.recursosJuridico + data.recursosCaixa;
if (total !== 100) {
  ctx.addIssue({ path: ["recursosFundador"], message: "A soma dos recursos deve ser exatamente 100%. Total atual: ${total}%" });
}
```

**Ação:** EXTRAIR para `app/lib/round-distribution-schema.ts` (schema focado apenas nos 7 campos + superRefine — não importar o schema gigante de complementary).

### 2.2. Componentes REUTILIZÁVEIS como estão (zero modificação)

| Componente | O que faz | Status de reuso |
|---|---|---|
| `app/components/founder/round-terms.tsx` (208 LOC) | Form de meta + equity + prazo, 2 modos (edit/create), RHF, Zod interno, reportStatus/registerReset | ✅ **100% reusável** — usar modo `edit` com `defaults` mock |
| `app/components/founder/round-schedule.tsx` (147 LOC) | 3 datas (abertura/encerramento/liquidação), state local, validação de ordem | ✅ **100% reusável** |
| `app/components/founder/token-economics-calculator.tsx` (89 LOC) | Readonly: preço/tokens/valuation, 2 modos, props-driven | ✅ **100% reusável** com `tokenPrice` mock |
| `app/components/founder/token-reservation.tsx` (219 LOC) | UI completa de reserva (visual de card paid/pending) | ✅ **Reusar padrão visual**, simplificar para "status-only" (sem pay button) |
| `app/components/founder/edit-startup-layout.tsx` | Layout shell com header + nav + outlet + action bar | ✅ **Reusar como container** da nova rota (sub-rota filha) |
| `app/components/founder/_section-props.ts` | Tipos `EditSectionProps`, `SectionStatus`, `SectionStatusReporter`, `SectionResetRegistrar` | ✅ **100% reusável** |
| `app/components/founder/edit-startup-rail.tsx` | `TipCard`, `CompletenessCard` para aside | ✅ **100% reusável** |
| `app/components/founder/status-pills.tsx` | Pills de PlatformStatus + CampaignStatus | ✅ **100% reusável** |
| `app/lib/currency-format.ts` | `formatCurrencyInput`, `parseCurrencyInputToNumber`, `formatCurrencyBRL` | ✅ **100% reusável** |
| `app/lib/utils.ts` | `cn()` (clsx + tailwind-merge) | ✅ **100% reusável** |

### 2.3. Lógica REUTILIZÁVEL (extrair de `use-of-funds.tsx`)

`use-of-funds.tsx` (250 LOC) implementa exatamente o que precisamos:
- `sumPct` via `useMemo` reduzindo state
- `totalIsValid = Math.abs(sumPct - 100) < 0.01`
- Pill colorida no header (verde/vermelho)
- `dirty` derivado via `useRef(initialState)` + comparação manual
- `reportStatus` + `registerReset` (EditSectionProps)
- Alerta textual quando soma ≠ 100

**Diferença crucial:** `use-of-funds.tsx` trabalha com array DINÂMICO de categorias (add/remove linhas). O usuário pediu 7 campos FIXOS.

**Ação:** COPIAR a lógica de sumPct/dirty/reportStatus e ADAPTAR para 7 inputs nomeados. NÃO importar `use-of-funds.tsx` direto (shape incompatível). Criar `round-distribution-section.tsx` inspirado nele.

### 2.4. Pattern de tabs internas (referência: `current-metrics.tsx:62-80`)

Nenhuma rota do codebase tem tabs INTERNAS até agora — toda navegação é URL-based. Pattern mais próximo é `current-metrics.tsx` que faz toggle MRR/ARR com `useState`:

```tsx
const [view, setView] = useState<'mrr' | 'arr'>('mrr');
return (
  <div className="bg-background/60 border border-white/10 rounded-xl p-1 flex gap-1">
    <button onClick={() => setView('mrr')} className={cn(view === 'mrr' && 'bg-primary')}>MRR</button>
    <button onClick={() => setView('arr')} className={cn(view === 'arr' && 'bg-primary')}>ARR</button>
  </div>
);
```

**Ação:** Replicar esse pattern para "Captação | Distribuição" na nova rota.

---

## 3. DECISÃO ESTRUTURAL (frontend-only)

### Recomendação: OPÇÃO B — single-route com tabs internas via `useState`

```
/founder/startups/:id/edit/rodada
└── (componente único)
    ├── Header (EditStartupHeader via layout parent)
    ├── Nav (EditStartupNav via layout parent)
    ├── [Tabs internas: Captação | Distribuição]   ← NOVO
    │   ├── Tab Captação (rodada-captacao-tab.tsx)
    │   │   ├── RoundTerms (reusado)
    │   │   ├── RoundSchedule (reusado)
    │   │   └── ReservationStatusCard (NOVO, simplificado de token-reservation.tsx)
    │   └── Tab Distribuição (rodada-distribuicao-tab.tsx)
    │       ├── 7 inputs % nomeados (NOVO)
    │       └── Pill de validação soma=100 (NOVO)
    └── Aside (TipCard via edit-startup-rail)
```

**Justificativa:**
- O usuário pediu "somente a página" — implícito que sem persistência, então tabs internas bastam
- `useState` local é trivial e suficiente para mock
- ZERO novas rotas em `routes.ts` além do filho `/rodada`
- ZERO mudanças em action bar (handler único mock já existente)
- ZERO mudanças em context provider

**Migração futura:** se em algum momento for preciso deep-link, basta mover para `useSearchParams` ou criar sub-rotas (refactor de ~15 LOC).

---

## 4. ARQUIVOS

### 4.1. A CRIAR (4 arquivos)

| Arquivo | LOC estimado | Função |
|---|---|---|
| `app/routes/private/edit-startup-rodada.tsx` | ~50 | Shell da rota + tabs internas state + register handlers mock |
| `app/components/founder/rodada-captacao-tab.tsx` | ~80 | Tab Captação: compõe RoundTerms + RoundSchedule + ReservationStatusCard |
| `app/components/founder/rodada-distribuicao-tab.tsx` | ~120 | Tab Distribuição: 7 inputs nomeados + pill soma=100 |
| `app/components/founder/reservation-status-card.tsx` | ~60 | Card read-only de status da reserva (simplificado de token-reservation.tsx) |
| `app/lib/round-distribution-schema.ts` | ~30 | Zod schema focado com 7 campos + superRefine (extraído de new-startup-schema.ts:211-218,253-270) |

**Total: ~340 LOC novos**

### 4.2. A MODIFICAR (2 arquivos)

| Arquivo | Mudança | LOC diff |
|---|---|---|
| `app/routes.ts` | Adicionar `route('rodada', 'routes/private/edit-startup-rodada.tsx')` no children de `founder/startups/:id/edit` (linha 129) | +1 |
| `app/components/founder/edit-startup-nav.tsx` | Adicionar item `{ label: 'Rodada', href: 'rodada', icon: Coins }` no array `navItems` (posição 2) + import `Coins` | +3 |

**Total: ~4 LOC modificados**

### 4.3. ZERO modificações em:

- BFFs (todos)
- Hooks TanStack (todos)
- Schema Zod principal (apenas extrair para novo arquivo)
- `edit-startup-layout.tsx` (loader mock já serve)
- `edit-startup-action-bar.tsx` (handler único basta)
- `edit-startup-form-context.tsx` (já suporta onSave mock)
- `_section-props.ts` (já tem tudo)
- Componentes reusáveis (todos preservados)

---

## 5. ESTRUTURA INTERNA DAS TABS

### Tab Captação (`rodada-captacao-tab.tsx`)

```
┌─ Header ─────────────────────────────────────────┐
│ ℹ️  Captação                                     │
│     Configure os termos da rodada e visualize    │
│     o status da reserva de tokens.               │
└──────────────────────────────────────────────────┘

┌─ RoundTerms (reusado, mode='edit') ──────────────┐
│ Meta de Captação (R$) [input currency]           │
│ Equity Oferecido (%) [input number]              │
│ Prazo de Captação (dias) [60/90/120]            │
└──────────────────────────────────────────────────┘

┌─ RoundSchedule (reusado) ────────────────────────┐
│ Data de Abertura [date]                          │
│ Data de Encerramento [date]                      │
│ Data de Liquidação [date]                        │
└──────────────────────────────────────────────────┘

┌─ TokenEconomicsCalculator (reusado, mode='edit') ┐
│ Preço do Token | Tokens Estimados | Valuation   │
│ (readonly, calculado a partir de meta+equity)    │
└──────────────────────────────────────────────────┘

┌─ ReservationStatusCard (NOVO, read-only) ────────┐
│ ● Status: PAGO (verde) — 2026-07-10              │
│   [botão pagar reserva — disabled se já pago]    │
└──────────────────────────────────────────────────┘
```

### Tab Distribuição (`rodada-distribuicao-tab.tsx`)

```
┌─ Header + pill de validação ─────────────────────┐
│ 💰 Distribuição de Recursos            [100/100] │ ← pill verde
│     Como os R$ captados serão alocados?           │
└──────────────────────────────────────────────────┘

┌─ Grid 2 colunas (7 inputs nomeados) ────────────┐
│  Fundador         [ 30 ] %                       │
│  Desenvolvimento  [ 25 ] %                       │
│  Comercial (Eq.)  [ 15 ] %                       │
│  Marketing        [ 10 ] %                       │
│  Nuvem            [  8 ] %                       │
│  Jurídico         [  7 ] %                       │
│  Reserva de Caixa [  5 ] %                       │
│  ─────────────────────────────────               │
│  TOTAL              100 %    ✅ Soma válida       │ ← verde
└──────────────────────────────────────────────────┘

(quando soma ≠ 100:)
│  TOTAL               98 %    ⚠️ Soma deve = 100% │ ← vermelho
```

---

## 6. BACKLOG (S24 — única sprint)

### T01 — Schema Zod extraído [Simples]
**Criar** `app/lib/round-distribution-schema.ts`:
- 7 campos `recursos*` (copiar de `new-startup-schema.ts:211-218`)
- `superRefine` validando soma=100 (copiar de `new-startup-schema.ts:253-270`)
- Exportar tipo `RoundDistributionInput` (z.infer)

### T02 — Componente `ReservationStatusCard` [Simples]
**Criar** `app/components/founder/reservation-status-card.tsx`:
- Props: `{ status: 'PAGO' | 'AGUARDANDO' | 'CANCELADO', paidAt?: string, valorPago?: number }`
- Visual read-only inspirado em `token-reservation.tsx:128-139` (paid) e `:142-217` (pending)
- Border-l-4 colorido (verde/amarelo/vermelho)
- CheckCircle2 / Loader2 / XCircle icons
- SEM botão de pagar (versão pura de status)

### T03 — Componente `rodada-captacao-tab.tsx` [Médio]
**Criar**:
- Props: `{ startup: StartupDetail }` (do loader do layout)
- Reusa: `<RoundTerms defaults={...} mode="edit" reportStatus={...} />`
- Reusa: `<RoundSchedule defaults={...} reportStatus={...} />`
- Reusa: `<TokenEconomicsCalculator mode="edit" meta={...} equity={...} tokenPrice={...} />`
- Reusa: `<ReservationStatusCard status={...} paidAt={...} />` (T02)
- Mocks locais via `useState` (defaults = valores do `StartupDetail` mock)

### T04 — Componente `rodada-distribuicao-tab.tsx` [Complexo]
**Criar**:
- Props: `{ startup: StartupDetail }`
- 7 inputs nomeados (recursosFundador...recursosCaixa)
- State local: `useState<{...}>`
- Cálculo: `sumPct = recursosFundador + ... + recursosCaixa` (useMemo)
- `totalIsValid = Math.abs(sumPct - 100) < 0.01`
- Pill no header: verde se válido, vermelho se não
- Validação Zod opcional no submit (extra de T01)
- Visual: grid 2 colunas (mobile 1-col), inputs com sufixo %
- Inspiração: `use-of-funds.tsx:58-79` (lógica sumPct + dirty)
- reportStatus + registerReset (EditSectionProps)

### T05 — Rota `edit-startup-rodada.tsx` [Simples]
**Criar**:
- `meta({})` com título "Rodada | Editar Startup | iSelfToken"
- Loader opcional: reusa `useRouteLoaderData("routes/private/edit-startup-layout")` para obter `startup`
- `useState<'captacao' | 'distribuicao'>('captacao')`
- Renderiza segmented control (pattern `current-metrics.tsx:62-80`)
- Renderiza `<RodadaCaptacaoTab startup={startup} />` ou `<RodadaDistribuicaoTab startup={startup} />`
- Aside: `<TipCard>` + `<PublicPreviewCard>` (reusa)
- Registra handlers no `useEditStartupForm()`:
  ```ts
  registerHandlers({
    onSave: () => toast.success("Alterações salvas (mock)"),
    onDiscard: () => toast.info("Alterações descartadas")
  });
  ```

### T06 — Registrar rota em `routes.ts` [Simples]
**Modificar** `app/routes.ts:129`:
- Adicionar `route('rodada', 'routes/private/edit-startup-rodada.tsx')` no array de children
- Manter ordem após `bancario` (último item)

### T07 — Adicionar nav item [Simples]
**Modificar** `app/components/founder/edit-startup-nav.tsx`:
- Importar `Coins` de `lucide-react`
- Inserir no array `navItems` posição 2: `{ label: 'Rodada', href: 'rodada', icon: Coins }`

### T08 — Atualizar AGENTS.md [Simples]
**Modificar**:
- `app/routes/private/AGENTS.md`: adicionar `edit-startup-rodada.tsx` na seção "Founder (8 rotas)" → renomear para "Founder (9 rotas)"
- `app/components/founder/AGENTS.md`: adicionar 3 novos componentes na seção "Identidade, banca, rodada, financeiro"

### T09 — Testes Vitest [Simples]
**Criar**:
- `app/lib/round-distribution-schema.test.ts`:
  - soma=100 → OK
  - soma=99.99 → erro
  - soma=100.01 → erro
  - soma=0 → erro
  - campo negativo → erro
  - campo >100 → erro

### T10 — Verificação visual [Simples]
**Manual**:
- Iniciar dev server
- Navegar até `/founder/startups/:id/edit/rodada` (loader retorna FinFlow mock)
- Verificar: nav tem 5 itens, tabs funcionam, pill soma funciona visualmente
- Capturar screenshot em `/doc/screenshots/rodada-edit.png`

---

## 7. CRITÉRIOS DE ACEITE

- [ ] Item "Rodada" visível no nav lateral de `/founder/startups/:id/edit` entre Identidade e Time, com ícone Coins
- [ ] `/founder/startups/:id/edit/rodada` renderiza sem erro (loader mock retorna dados)
- [ ] Tab "Captação" (default) mostra: RoundTerms + RoundSchedule + TokenEconomicsCalculator + ReservationStatusCard
- [ ] Tab "Distribuição" mostra 7 inputs nomeados com sufixo %
- [ ] Pill no header da Tab Distribuição: **verde** "100/100" quando soma=100, **vermelho** "98/100" quando ≠ 100
- [ ] Tab Distribuição NÃO permite submit (botão Salvar desabilitado) enquanto soma ≠ 100
- [ ] Action bar global: ao clicar "Salvar Alterações", dispara toast mock "Alterações salvas (mock)"
- [ ] Sem regressão nas 4 abas existentes (Identidade/Time/Documentos/Bancário)
- [ ] Visual consistente com `edit-startup-time` (cores neon #d500f9, glow background)
- [ ] `app/lib/round-distribution-schema.test.ts` passa todos os 6 cenários
- [ ] Typecheck + lint passam
- [ ] Dev server sobe sem warnings novos
- [ ] Cobertura ≥ 70% no novo schema (Lean)

---

## 8. RISCOS

| # | Risco | Sev | Mitigação |
|---|---|---|---|
| R1 | Loader mock retorna "FinFlow" hardcoded — dados podem não bater com mocks da nova página | 🟡 Médio | Usar defaults HARDCODED na nova rota (não depender do loader para hidratar) |
| R2 | EditSectionProps com `registerReset` pode disparar discard que reseta state — comportamento indesejado em mock | 🟢 Baixo | Não implementar `registerReset` nas tabs mock (deixar undefined) |
| R3 | Reuso de `RoundTerms` no modo `edit` espera `defaults` no shape `RoundTermsValues` — incompatibilidade com mock | 🟡 Médio | Mockar `defaults` localmente com shape exato `{ metaCaptacao, equityOferecido, prazoCaptacao }` |
| R4 | Tabs internas via useState — F5 perde estado | 🟢 Baixo | Aceitável para protótipo. Migrar para useSearchParams se necessário |
| R5 | Pattern de tabs internas novo no codebase — pode divergir de convenções futuras | 🟢 Baixo | Documentar no AGENTS.md a decisão e justificativa |
| R6 | `use-of-funds.tsx` tem 250 LOC — copiar sua lógica parcialmente pode introduzir bugs | 🟡 Médio | Reusar padrão mas implementar fresh com 7 campos fixos (não tentar reaproveitar o state dinâmico) |
| R7 | Schema Zod extraído pode ficar desatualizado em relação ao `complementaryStartupSchema` | 🟢 Baixo | Adicionar comentário "MANTER SINCRONIZADO com complementaryStartupSchema se backend mudar" |

---

## 9. ESTIMATIVA CONSOLIDADA

| Tasks | Horas | Complexidade |
|---|---|---|
| T01 (schema Zod) | 0.5h | Simples |
| T02 (status card) | 1h | Simples |
| T03 (captacao tab) | 1.5h | Médio |
| T04 (distribuicao tab) | 2.5h | **Complexo** (lógica sumPct + 7 inputs) |
| T05 (rota shell) | 1.5h | Simples |
| T06 (routes.ts) | 0.2h | Simples |
| T07 (nav item) | 0.3h | Simples |
| T08 (AGENTS.md) | 0.5h | Simples |
| T09 (testes Vitest) | 1h | Simples |
| T10 (verificação visual) | 0.5h | Simples |
| **TOTAL** | **~9.5h** | **1 complexa** (T04) |

**T04 é a única que precisa de micro-prompt formal.** Restante pode ser delegado inline.

---

## 10. PRÓXIMOS PASSOS

Após aprovação, vou:

1. **Aprovar Sprint S24** via `harness_advance` com `userApproval: true`
2. **Delegar para sub-agents:**
   - `sprint-tasker` → gerar `frontend/sprints/S24.json` + `T01_PROMPT.md` ... `T10_PROMPT.md`
   - `frontend` (Phase 5 worker) → executar T01-T10 sequencialmente
   - `tester` (Phase 5 worker) → executar T09 (Vitest)
   - `qa-gate` (Phase 5 portão final) → validar build + tests
3. **Transicionar para Phase 6 (UX Gate)** pedindo aprovação humana do screenshot final

**Aguardando aprovação do plano para prosseguir.**