---
id: "T009"
status: "pending"
type: "test"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "tester"
estimatedEffort: 1.0
complexity: "simple"
dependencies: ["T001"]
---

# Task T009 — Vitest para `round-distribution-schema.ts`

## Contexto

O schema Zod criado em T001 (`app/lib/round-distribution-schema.ts`) precisa de testes unitários cobrindo os edge cases da validação `soma === 100`. O setup de Vitest já foi feito em S01/T007 (`vitest.config.ts` + scripts npm), portanto esta task apenas adiciona **1 arquivo de teste** sem setup adicional.

## Descrição

Criar `app/lib/round-distribution-schema.test.ts` (ou `app/lib/__tests__/round-distribution-schema.test.ts` se convenção do projeto exigir — verificar S01/T007). Implementar **6 cenários** mínimos via `describe` + `it`:

```typescript
import { describe, it, expect } from "vitest";
import { roundDistributionSchema } from "./round-distribution-schema";

const VALID_DISTRIBUTION = {
  recursosFundador: 30,
  recursosDesenvolvimento: 25,
  recursosComercial: 15,
  recursosMarketing: 10,
  recursosNuvem: 8,
  recursosJuridico: 7,
  recursosCaixa: 5,
};

describe("roundDistributionSchema", () => {
  it("aceita quando soma = 100", () => {
    const result = roundDistributionSchema.safeParse(VALID_DISTRIBUTION);
    expect(result.success).toBe(true);
  });

  it("rejeita soma = 99.99", () => {
    const result = roundDistributionSchema.safeParse({
      ...VALID_DISTRIBUTION,
      recursosCaixa: 4.99,  // 99.99 total
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("100%");
    }
  });

  it("rejeita soma = 100.01", () => {
    const result = roundDistributionSchema.safeParse({
      ...VALID_DISTRIBUTION,
      recursosCaixa: 5.01,  // 100.01 total
    });
    expect(result.success).toBe(false);
  });

  it("rejeita soma = 0 (todos zeros)", () => {
    const result = roundDistributionSchema.safeParse({
      recursosFundador: 0,
      recursosDesenvolvimento: 0,
      recursosComercial: 0,
      recursosMarketing: 0,
      recursosNuvem: 0,
      recursosJuridico: 0,
      recursosCaixa: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita campo negativo", () => {
    const result = roundDistributionSchema.safeParse({
      ...VALID_DISTRIBUTION,
      recursosFundador: -10,  // soma = 90
    });
    expect(result.success).toBe(false);
  });

  it("rejeita campo > 100", () => {
    const result = roundDistributionSchema.safeParse({
      ...VALID_DISTRIBUTION,
      recursosFundador: 150,  // > 100
    });
    expect(result.success).toBe(false);
  });
});
```

## Escopo Cirúrgico

### Paths allowlist (CRIAÇÃO)

- `app/lib/round-distribution-schema.test.ts` (novo) — OU `app/lib/__tests__/round-distribution-schema.test.ts`

### Paths proibidos

- `app/lib/round-distribution-schema.ts` (apenas consumir, NÃO modificar)
- `vitest.config.ts`, `package.json` (Vitest já configurado em S01/T007)
- Qualquer outro arquivo

## Acceptance Criteria

- [ ] 6 cenários implementados e passando (`npm run test`)
- [ ] Cobertura ≥70% em `round-distribution-schema.ts` (perfil lean)
- [ ] Mensagem de erro do `superRefine` testada via `toContain("100%")` no cenário soma=99.99
- [ ] Cada teste isolado (sem dependência de estado externo)
- [ ] Sem `console.log` deixado após os testes
- [ ] Testes importam `vitest` diretamente (`describe`, `it`, `expect`)
- [ ] `npm run typecheck` passa

## Ponteiros de Contexto

- **Schema sob teste:** `app/lib/round-distribution-schema.ts` (T001)
- **Vitest setup:** S01/T007 já configurou `vitest.config.ts` + scripts npm (`test`, `test:coverage`)
- **Convenção:** verificar onde S01/T007 colocou os arquivos de teste (root de `app/lib/` vs `app/lib/__tests__/`)

## Dependências

- **Bloqueia:** T010 (smoke test pode rodar `npm test` como parte da verificação)
- **Bloqueada por:** T001 (schema precisa existir)

## Status Final Esperado

`app/lib/round-distribution-schema.test.ts` (~50 LOC) com 6 testes via `describe`/`it`. `npm run test` passa. Cobertura ≥70% em `round-distribution-schema.ts`.