---
id: "T008"
status: "pending"
type: "frontend"
sprint: "S02-m2-debts"
milestone: "M2"
owner: "frontend"
estimatedEffort: 1
dependencies: []
priority: "critical"
---

# Task T008 — Zod 3→4 migration (errorMap removido + Resolver inference)

## Contexto

- **Por que esta task existe:** S01 (`b4f4e95c`) saiu do commit com **`npm run typecheck` quebrado** por 2 problemas pré-existentes ao Zod 4. A S01 não pôde fixar T008 porque o escopo dela era CNPJ Alfanumérico (T001-T007) e typecheck quebrado era dívida. S02 reabre.
- **DEBT-ZOD-001 (state.json):** `{"status": "pending-impl", "scope": "app/lib/new-startup-schema.ts + app/routes/private/create-startup.tsx"}` — esta task fecha.
- **Stack:** Zod `^4.4.2`, `@hookform/resolvers ^5.2.2`, React 19, TypeScript `^5.9.3` strict.
- **Profile:** lean — Direct Coding (implementação + teste verde em uma iteração). Coverage mínimo **70%**.

---

## Capability Grant (escopo desta task)

- **Paths allowlist (CRIAÇÃO/MODIFICAÇÃO):**
  - `app/lib/new-startup-schema.ts` (modificar linhas 226-229)
  - `app/routes/private/create-startup.tsx` (modificar linha 83)
- **Paths allowlist (LEITURA):**
  - `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md`
  - `package.json` (verificar versões de `zod`, `@hookform/resolvers`)
  - `tsconfig.json` (strict mode)
  - `app/lib/login-schema.ts` (referência de padrão pós-migration se já migrado)
  - `app/lib/banking-schema.ts` (referência de uso correto de `z.literal`)
- **Paths proibidos (NÃO TOCAR):**
  - `app/lib/new-startup-schema.ts:14-60` (escopo de T009 — DV placeholder não mexe)
  - `app/lib/new-startup-schema.ts:131-149` (escopo de T009 — `.superRefine` principal)
  - `app/components/**`, `app/routes/api/**`, `app/lib/cnpj-format.ts`, `app/lib/mask-utils.ts` (S01 — intocados)
  - `.harness/state.json`, `.harness/events.jsonl` (read-only para qualquer agent)
  - `sprints/**`, `coverage/**`, `node_modules/**`, `test/**`

---

## Descrição

### Parte A — Substituir `errorMap` em 4 lugares

**Arquivo:** `app/lib/new-startup-schema.ts`, linhas 226-229.

Zod 4 removeu o segundo-argumento `errorMap: () => ({...})` em favor de `message` direto (string) ou `error` (callback com issue context). Para o nosso caso (mensagens estáticas), usar a forma mais simples:

```typescript
// ANTES (S01, quebra em Zod 4)
aceiteParceiros: z.literal(true, { errorMap: () => ({ message: "Obrigatório aceitar o Termo de Parceiros" }) }),
aceiteUso: z.literal(true, { errorMap: () => ({ message: "Obrigatório aceitar o Termo de Uso" }) }),
aceiteRepasse: z.literal(true, { errorMap: () => ({ message: "Obrigatório aceitar o Termo de Repasse Vinculado" }) }),
declaracaoVeracidade: z.literal(true, { errorMap: () => ({ message: "Obrigatório declarar a veracidade das informações" }) }),

// DEPOIS (Zod 4)
aceiteParceiros: z.literal(true, { message: "Obrigatório aceitar o Termo de Parceiros" }),
aceiteUso: z.literal(true, { message: "Obrigatório aceitar o Termo de Uso" }),
aceiteRepasse: z.literal(true, { message: "Obrigatório aceitar o Termo de Repasse Vinculado" }),
declaracaoVeracidade: z.literal(true, { message: "Obrigatório declarar a veracidade das informações" }),
```

### Parte B — Investigar e corrigir erro de `Resolver` em `create-startup.tsx:83`

**Arquivo:** `app/routes/private/create-startup.tsx`, linha 83.

**Sintoma típico:** `Type 'ZodEffects<...>' is not assignable to type 'Resolver<NewStartupFormData, ...>'` ou variação — vem do fato de que `newStartupSchema` em `new-startup-schema.ts:131` termina com `.superRefine(...)`, e `ZodEffects` (output de `superRefine`) tem tipo de input/output divergente do esperado por `@hookform/resolvers/zod` v5 quando combinado com tipos derivados via `z.infer<typeof newStartupSchema>`.

**Diagnóstico — ordem sugerida:**

1. **Rode `npm run typecheck`** localmente e observe o erro EXATO em `create-startup.tsx:83`. Anote o tipo de input/output esperado pelo Resolver vs. tipo produzido.
2. **Se a mensagem for estritamente "ZodEffects não é assignable"**, existem 2 correções idiomáticas:
   - **Opção B1 (preferida, mínima):** cast tipado em `zodResolver(...) as Resolver<NewStartupFormData>`. Requer `import type { Resolver } from "react-hook-form"`. Não muda runtime, só TypeScript.
   - **Opção B2 (mais invasiva):** Extrair o refinamento final (lines 131-149 do `newStartupSchema`) para `.refine()` em campos individuais, ou usar `z.object(...).check(...)` (Zod 4 nativo). Só escolha B2 se B1 falhar no typecheck.
3. **Se a mensagem for DIFERENTE** (ex.: `ResolverOptions<...>` mismatch), investigue o tipo genérico de `useForm<NewStartupFormData>` — pode ser que o `defaultValues` tenha `wantsFastTrackReview: boolean | undefined` enquanto o schema infere `boolean` (devido ao `.default(false)`). Ajuste para `useForm` sem generic OU force o tipo com `useForm<NewStartupFormData, unknown, undefined>` (RHF v5+).

**Critério de escolha:** prefira sempre a opção de **menor diff** que satisfaça `npm run typecheck` ser verde. NÃO refatorar mais do que o necessário.

### Parte C — Verificação final

```bash
npm run typecheck  # DEVE retornar 0 erros
grep -n 'errorMap' app/  # DEVE retornar vazio (ou só ocorrências legadas não relacionadas a Zod)
```

**Esperado:**
- Typecheck verde (0 erros)
- 4 lugares com `z.literal(true, { message: "..." })` confirmado por `grep`
- 1 lugar com cast tipado em `create-startup.tsx` (ou refator mínimo equivalente)
- Suíte de testes prévia (55 testes S01) continua passando — não regredir

---

## Acceptance Criteria

- [ ] `npm run typecheck` retorna 0 erros
- [ ] 4 lugares com `z.literal(true, { message: "..." })` (sem `errorMap`)
- [ ] `grep -rn 'errorMap' app/` retorna vazio OU só ocorrências não-relacionadas a `z.literal`
- [ ] `app/routes/private/create-startup.tsx:83` compila — usa `as Resolver<NewStartupFormData>` OU refator mínimo equivalente
- [ ] **ZERO** `as any` no arquivo modificado (apenas casts tipados — Regra §6.1 do briefing + Regra de Ouro 12 — "Falhe alto")
- [ ] Os 55 testes da S01 continuam passando (`npm run test`)
- [ ] Mensagens PT-BR dos 4 checkboxes preservadas literalmente
- [ ] Git: commit granular `fix(s02/t008): zod 4 errorMap removido + Resolver inference`

---

## Micro-SPEC (regras de negócio relevantes)

> Trecho da SPEC/RAG que justifica esta task.

### RAG §3.1 — Regex atual rejeita letras (já migrado em S01)
```typescript
// ✅ SÓ DIZ RESPEITO AO CNPJ ALFANUMÉRICO, NÃO AO ZOD
const CNPJ_REGEX = /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/;
```

### Zod 4 — API de mensagens
- **`message`** (string) — uso mais comum, mensagem estática.
- **`error`** (callback `(issue: ZodIssueContext) => string`) — uso quando a mensagem depende do contexto.
- ~~`errorMap`~~ — **REMOVIDO em Zod 4**. Causa do typecheck quebra.

### `@hookform/resolvers` v5 com Zod 4
- Behavior documentado: tipos derivados via `z.infer<typeof schema>` funcionam quando schema é `ZodObject`, `ZodDiscriminatedUnion` ou `ZodEffects` puro. Em alguns edge cases (ZodEffects + refinamentos encadeados + versões específicas), o tipo diverge do `Resolver` esperado — daí o cast ou refator.

---

## LGPD / Compliance

- Sem dados pessoais envolvidos nesta task (migração de tipos). LGPD-safe.
- Não há fixtures, não há logs. Não exige ações LGPD.

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** usar `as any` — apenas casts tipados (`as Resolver<NewStartupFormData>`).
- ❌ **NÃO** reformatar/escalonar refator além do necessário (Regra §6.1 — Surgical changes).
- ❌ **NÃO** alterar `app/lib/new-startup-schema.ts:14-60` (escopo de T009 — DV placeholder) nem `:131-149` (escopo de T009 — `superRefine`).
- ❌ **NÃO** alterar `sprints/S01-cnpj-alfanumerico/**` (coexistência obrigatória).
- ❌ **NÃO** usar `eslint-disable` (não há ESLint configurado; se aparecer, sinalizar).
- ❌ **NÃO** deletar arquivos existentes.
- ❌ **NÃO** commitar com mensagem vaga tipo "fix" — usar `fix(s02/t008): <escopo específico>`.

## Ponteiros de Contexto

- **RAG:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (contexto regulatório apenas — esta task é puramente técnica).
- **AGENTS.md raiz:** "Forms: react-hook-form + Zod".
- **Vitest docs:** `npm run test:coverage` para regressão.
- **Zod 4 migration guide:** https://zod.dev/v4/changelog (chave: `errorMap` removido).
- **Tarefa relacionada:** T009 (DV completo) **depende** desta task estar verde.

## Dependências

- **Upstream:** nenhuma — T008 é independente.
- **Downstream:** T009 — não pode começar até typecheck estar verde.

## Status Final Esperado

`npm run typecheck` retorna 0 erros. 55+ testes verdes. 2 arquivos modificados (`app/lib/new-startup-schema.ts` 4 linhas + `app/routes/private/create-startup.tsx` 1-3 linhas). Estado `DEBT-ZOD-001` em `state.json` muda de `pending-impl` para `closed-via-S02/T008`.
