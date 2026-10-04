---
id: "T001"
status: "pending"
type: "frontend"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "frontend"
estimatedEffort: 0.5
complexity: "simple"
dependencies: []
---

# Task T001 — Extrair schema Zod `round-distribution-schema.ts`

## Contexto

Os 7 campos de distribuição de recursos (`recursosFundador..recursosCaixa`) **JÁ EXISTEM** dentro de `complementaryStartupSchema` em `app/lib/new-startup-schema.ts:211-218`, e o `superRefine` que valida `soma === 100` está nas linhas `:253-270`. Esta task **EXTRAI** esses campos para um arquivo focado e independente, sem importar `complementaryStartupSchema` (evita acoplamento).

## Descrição

Criar `app/lib/round-distribution-schema.ts` contendo **apenas** os 7 campos e o superRefine. Exportar `roundDistributionSchema` e o tipo `RoundDistributionInput` via `z.infer`.

```typescript
// Conteúdo do arquivo (estrutura):
import { z } from "zod";

export const roundDistributionSchema = z.object({
  recursosFundador: z.number().min(0).max(100),
  recursosDesenvolvimento: z.number().min(0).max(100),
  recursosComercial: z.number().min(0).max(100),
  recursosMarketing: z.number().min(0).max(100),
  recursosNuvem: z.number().min(0).max(100),
  recursosJuridico: z.number().min(0).max(100),
  recursosCaixa: z.number().min(0).max(100),
}).superRefine((data, ctx) => {
  const total =
    data.recursosFundador + data.recursosDesenvolvimento +
    data.recursosComercial + data.recursosMarketing +
    data.recursosNuvem + data.recursosJuridico + data.recursosCaixa;

  if (total !== 100) {
    ctx.addIssue({
      path: ["recursosFundador"],
      code: z.ZodIssueCode.custom,
      message: `A soma dos recursos deve ser exatamente 100%. Total atual: ${total}%`,
    });
  }
});

export type RoundDistributionInput = z.infer<typeof roundDistributionSchema>;
```

## Escopo Cirúrgico

### Paths allowlist (CRIAÇÃO)

- `app/lib/round-distribution-schema.ts` (novo)

### Paths proibidos

- `app/lib/new-startup-schema.ts` (NÃO modificar — apenas extrair)
- `app/components/**`, `app/routes/**` (T002-T010)
- `package.json` (sem deps novas)

## Acceptance Criteria

- [ ] `app/lib/round-distribution-schema.ts` criado e exporta `roundDistributionSchema` + `RoundDistributionInput`
- [ ] `roundDistributionSchema.parse({recursosFundador: 30, recursosDesenvolvimento: 25, recursosComercial: 15, recursosMarketing: 10, recursosNuvem: 8, recursosJuridico: 7, recursosCaixa: 5})` aceita (soma=100)
- [ ] Schema rejeita soma≠100 com mensagem `"A soma dos recursos deve ser exatamente 100%. Total atual: X%"`
- [ ] Cada campo tem `.min(0).max(100)` — entrada negativa ou >100 falha
- [ ] Arquivo **NÃO importa** `complementaryStartupSchema` nem `new-startup-schema.ts` (independência)
- [ ] JSDoc no topo do arquivo explicando que schema foi extraído de `new-startup-schema.ts` e deve ser mantido sincronizado
- [ ] `npm run typecheck` passa

## Ponteiros de Contexto

- **Fonte canônica:** `app/lib/new-startup-schema.ts:211-218` (campos) e `:253-270` (superRefine)
- **AGENTS.md:** `app/lib/AGENTS.md` (seção SCHEMAS — "Schemas Zod com mensagens em PT-BR")
- **Consumers esperados:** `app/components/founder/rodada-distribuicao-tab.tsx` (T004) + `app/lib/round-distribution-schema.test.ts` (T009)
- **Convenção:** schemas em PT-BR, validação separada de formatação (não usar masks)

## Dependências

- **Bloqueia:** T002 (compartilha tipo), T004 (consome schema), T009 (testa schema)
- **Bloqueada por:** nenhuma — pode ser primeira a rodar

## Status Final Esperado

Arquivo `app/lib/round-distribution-schema.ts` (~30 LOC) com schema Zod focado + tipo exportado + JSDoc explicativo. Typecheck verde.