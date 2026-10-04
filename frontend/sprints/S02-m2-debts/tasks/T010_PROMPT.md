---
id: "T010"
status: "pending"
type: "test"
sprint: "S02-m2-debts"
milestone: "M2"
owner: "tester"
estimatedEffort: 3
dependencies: ["T009"]
priority: "critical"
---

# Task T010 — Atualizar testes T007 (fixtures com DVs validados + cobertura ≥80%)

## Contexto

- **Por que esta task existe:** S01 (T007) entregou a primeira suíte Vitest do projeto, com cobertura de 87.39% global. Mas as fixtures de `cnpj-alfanumerico-valid.ts` usavam **DV placeholder `00`** — placeholder porque o algoritmo oficial ainda não tinha sido lido (RAG v1). Hoje (junho/2026), a RFB publicou o manual e T009 implementou o algoritmo. As fixtures agora podem (e devem) usar **DVs reais** calculados contra o manual. Adicionalmente, faltam casos negativos (CNPJ com DV inválido) e o teste que esperava o warn `pending-manual-dv-review` precisa ser reformulado (T009 removeu a flag).
- **Profile:** lean — cobertura mínima **70%** (meta **80%** em `new-startup-schema.ts` alinhada com S01 thresholds).
- **Cuidado LGPD:** fixtures são **públicas** (estarão em git). Zero CNPJ real. Usar DVs do manual + algoritmo determinístico + (se possível) Simulador oficial.

---

## Capability Grant (escopo desta task)

- **Paths allowlist (CRIAÇÃO):**
  - `app/lib/__tests__/fixtures/cnpj-alfanumerico-invalid.ts` (novo — fixture de CNPJs com DV propositalmente errado)
- **Paths allowlist (MODIFICAÇÃO):**
  - `app/lib/__tests__/fixtures/cnpj-alfanumerico-valid.ts` (substituir DVs placeholder `00` por DVs calculados)
  - `app/lib/__tests__/new-startup-schema.test.ts` (reformular suíte para a API de T009)
  - `app/lib/__tests__/cnpj-format.test.ts` (estender com casos alfanuméricos se ainda não cobertos; opcional)
- **Paths allowlist (LEITURA):**
  - `app/lib/new-startup-schema.ts` (especialmente após T009: `charValue`, `computeDv`, `cnpjAlfanumericoValidator`)
  - `app/lib/__tests__/fixtures/cnpj-alfanumerico-valid.ts` (versão S01 a ser substituída)
  - `app/lib/__tests__/new-startup-schema.test.ts` (versão S01 a ser reformulada)
  - `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` v2 §4.1-4.5
  - `/tmp/opencode/manual-dv.txt` (snapshot literal — calcular DVs das fixtures)
  - `test/vitest.config.ts` (configuração de coverage existente)
- **Paths proibidos (NÃO TOCAR):**
  - `app/lib/new-startup-schema.ts` (escopo T009 — não mexer)
  - `app/routes/**`, `app/components/**`, `app/lib/cnpj-format.ts`, `app/lib/mask-utils.ts`, `app/lib/banking-schema.ts`
  - `package.json`, `test/vitest.config.ts`, `test/vitest.setup.ts` (não ajustar config nesta task — S01 já está rodando)
  - `sprints/**` (exceto `S02-m2-debts/tasks/T010_PROMPT.md` que é esta task)
  - `coverage/**` (gerado por vitest)
  - `.harness/state.json`, `.harness/events.jsonl`

---

## Descrição

### Parte A — Gerar fixtures com DVs reais

**Estratégia primária:** calcular DVs localmente via `computeDv()` (exportada de `app/lib/new-startup-schema.ts` em T009) e validar contra o exemplo do manual + algoritmo determinístico.

**Estratégia secundária (preferida se webfetch for viável):** usar o **Simulador oficial** ([https://www.gov.br/pt-br/servicos/simulador-cnpj-alfanumerico](https://www.gov.br/pt-br/servicos/simulador-cnpj-alfanumerico)) — durante a execução de T010, tentar `npx playwright` ou curl para gerar 3+ CNPJs oficiais. Se falhar (timeout, rede bloqueada), documentar no header da fixture e seguir com a estratégia local.

### Parte B — Substituir `cnpj-alfanumerico-valid.ts`

**Arquivo atual (`S01`):**

```typescript
/**
 * Fixtures de CNPJs alfanuméricos válidos gerados pelo Simulador oficial da RFB.
 *
 * ATENÇÃO: os DVs são placeholders (00) porque o algoritmo real do DV depende do
 * manual técnico oficial (IN RFB 2.229/2024). Substituir após leitura do
 * manual-dv-cnpj.pdf.
 */
export const CNPJ_ALFANUMERICO_RAW: readonly string[] = [
  "AB12C3DE45F600", // exemplo com 3 letras no radical
  "12AB3CDE45F600", // exemplo com 3 letras intercaladas
  "ABCD1234567800", // exemplo com 4 letras no início
] as const;

export const CNPJ_ALFANUMERICO_MASKED: readonly string[] = [
  "AB.12C.3DE/45F6-00",
  "12.AB3.CDE/45F6-00",
  "AB.CD1.234/5678-00",
] as const;
```

**Substituir por (referência — valores a calcular via `computeDv()`):**

```typescript
/**
 * Fixtures de CNPJs alfanuméricos válidos com DVs calculados via algoritmo
 * oficial (manual serpro.gov.br / IN RFB 2.229/2024). Substitui os placeholders
 * de S01 (DV=00) que dependiam da leitura do manual-dv-cnpj.pdf.
 *
 * Metodologia:
 *   1. Para cada radical candidato, calcular DV1 + DV2 via computeDv() (T009).
 *   2. Conferir os DVs manualmente aplicando a fórmula contra o exemplo do
 *      manual RAG v2 §4.3/§4.4 ("12.ABC.345/01DE" → DV1=3, DV2=5 → "35").
 *   3. Validar adicionalmente via Simulador oficial se acessível via webfetch.
 *
 * LGPD-safe: CNPIs gerados algoritmicamente para fins de teste. Não são CNPJs
 * reais.
 *
 * @see .harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md §4.1-4.5
 * @see /tmp/opencode/manual-dv.txt
 * @see https://www.gov.br/pt-br/servicos/simulador-cnpj-alfanumerico (pendência de confirmação)
 */

import { computeDv } from "~/lib/new-startup-schema";

// Helper local para gerar entradas RAW + MASKED pareadas a partir de uma raiz.
function cnpj(radical: string): { raw: string; masked: string } {
  const dv = computeDv(radical); // 2 dígitos
  const raw = `${radical}${dv}`;
  const masked = `${radical.slice(0, 2)}.${radical.slice(2, 5)}.${radical.slice(5, 8)}/${radical.slice(8, 12)}-${dv}`;
  return { raw, masked };
}

// Exemplo literal do manual (12.ABC.345/01DE → -35):
const exemploManual = cnpj("12ABC34501DE"); // dv === "35"

// Variações representativas (escolher raízes DIFERENTES para cobrir casos de borda):
const variacaoA = cnpj("AB12C3DE45F6"); // 3 letras dispersas
const variacaoB = cnpj("12345ABCDE67"); // letras concentradas
const variacaoC = cnpj("ABCDEFGHIJKL"); // raiz toda letras
const variacaoD = cnpj("000000000000"); // raiz toda zeros — edge case
const variacaoE = cnpj("ZZZZZZZZZZZZ"); // raiz toda Z — edge case (valor ASCII 42)

export const CNPJ_ALFANUMERICO_RAW: readonly string[] = [
  exemploManual.raw,
  variacaoA.raw,
  variacaoB.raw,
  variacaoC.raw,
  variacaoD.raw,
  variacaoE.raw,
] as const;

export const CNPJ_ALFANUMERICO_MASKED: readonly string[] = [
  exemploManual.masked,
  variacaoA.masked,
  variacaoB.masked,
  variacaoC.masked,
  variacaoD.masked,
  variacaoE.masked,
] as const;

/**
 * CNPJs numéricos legados (compatibilidade reversa — algoritmo cobre os dois).
 * Pelo menos 1 deles deve ter DV `00` (quando o cálculo resulta em zero
 * em ambos os DVs — edge case do módulo 11).
 */
export const CNPJ_LEGADO: readonly string[] = [
  "12345678000190", // caso clássico — confirmá-lo via computeDv('123456780001') === "90"
  // ... gerar mais 2-3 raízes, calcular DV via computeDv() e adicionar
] as const;

export const CNPJ_LEGADO_MASKED: readonly string[] = CNPJ_LEGADO.map((raw) =>
  `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`,
) as unknown as readonly string[];
```

> **Importante:** os DVs reais (`computeDv(radical12)`) **devem ser conferidos** durante a task, ideally rodando `node --input-type=module -e "import { computeDv } from './app/lib/new-startup-schema.ts'"` ou via um script Playwright/Vitest descartável.

### Parte C — Criar `cnpj-alfanumerico-invalid.ts` (NOVO)

```typescript
/**
 * Fixtures de CNPJs com DV propositalmente INVÁLIDO para testes de rejeição.
 *
 * Metodologia:
 *   1. Pegar cada CNPJ válido de cnpj-alfanumerico-valid.ts.
 *   2. Modificar 1 dos 2 dígitos verificadores para um valor DIFERENTE
 *      do calculado (não trocar os 2 — basta 1 para reprovar).
 *   3. Formatar com a máscara canônica.
 *
 * Garante que cnpjAlfanumericoValidator emite ctx.addIssue com code: 'custom'
 * e message contendo "Dígito verificador".
 *
 * LGPD-safe: DVs errados são derivados deterministicamente.
 */

import { CNPJ_ALFANUMERICO_MASKED, CNPJ_LEGADO_MASKED } from "./cnpj-alfanumerico-valid";

function estragaDv(cnpjMasked: string, dvErrado: string): string {
  // Substitui os 2 últimos dígitos (após o hífen) pelos DVs errados.
  const prefixo = cnpjMasked.slice(0, -2);
  return `${prefixo}${dvErrado}`;
}

export const CNPJ_ALFANUMERICO_INVALIDO_MASKED: readonly string[] = [
  // Pegar 3+ dos válidos e modificar DV
  estragaDv(CNPJ_ALFANUMERICO_MASKED[0], "99"),
  estragaDv(CNPJ_ALFANUMERICO_MASKED[1], "00"),
  estragaDv(CNPJ_ALFANUMERICO_MASKED[2], "11"),
  // Herdar 2+ do legado modificado
  estragaDv(CNPJ_LEGADO_MASKED[0], "00"),
] as const;
```

### Parte D — Reformular `new-startup-schema.test.ts`

**Versão S01 (1 teste para `pending-manual-dv-review` — substituir):**

```typescript
// REMOVER este teste:
it("cnpjAlfanumericoValidator deve emitir console.warn para CNPJ alfanumérico", () => { ... });
```

**Substituir/adicionar:**

```typescript
it("deve aceitar cada CNPJ alfanumérico válido (DV calculado pelo algoritmo)", () => {
  CNPJ_ALFANUMERICO_MASKED.forEach((cnpj) => {
    const result = newStartupSchema.safeParse({ ... });
    expect(result.success).toBe(true);
  });
});

it("deve aceitar cada CNPJ legado válido (DV calculado pelo mesmo algoritmo)", () => {
  CNPJ_LEGADO_MASKED.forEach((cnpj) => {
    const result = newStartupSchema.safeParse({ ... });
    expect(result.success).toBe(true);
  });
});

it("deve rejeitar CNPJ alfanumérico com DV inválido", () => {
  CNPJ_ALFANUMERICO_INVALIDO_MASKED.forEach((cnpj) => {
    const result = newStartupSchema.safeParse({ cnpj, /* ...campos mínimos */ });
    expect(result.success).toBe(false);
    if (!result.success) {
      const cnpjIssue = result.error.issues.find((i) => i.path[0] === "cnpj");
      expect(cnpjIssue?.message).toMatch(/verificador/i);
    }
  });
});

it("cnpjAlfanumericoValidator NÃO emite mais warn 'pending-manual-dv-review'", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  newStartupSchema.safeParse({ ...cnpj: CNPJ_ALFANUMERICO_MASKED[0] });
  // Filtrar warns por conteúdo da string
  const pendingWarn = warnSpy.mock.calls.filter(
    (call) => typeof call[0] === "string" && call[0].includes("pending-manual-dv-review"),
  );
  expect(pendingWarn).toHaveLength(0);
  warnSpy.mockRestore();
});

it("exemplo do manual (12.ABC.345/01DE-35) é aceito", () => {
  const result = newStartupSchema.safeParse({ ..., cnpj: "12.ABC.345/01DE-35" });
  expect(result.success).toBe(true);
});
```

**Silenciar `console.warn` em `beforeEach`** (defesa contra warns legados):

```typescript
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
```

### Parte E — Adicionar testes em `cnpj-format.test.ts` (opcional)

Adicionar (se ainda não cobertos):

```typescript
describe("getAlphanumeric (reforço)", () => {
  it("deve aceitar 14 chars alfanuméricos como input completo válido", () => {
    expect(getAlphanumeric("AB12C3DE45F678")).toBe("AB12C3DE45F678");
  });
});
```

### Parte F — Verificação final

```bash
npm run test -- --config test/vitest.config.ts --coverage 2>&1 | tee coverage/s02-t010.log
```

**Esperado:**

1. Suíte completa passa (testes S01 + novos T010).
2. `new-startup-schema.ts`: **≥80% linhas** e **≥80% funções** (perfil lean aceita 70%; target 80% é meta recomendada, alinhada com S01 thresholds).
3. ZERO `pending-manual-dv-review` em código de teste (`grep`).

---

## Acceptance Criteria

- [ ] Suíte completa `npm run test` passa (55+ testes prévios + novos)
- [ ] Cobertura em `app/lib/new-startup-schema.ts` ≥80% (linhas E funções). V8 report via `npm run test:coverage`.
- [ ] `app/lib/__tests__/fixtures/cnpj-alfanumerico-invalid.ts` existe e exporta ≥3 CNPJs com DV errado
- [ ] `app/lib/__tests__/fixtures/cnpj-alfanumerico-valid.ts` substituiu placeholder — DVs `00` foram substituídos por DVs reais calculados via `computeDv()` (executável, conferir manualmente 2-3)
- [ ] Pelo menos 1 fixture alfanumérica é o **exemplo literal do manual** (`12.ABC.345/01DE-35`)
- [ ] Pelo menos 1 fixture tem raiz **toda letras** (`ABCDEFGHIJKL` ou similar) para cobrir edge case do algoritmo
- [ ] Pelo menos 1 fixture tem raiz **toda zeros** (`000000000000` ou similar) para cobrir borda do módulo 11 (DV pode ser `00`)
- [ ] Pelo menos 1 fixture tem raiz **toda Z** (`ZZZZZZZZZZZZ` ou similar) para cobrir borda do ASCII (`'Z'.charCodeAt(0) - 48 === 42`)
- [ ] `app/lib/__tests__/new-startup-schema.test.ts` reformulado contém os 4 testes novos (aceita DV válido alfanumérico + aceita DV válido legado + rejeita DV inválido + NÃO emite warn `pending-manual-dv-review`)
- [ ] Teste antigo "cnpjAlfanumericoValidator deve emitir console.warn para CNPJ alfanumérico" foi **removido** (não coexiste com o novo)
- [ ] `grep -rn 'pending-manual-dv-review' app/lib/__tests__/` retorna vazio
- [ ] ZERO `expect(cnpj).toBe(<literal CNPJ real>)` — apenas com DVs do manual ou fixtures locais determinísticas (LGPD)
- [ ] `beforeEach` silencia `console.warn` globalmente em `new-startup-schema.test.ts`
- [ ] Mock de `console.warn` é restaurado após cada teste (`mockRestore` em cleanup)
- [ ] Git: commit `test(s02/t010): fixtures com DV calculado + testes de aceita/rejeita`

---

## Micro-SPEC (trecho relevante)

### RAG §4.5 item 4 — Validação cruzada em testes
> *"Usar o Simulador oficial de CNPJ Alfanumérico como ground truth para gerar casos de teste (numérico legado, alfanumérico com 1 letra, com várias letras, edge cases de DV=0 etc.)."*

### S01/T007 (referência da estrutura)
- `vitest.config.ts` em `test/vitest.config.ts` — adicionar `setupFiles` ainda aponta para `./test/vitest.setup.ts`
- `vitest.setup.ts` — matchers do jest-dom
- Coverage threshold mínimo: 70% linhas/funções/stmts, 60% branches

### LGPD-safe (RAG §6 + briefing)
- Fixtures em git são públicas
- ZERO CNPJ real em testes
- CNPIs de teste: derivados do manual, algoritmo determinístico, ou Simulador oficial

---

## LGPD / Compliance

- **Fixtures são públicas (git).** Usar APENAS DVs do manual + algoritmo determinístico local ou do Simulador oficial.
- **ZERO CNPJ real.** Validar com: `grep -E '<conteudo real>' app/lib/__tests__/fixtures/` (sem acesso a CNPJs reais no projeto).
- Se algum teste quebrar com mensagem de erro contendo o CNPJ em claro, mudar a mensagem para `"<CNPJ>"` (placeholder) e logar o tipo de erro, não o valor.

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** inventar CNPIs sem calcular DV — usar `computeDv()` para todos
- ❌ **NÃO** manter DVs `00` como placeholder em fixtures (legacy) — substituir TODOS
- ❌ **NÃO** usar CNPJs reais em testes
- ❌ **NÃO** usar `toMatchSnapshot` para CNPJ (assertions explícitas)
- ❌ **NÃO** misturar dois testes em um (`it("...")` deve cobrir 1 comportamento)
- ❌ **NÃO** deixar `console.warn` escapar em testes — `beforeEach` silencia + `mockRestore` no fim
- ❌ **NÃO** aumentar `coverage.thresholds` para 100% — perfil lean aceita 70%; target 80% é meta alinhada com S01
- ❌ **NÃO** deletar arquivos `.test.ts` pré-existentes
- ❌ **NÃO** alterar `test/vitest.config.ts` ou `test/vitest.setup.ts` (configuração é imutável aqui)
- ❌ **NÃO** commitar com mensagem vaga tipo "tests" — usar `test(s02/t010): <escopo>`
- ❌ **NÃO** criar arquivos em paths fora de `app/lib/__tests__/`

## Ponteiros de Contexto

- **RAG:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` v2 §4.5 item 4 (validação cruzada).
- **Manual PDF (snapshot):** `/tmp/opencode/manual-dv.txt` — calcular DVs das fixtures.
- **Vitest config:** `test/vitest.config.ts` — `coverage.include` lista `new-startup-schema.ts` desde S01.
- **Tarefa anterior:** S01/T007 (estrutura de testes criada).
- **Helper exportado por T009:** `computeDv(radical12: string): string` em `app/lib/new-startup-schema.ts`.

## Dependências

- **Upstream:** T009 (API final do validator + helper `computeDv` exportado).
- **Downstream:** nenhuma (suíte final desta sprint).

## Status Final Esperado

Suíte Vitest ampliada com fixtures reescritas (DVs calculados via `computeDv()`) + fixture nova de CNPIs inválidos + 4+ testes novos no `new-startup-schema.test.ts`. Cobertura ≥80% em `new-startup-schema.ts`. `pending-manual-dv-review` completamente removido do código de teste. `npm run test:coverage` verde.
