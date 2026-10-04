---
id: "T009"
status: "pending"
type: "frontend"
sprint: "S02-m2-debts"
milestone: "M2"
owner: "frontend"
estimatedEffort: 4
dependencies: ["T008"]
priority: "critical"
---

# Task T009 — DV completo do CNPJ Alfanumérico (substituir placeholder)

## Contexto

- **Por que esta task existe:** S01 entregou a regex e a máscara, mas o `cnpjAlfanumericoValidator` ficou como **placeholder soft** (`pending-manual-dv-review`) — aceitava qualquer CNPJ alfanumérico com forma correta + warn no console. Em **junho/2026**, a RFB republicou o manual oficial de cálculo do DV (`manual-dv-cnpj.pdf`, hospedado em serpro.gov.br). Texto extraído em `/tmp/opencode/manual-dv.txt` (4 páginas). Algoritmo transcrito para `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` v2 §4.1-4.5.
- **DEBT-DV-001 (state.json):** `{"status": "documented-ready-for-impl", "scope": "app/lib/new-startup-schema.ts cnpjAlfanumericoValidator", "ragRef": "§4.1-4.4"}` — esta task fecha.
- **Profile:** lean — Direct Coding. Coverage mínimo **70%**.
- **Cuidado LGPD:** se precisar logar em dev (verificações de borda), usar SHA-256 hash + masked, **nunca** CNPJ em claro.

---

## Capability Grant (escopo desta task)

- **Paths allowlist (MODIFICAÇÃO):**
  - `app/lib/new-startup-schema.ts` (somente as **funções/helpers** + `cnpjAlfanumericoValidator` em ~linhas 14-60)
- **Paths allowlist (LEITURA):**
  - `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (v2 §4.1-4.5 — algoritmo oficial)
  - `/tmp/opencode/manual-dv.txt` (snapshot do PDF oficial)
  - `app/lib/cnpj-format.ts` (helper `getAlphanumeric`)
  - `app/lib/__tests__/fixtures/cnpj-alfanumerico-valid.ts` (placeholders atuais — referência para a reescrita em T010)
- **Paths proibidos (NÃO TOCAR):**
  - `app/lib/new-startup-schema.ts:226-229` (escopo de T008 — errorMap)
  - `app/lib/new-startup-schema.ts:100-149` (schema `newStartupSchema` e seu `.superRefine` final; não mudar shape)
  - `app/lib/new-startup-schema.ts:181-264` (schema `complementaryStartupSchema`)
  - `app/components/**`, `app/routes/**`, `app/lib/cnpj-format.ts`, `app/lib/mask-utils.ts` (S01 — intocados)
  - `app/lib/__tests__/**` (escopo de T010)
  - `.harness/state.json`, `.harness/events.jsonl`
  - `sprints/S01-cnpj-alfanumerico/**`, `sprints/S02-m2-debts/tasks/T010_PROMPT.md`, `coverage/**`

---

## Descrição

### Parte A — Algoritmo de DV (extraído de `/tmp/opencode/manual-dv.txt`)

A RFB definiu 1 fórmula única para o DV do CNPJ Alfanumérico, válida para os 36 caracteres `[0-9A-Z]`:

```
1. charValue(ch) = ch.toUpperCase().charCodeAt(0) - 48
   (ASCII: '0'..'9' → 48-57 → valor 0-9; 'A'..'Z' → 65-90 → valor 17-42)

2. Pesos cíclicos [2,3,4,5,6,7,8,9] aplicados da DIREITA para a ESQUERDA.
   Para 12 chars (DV1), da esquerda para a direita: [5,4,3,2,9,8,7,6,5,4,3,2]
   Para 13 chars (DV2, com DV1 já anexado), da esquerda para a direita: [6,5,4,3,2,9,8,7,6,5,4,3,2]

3. S = Σ (valor[i] × peso[i])
   resto = S mod 11
   • Se resto ≤ 1 → DV = 0
   • Senão → DV = 11 - resto

4. Exemplo do manual: "12ABC34501DE" → DV1=3, DV2=5 → "12.ABC.345/01DE-35"
```

### Parte B — Implementação sugerida (substituir `cnpjAlfanumericoValidator` em `new-startup-schema.ts:14-60`)

```typescript
import { createHash } from "node:crypto"; // ou use Web Crypto API se preferir (browser-safe)

/**
 * Mapeamento caractere → valor numérico (manual serpro.gov.br §4.1).
 * Único para todos os 36 chars [0-9A-Z].
 *
 * Exemplo: charValue('A') = 17, charValue('B') = 18, charValue('E') = 21.
 */
export function charValue(ch: string): number {
  return ch.toUpperCase().charCodeAt(0) - 48;
}

/**
 * Pesos cíclicos do módulo 11 (manual §4.2).
 * Para DV1 (12 chars radicais), lidos da ESQUERDA para a DIREITA.
 * Para DV2 (13 chars, com DV1 anexado), idem com 1 passo a mais no início.
 */
const DV1_WEIGHTS_LEFT_TO_RIGHT = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const DV2_WEIGHTS_LEFT_TO_RIGHT = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Pesos cíclicos 2..9 aplicados da direita para a esquerda — padrão de pesos. */
const CYCLE = [2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Calcula um DV (módulo 11 com borda resto ≤ 1 → 0). Manual §4.3 e §4.4.
 *
 * @param values - Array de valores numéricos (saída de charValue) na ordem do radical.
 * @param weightsLeftToRight - Pesos lidos da esquerda para a direita (vide DV1/DV2).
 * @returns 1 dígito verificador numérico (0-9).
 */
function calcDv(values: number[], weightsLeftToRight: number[]): number {
  // Pesos da direita para a esquerda são (cycle aplicado em sequência). Para DV1, manual
  // já dá o equivalente [5,4,3,2,9,8,7,6,5,4,3,2] da esquerda→direita; idem para DV2.
  // Cálculo direto: S = Σ values[i] * weightsLeftToRight[i].
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weightsLeftToRight[i];
  }
  const resto = sum % 11;
  return resto <= 1 ? 0 : 11 - resto;
}

/**
 * Computa os 2 DVs concatenados a partir do radical (12 chars alfanuméricos).
 *
 * @param radical12 - String de 12 caracteres alfanuméricos (após remover máscara).
 * @returns String de 2 dígitos ('00' a '99'). Ex.: '12ABC34501DE' → '35'.
 *
 * Exemplo do manual: computeDv('12ABC34501DE') === '35' ('12.ABC.345/01DE-35').
 */
export function computeDv(radical12: string): string {
  if (radical12.length !== 12) {
    throw new Error(`computeDv: esperado 12 chars, recebido ${radical12.length}`);
  }
  const normalized = radical12.toUpperCase();
  const values12 = Array.from(normalized).map(charValue);

  const dv1 = calcDv(values12, DV1_WEIGHTS_LEFT_TO_RIGHT);
  const values13 = [...values12, dv1];
  const dv2 = calcDv(values13, DV2_WEIGHTS_LEFT_TO_RIGHT);

  return `${dv1}${dv2}`;
}
```

### Parte C — Reescrever `cnpjAlfanumericoValidator`

Substituir o bloco `cnpjAlfanumericoValidator` (atualmente linhas 14-60) pela implementação a seguir:

```typescript
/**
 * Validador de CNPJ com DV verificado contra o algoritmo oficial do manual
 * serpro.gov.br (IN RFB 2.229/2024, republicado em junho/2026).
 *
 * Aplica-se uniformemente a CNPJ numérico legado e CNPJ alfanumérico novo
 * (manual §4 — fórmula única charValue = charCodeAt - 48).
 *
 * Validação em 3 etapas:
 *   1. Regex `^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$`.
 *   2. Calcula DV esperado do radical.
 *   3. Compara com os 2 últimos dígitos.
 *
 * Em caso de DV inválido, emite ZodIssueCode.custom com mensagem PT-BR
 * distinta. Não distingue branch numérico-legado vs alfanumérico (algoritmo
 * único).
 *
 * @see .harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md §4.1-4.5
 * @see https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf/view
 *
 * @param value - Valor do campo CNPJ (já passou no regex do Zod: XX.XXX.XXX/XXXX-YY).
 * @param ctx   - Contexto Zod para adicionar issues.
 */
export function cnpjAlfanumericoValidator(value: string, ctx: z.RefinementCtx): void {
  const CNPJ_MASK_REGEX = /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/;
  if (!CNPJ_MASK_REGEX.test(value)) {
    // Regex já deveria ter barrado essa entrada, mas redundância segura.
    return; // silencioso — Zod emite a mensagem do regex separadamente
  }

  // Extrair radical (12 chars sem máscara) e os 2 últimos dígitos (DV).
  const normalized = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const radical = normalized.slice(0, 12);
  const dvInformado = normalized.slice(12, 14);

  let expected: string;
  try {
    expected = computeDv(radical);
  } catch {
    // Defesa em profundidade — não deveria disparar.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnpj"],
      message: "Não foi possível calcular o dígito verificador",
    });
    return;
  }

  if (expected !== dvInformado) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cnpj"],
      message: `Dígito verificador incorreto (esperado ${expected}, recebido ${dvInformado})`,
    });
    return;
  }
  // DV bateu: aceita silenciosamente. Não emite warn.
}
```

**Pontos críticos:**

1. **Backward compatibility:** o algoritmo cobre tanto CNPJ numérico legado quanto alfanumérico novo — não há branch por tipo. O mesmo `computeDv('113333440001')` (numérico) e `computeDv('11A333B44001')` (alfanumérico) usam a mesma função `charValue`.

2. **`pending-manual-dv-review` REMOVIDO:**
   - Remover a string literal `'cnpj-validator: pending-manual-dv-review'` do código.
   - Remover o `btoa(...)` SHA-não-crypto (LGPD-fraco) — substituir por Web Crypto SHA-256 se houver logging em dev (mas se não houver logging, melhor — YAGNI).
   - **Não usar `console.warn` no fluxo principal.** LGPD: log de CNPJ é desnecessário se a validação for silenciosa no caminho de sucesso.

3. **JSDoc do `cnpjAlfanumericoValidator` reescrito** em PT-BR cobrindo: (a) o que faz, (b) por que (referência regulatória), (c) algoritmo em alto nível, (d) link para o manual PDF.

4. **Mantém a assinatura:** `(value: string, ctx: z.RefinementCtx) => void`. Não trocar para retornar objeto — quebra consumidor `newStartupSchema.cnpj.superRefine(cnpjAlfanumericoValidator)`.

### Parte D — Verificação manual inline

Antes de marcar T009 como pronta, **validar inline** que o algoritmo bate com o exemplo do manual:

```typescript
// Console.log temporário em dev (REMOVER antes do commit):
console.assert(computeDv("12ABC34501DE") === "35", "BUG: computeDv falhou no exemplo do manual");
console.assert(computeDv("113333440001") !== "81", "BUG: CNPJ legado mal calculado"); // qualquer valor ≠ "81" para detectar regressão
```

(Também T010 — testes formais — mas essa verificação inline ajuda a detectar regressão cedo.)

---

## Acceptance Criteria

- [ ] `grep -n 'pending-manual-dv-review' app/` retorna vazio
- [ ] `cnpjAlfanumericoValidator` foi **substituído** (não coexiste com placeholder)
- [ ] Função `charValue` exportada e coberta (verificar com `grep`)
- [ ] Função `computeDv` exportada e coberta
- [ ] Exemplo do manual validado: `computeDv('12ABC34501DE') === '35'` (validar via teste ou assert inline)
- [ ] `npm run typecheck` continua verde após T009 (T008 já entregou typecheck verde)
- [ ] CNPJ numérico legado com DV correto (ex.: `11.222.333/0001-81`) é aceito sem erro — **verificar algoritmo** computando manualmente o DV de `112223330001` (radical) — se bate com `81`, então aceita.
- [ ] CNPJ numérico legado com DV errado (ex.: `11.222.333/0001-99`) é rejeitado com mensagem `"Dígito verificador incorreto"`
- [ ] CNPJ alfanumérico com DV válido (ex.: `12.ABC.345/01DE-35`) é aceito sem warn
- [ ] CNPJ alfanumérico com DV inválido (ex.: `12.ABC.345/01DE-99`) é rejeitado com mensagem específica
- [ ] **Nenhuma função nova** introduz `console.warn` em fluxo de sucesso (YAGNI + LGPD)
- [ ] JSDoc do `cnpjAlfanumericoValidator` reescrito em PT-BR referenciando manual PDF e RAG §4
- [ ] Cobertura no arquivo `app/lib/new-startup-schema.ts`: ≥70% linhas (perfil lean); meta formal de 80% é T010
- [ ] Os 55 testes prévios da S01 são adaptados em T010 — durante T009, **pode haver quebra de 1 teste** (o que esperava `pending-manual-dv-review` warn) — isso é esperado e T010 corrige.
- [ ] Git: commit `feat(s02/t009): DV completo CNPJ alfanumérico (manual serpro.gov.br §4.1-4.5)`

---

## Micro-SPEC (trecho relevante)

### RAG §4.1 — Fórmula `charValue(ch) = ch.toUpperCase().charCodeAt(0) - 48`
> A fórmula aproveita continuidade ASCII: `'0'=48`→`9'=57`, `'A'=65`→`'Z'=90`. Diferença 17 entre `'9'` e `'A'`. Manual confirma com exemplos (`A=17`, `B=18`, `C=19`, `D=20`, `E=21`).

### RAG §4.2 — Pesos cíclicos 2-9 da direita para a esquerda
| Posição (esq → dir) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---                |---|---|---|---|---|---|---|---|---|----|----|----|
| Peso DV1          | 5 | 4 | 3 | 2 | 9 | 8 | 7 | 6 | 5 | 4  | 3  | 2  |
| Peso DV2 (13 pos) | 6 | 5 | 4 | 3 | 2 | 9 | 8 | 7 | 6 | 5  | 4  | 3  | **2** (13ª coluna)

### RAG §4.3/4.4 — Algoritmo Módulo 11 com borda
> *"`S = Σ (valor × peso)`; `resto = S mod 11`; se resto ≤ 1 → DV = 0; senão → DV = 11 - resto`"*
> Mesmo algoritmo para DV1 (12 chars) e DV2 (13 chars com DV1 incluído).

### RAG §6 — Antipadrão 3 (Implementação correta) — já documenta o trecho de código de referência
> O §6 do RAG v2 já traz a função `charValue` + arrays de pesos + `calcDv` corretos. Esta task replica EXATAMENTE essas funções (mesma estrutura, mesmos nomes) para garantir rastreabilidade.

### Compatibilidade Reversa (RAG §5.2)
> CNPJs puramente numéricos (subconjunto de `[0-9]` ⊂ `[A-Z0-9]`) passam pelo mesmo `computeDv`. O frontend **não pode presumir** que todo CNPJ é numérico a partir de julho/2026.

---

## LGPD / Compliance

- **Logar CNPJ em console é proibido.** Esta task NÃO precisa logar (sucesso é silencioso). Não introduza `console.warn`/`console.log` com CNPJ em claro.
- Se algum `console.warn` for mantido para debug em dev, usar **SHA-256 hash** (primeiros 8 hex) + mascara (`XX.XXX.XXX/XXXX-YY`) + `length`. Exemplo de uso aceitável se realmente necessário:

  ```typescript
  if (process.env.NODE_ENV === "development") {
    // SOMENTE em dev; nunca em prod.
    const hash = await sha256Hex(normalized); // primeiros 8 chars
    console.warn("cnpj-validator: dev-hint", { hashPrefix: hash.slice(0, 8), length: 14 });
  }
  ```

  **Mas prefira omitir totalmente** — YAGNI. Se aparecer requisito futuro, separar em PR dedicado.

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** inventar tabela de mapeamento letra→valor — usar SOMENTE `charCodeAt(0) - 48` (RAG §6 Antipadrão 3).
- ❌ **NÃO** diferenciar branch numérico-legado vs alfanumérico no cálculo do DV — algoritmo é único (RAG §6).
- ❌ **NÃO** manter `pending-manual-dv-review` em lugar nenhum do código de produção.
- ❌ **NÃO** logar CNPJ em claro (LGPD — usar SHA-256 + masked, ou melhor, não logar).
- ❌ **NÃO** misturar letras minúsculas no storage — sempre uppercase antes de calcular DV.
- ❌ **NÃO** reformatar/escalonar refator além do escopo declarado.
- ❌ **NÃO** alterar o shape de `newStartupSchema` ou `complementaryStartupSchema` (consumidores podem quebrar).
- ❌ **NÃO** remover `getAlphanumeric` ou outros helpers usados em S01.
- ❌ **NÃO** deletar arquivos existentes.
- ❌ **NÃO** criar abstração desnecessária (YAGNI). Helpers `charValue`, `computeDv` são funções simples, não classes.

## Ponteiros de Contexto

- **RAG (fonte secundária consolidada):** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` v2 §4.1-4.5 + §6 Antipadrão 3 (implementação correta).
- **Manual (fonte primária):** `/tmp/opencode/manual-dv.txt` (snapshot literal do PDF oficial via `pdftotext`).
- **Helper existente:** `app/lib/cnpj-format.ts` — `getAlphanumeric` (preserva letras + uppercase + slice 14).
- **Tarefa anterior:** S01/T003 — background da regex e placeholder original.
- **Tarefa dependente:** T010 — vai validar a API final com fixtures.

## Dependências

- **Upstream:** T008 (typecheck verde antes de mexer no validator).
- **Downstream:** T010 (reformula a suíte contra a API final).

## Status Final Esperado

`cnpjAlfanumericoValidator` reescrito com algoritmo oficial, helpers `charValue` + `computeDv` exportados, JSDoc em PT-BR, string `pending-manual-dv-review` removida, typecheck verde, **1 teste da S01 provavelmente quebra** (o que esperava o warn) — T010 corrige. Estado `DEBT-DV-001` em `state.json` muda de `documented-ready-for-impl` para `closed-via-S02/T009`.
