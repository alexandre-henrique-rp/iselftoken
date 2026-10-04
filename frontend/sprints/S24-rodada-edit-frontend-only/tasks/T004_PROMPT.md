---
id: "T004"
status: "pending"
type: "frontend"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "frontend"
estimatedEffort: 2.5
complexity: "complex"
dependencies: ["T001"]
---

# Task T004 ⚠️ — Componente `rodada-distribuicao-tab.tsx` (7 inputs + pill soma=100)

> ⚠️ **TASK COMPLEXA** — Esta é a única task do sprint S24 que precisa de micro-prompt expandido. Implementa a lógica de validação `soma === 100` com feedback visual em pill colorida, 7 inputs nomeados fixos, dirty tracking e integração com `EditSectionProps`.

## Contexto Arquitetural

**Por que 7 campos FIXOS (não array dinâmico)?**

O schema Zod `roundDistributionSchema` (T001) define **7 campos nomeados** (`recursosFundador..recursosCaixa`) — não é `.array()`. Isso é uma decisão arquitetural deliberada: a UI espelha exatamente o schema, com **labels fixos e conhecidos** ("Fundador", "Desenvolvimento", etc). Diferente de `use-of-funds.tsx` (que tem array dinâmico add/remove), este componente tem **estrutura estática** — mais simples, mais tipado, mais previsível.

**Inspiração (NÃO cópia):** `app/components/founder/use-of-funds.tsx:58-79` implementa a mesma lógica (`sumPct` via `useMemo`, `totalIsValid`, `dirty` derivado, pill colorida, `reportStatus`/`registerReset`). Vamos **adaptar** o padrão para 7 campos fixos — não tentar reaproveitar o state dinâmico (shape incompatível).

## Algoritmo de Validação (matemática + UI)

```typescript
const sumPct = useMemo(
  () =>
    state.recursosFundador +
    state.recursosDesenvolvimento +
    state.recursosComercial +
    state.recursosMarketing +
    state.recursosNuvem +
    state.recursosJuridico +
    state.recursosCaixa,
  [state],
);

const totalIsValid = Math.abs(sumPct - 100) < 0.01;
```

**Thresholds visuais:**

| `Math.abs(sumPct - 100)` | Pill | Cor | Ícone |
|---|---|---|---|
| `< 0.01` (i.e. soma === 100) | `"100/100"` | Verde (`bg-emerald-500/20 text-emerald-300`) | `CheckCircle2` |
| `>= 0.01` (i.e. soma ≠ 100) | `"X/100 ⚠️"` | Vermelho (`bg-rose-500/20 text-rose-300`) | `AlertCircle` |

## Wireframe ASCII

```
┌──────────────────────────────────────────────────────────┐
│  💰 Distribuição de Recursos              [100/100] ✅   │ ← pill verde
│     Como os R$ captados serão alocados?                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│   Fundador         [  30  ] %                            │
│   Desenvolvimento  [  25  ] %                            │
│   Comercial (Eq.)  [  15  ] %                            │
│   Marketing        [  10  ] %                            │
│   Nuvem            [   8  ] %                            │
│   Jurídico         [   7  ] %                            │
│   Reserva de Caixa [   5  ] %                            │
│   ─────────────────────────────────                      │
│   TOTAL              100 %    ✅ Soma válida              │ ← verde
└──────────────────────────────────────────────────────────┘

(quando soma ≠ 100:)
│   TOTAL               98 %    ⚠️ Soma deve = 100%        │ ← vermelho
```

## Pseudo-código (inspirado em `use-of-funds.tsx`)

```typescript
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import type { EditSectionProps } from "./_section-props";
import { roundDistributionSchema, type RoundDistributionInput } from "~/lib/round-distribution-schema";

const SECTION_ID = "round-distribution";

const DEFAULTS: RoundDistributionInput = {
  recursosFundador: 30,
  recursosDesenvolvimento: 25,
  recursosComercial: 15,
  recursosMarketing: 10,
  recursosNuvem: 8,
  recursosJuridico: 7,
  recursosCaixa: 5,
};

export function RodadaDistribuicaoTab({ reportStatus, registerReset }: EditSectionProps) {
  const initialRef = useRef<RoundDistributionInput>(DEFAULTS);
  const [state, setState] = useState<RoundDistributionInput>(() => DEFAULTS);

  const sumPct = useMemo(
    () => Object.values(state).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0),
    [state],
  );
  const totalIsValid = Math.abs(sumPct - 100) < 0.01;

  // dirty: compara initialRef vs state (todos os 7 campos)
  const dirty = (() => {
    let count = 0;
    (Object.keys(initialRef.current) as Array<keyof RoundDistributionInput>).forEach((k) => {
      if (state[k] !== initialRef.current[k]) count++;
    });
    return count;
  })();

  const filled = totalIsValid ? 1 : 0;
  const TOTAL = 1;

  useEffect(() => {
    reportStatus?.({ id: SECTION_ID, dirty, filled, total: TOTAL });
  }, [dirty, filled, reportStatus]);

  const resetSection = useCallback(() => setState(initialRef.current), []);
  useEffect(() => {
    if (!registerReset) return;
    registerReset(SECTION_ID, resetSection);
  }, [registerReset, resetSection]);

  const updateField = (field: keyof RoundDistributionInput, value: number) =>
    setState((prev) => ({ ...prev, [field]: value }));

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight italic">Distribuição de Recursos</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Como os R$ captados serão alocados?
          </p>
        </div>
        <span className={cn(
          "pill flex items-center gap-2",
          totalIsValid
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-rose-500/20 text-rose-300"
        )}>
          {totalIsValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {sumPct.toFixed(2)}/100
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELD_LABELS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {label}
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={state[key]}
                onChange={(e) => updateField(key, Number(e.target.value))}
                className="input-field !pr-10 text-lg font-black italic"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
        ))}
      </div>

      <footer className="flex items-center justify-between pt-4 border-t border-white/10">
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">TOTAL</span>
        <span className={cn(
          "flex items-center gap-2 text-lg font-black italic",
          totalIsValid ? "text-emerald-300" : "text-rose-300"
        )}>
          {sumPct.toFixed(2)} %
          {totalIsValid
            ? <><CheckCircle2 className="w-5 h-5" /> Soma válida</>
            : <><AlertCircle className="w-5 h-5" /> Soma deve = 100%</>}
        </span>
      </footer>
    </section>
  );
}

const FIELD_LABELS: Array<{ key: keyof RoundDistributionInput; label: string }> = [
  { key: "recursosFundador",       label: "Fundador" },
  { key: "recursosDesenvolvimento", label: "Desenvolvimento" },
  { key: "recursosComercial",       label: "Comercial (Equipe)" },
  { key: "recursosMarketing",       label: "Marketing" },
  { key: "recursosNuvem",           label: "Nuvem" },
  { key: "recursosJuridico",        label: "Jurídico" },
  { key: "recursosCaixa",           label: "Reserva de Caixa" },
];
```

## Lista EXATA dos 7 Labels (não inventar variações)

1. **Fundador** — `recursosFundador`
2. **Desenvolvimento** — `recursosDesenvolvimento`
3. **Comercial (Equipe)** — `recursosComercial`
4. **Marketing** — `recursosMarketing`
5. **Nuvem** — `recursosNuvem`
6. **Jurídico** — `recursosJuridico`
7. **Reserva de Caixa** — `recursosCaixa`

## Escopo Cirúrgico

### Paths allowlist (CRIAÇÃO)

- `app/components/founder/rodada-distribuicao-tab.tsx` (novo)

### Paths proibidos

- `app/components/founder/use-of-funds.tsx` (NÃO importar — apenas inspiração visual; shape incompatível)
- `app/lib/new-startup-schema.ts` (NÃO modificar — schema extraído em T001)
- `app/lib/round-distribution-schema.ts` (apenas consumir, NÃO modificar)
- `app/routes/**` (T005)

## Acceptance Criteria

- [ ] 7 inputs nomeados com labels exatos (Fundador, Desenvolvimento, Comercial (Equipe), Marketing, Nuvem, Jurídico, Reserva de Caixa)
- [ ] `sumPct` calculado via `useMemo` somando os 7 campos
- [ ] Pill **verde** `"100.00/100"` quando `Math.abs(sumPct - 100) < 0.01`, com ícone `CheckCircle2`
- [ ] Pill **vermelho** `"X.XX/100"` quando soma ≠ 100, com ícone `AlertCircle`
- [ ] Visual em `grid-cols-1 md:grid-cols-2` (mobile 1-col, desktop 2-col)
- [ ] Inputs com sufixo `%` visual (direita)
- [ ] `reportStatus({ id: 'round-distribution', dirty, filled: totalIsValid ? 1 : 0, total: 1 })`
- [ ] `registerReset` implementado: `registerReset(SECTION_ID, resetSection)`
- [ ] `dirty` derivado via comparação `initialRef.current` vs `state` (todos os 7 campos)
- [ ] Alerta textual no footer: verde "✅ Soma válida" OU vermelho "⚠️ Soma deve = 100%"
- [ ] `numero` type com `min={0} max={100} step={0.01}` (aceita decimais — para totalizar 100.00)
- [ ] `roundDistributionSchema.parse(state)` opcional em submit (T005 action bar) — não obrigatório no onChange
- [ ] `npm run typecheck` passa

## Ponteiros de Contexto

- **Inspiração visual e lógica:**
  - `app/components/founder/use-of-funds.tsx:58-79` (sumPct + dirty + pill + reportStatus) — NÃO importar, apenas copiar o padrão
  - `app/components/founder/use-of-funds.tsx:127-145` (header com pill + description)
- **Schema Zod consumido:** `app/lib/round-distribution-schema.ts` (T001)
- **Tipos:**
  - `EditSectionProps` de `app/components/founder/_section-props.ts`
  - `RoundDistributionInput` de `app/lib/round-distribution-schema.ts`
- **Helpers:**
  - `cn()` de `app/lib/utils.ts`
  - `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback` de `react`
- **Icons:** `CheckCircle2`, `AlertCircle` de `lucide-react`

## Notas de Implementação

- **Não usar `use-of-funds.tsx` diretamente** — o shape do state é incompatível (array dinâmico vs 7 campos fixos). Implementar fresh seguindo o mesmo padrão.
- **NÃO validar com Zod em cada onChange** — o custo de re-parse é desnecessário para feedback visual. Validação opcional só no submit (em T05).
- **Input `step={0.01}`** — permite decimais (e.g. `99.99`) que somem exatamente 100.00.
- **`Number.isFinite` no `sumPct`** — protege contra `NaN` se usuário apagar o input (vira string vazia → `NaN`).
- **`totalIsValid` com tolerância `0.01`** — aceita pequenas imprecisões de ponto flutuante (e.g. 33.33 + 33.33 + 33.34 = 100.00).

## Dependências

- **Bloqueia:** T005 (compõe esta tab na rota)
- **Bloqueada por:** T001 (schema Zod)

## Status Final Esperado

Arquivo `app/components/founder/rodada-distribuicao-tab.tsx` (~120 LOC) com 7 inputs nomeados + pill verde/vermelho + dirty tracking + registerReset. Typecheck verde. Visual idêntico ao wireframe ASCII acima.