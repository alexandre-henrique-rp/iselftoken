---
id: "T002"
status: "pending"
type: "frontend"
sprint: "S01-cnpj-alfanumerico"
milestone: "M1"
owner: "frontend"
estimatedEffort: 2
dependencies: []
---

# Task T002 — Adaptar `cnpj-format.ts` para preservar letras no radical

## Contexto Regulatório

- **Origem:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (status `confirmed`)
- **Marco regulatório:** IN RFB 2.229/2024 — CNPJ Alfanumérico
- **Impacto direto:** RAG §3.3 (Formatter) — `getOnlyDigits` remove letras e quebra CNPJs alfanuméricos.

## Descrição

Substituir a estratégia de `getOnlyDigits` por uma versão **alphanumeric-preserving** que aceita letras maiúsculas no radical. Introduzir `getAlphanumeric(value)` que remove máscara (`[./-]`) e força uppercase, mantendo `[A-Z0-9]`. Atualizar `formatCnpj()` e `isCnpjComplete()` para suportar letras. Marcar `getOnlyDigits` como `@deprecated` para usos explicitamente legados (ex.: envio a backend que ainda exige só dígitos).

```typescript
// ANTES
export function getOnlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const digits = getOnlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function isCnpjComplete(value: string): boolean {
  return getOnlyDigits(value).length === 14;
}

// DEPOIS
/** Normaliza string para [A-Z0-9]{0,14}, removendo máscara e forçando uppercase. */
export function getAlphanumeric(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 14);
}

/** @deprecated usar getAlphanumeric para CNPJ novo; manter para backend legado. */
export function getOnlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const chars = getAlphanumeric(value);
  return chars
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, "$1.$2")
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, "$1.$2.$3")
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, ".$1/$2")
    .replace(/([A-Z0-9]{4})(\d)/, "$1-$2");
}

export function isCnpjComplete(value: string): boolean {
  return getAlphanumeric(value).length === 14;
}
```

## Escopo Cirúrgico

### Paths allowlist

- `app/lib/cnpj-format.ts` (modificar — único arquivo do escopo)

### Paths proibidos

- `app/lib/mask-utils.ts` (T001)
- `app/lib/new-startup-schema.ts` (T003)
- `app/lib/banking-schema.ts` (T004)
- `app/components/**` (T005)
- `app/routes/api/geral.cnpj.$cnpj.ts` (T006)
- Qualquer arquivo de teste — T007

## Acceptance Criteria

- [ ] `getAlphanumeric('AB.12C.3DE/45F6-78')` retorna `'AB12C3DE45F678'`
- [ ] `getAlphanumeric('ab12c3de45f678')` retorna `'AB12C3DE45F678'` (uppercase)
- [ ] `getAlphanumeric('12.345.678/0001-90')` retorna `'12345678000190'` (CNPJ legado)
- [ ] `getAlphanumeric('  AB.12C.3DE/45F6-78  ')` retorna `'AB12C3DE45F678'` (trims máscara)
- [ ] `getAlphanumeric('')` retorna `''`
- [ ] `formatCnpj('AB12C3DE45F678')` retorna `'AB.12C.3DE/45F6-78'`
- [ ] `formatCnpj('ab12c3de45f678')` retorna `'AB.12C.3DE/45F6-78'`
- [ ] `formatCnpj('12345678000190')` retorna `'12.345.678/0001-90'` (CNPJ legado)
- [ ] `formatCnpj('AB12C')` retorna `'AB.12C.'` (parcial progressivo)
- [ ] `formatCnpj('')` retorna `''`
- [ ] `isCnpjComplete('AB12C3DE45F678') === true`
- [ ] `isCnpjComplete('AB.12C.3DE/45F6-78') === true`
- [ ] `isCnpjComplete('12345678000190') === true` (legado)
- [ ] `isCnpjComplete('AB12C') === false`
- [ ] `isCnpjComplete('') === false`
- [ ] `getOnlyDigits` continua exportado com JSDoc `@deprecated` (não deletar — RAG §6 antipadrão 1)
- [ ] `npm run typecheck` passa

## Notas LGPD / Compliance

- Helpers aqui são **puros** (sem I/O, sem log) — zero risco LGPD direto.
- **Não** adicionar `console.log` da string resultante em momento algum.
- Manter exports nominais para que tree-shaking funcione em produção.

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** deletar `getOnlyDigits` — usos legados podem depender (RAG §6 antipadrão 1).
- ❌ **NÃO** aceitar minúsculas no storage — sempre `.toUpperCase()`.
- ❌ **NÃO** usar regex `\D` para detectar "completo" — agora conta caracteres alfanuméricos.
- ❌ **NÃO** criar arquivo separado (`cnpj-format-alfanumerico.ts`) — manter em `cnpj-format.ts` único.
- ❌ **NÃO** introduzir dependência nova (Zod, lodash) — manter zero dep externa.

## Ponteiros de Contexto

- **RAG:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (§3.3, §6 Antipadrão 1, 6)
- **AGENTS.md relevante:** `app/lib/AGENTS.md` (MASK-UTILS STRUCTURE — observa que "Mask formatters retornam string; sem validação interna" — mesma regra vale para `formatCnpj`)
- **Consumers atuais** (não modificar aqui, mas conhecer para garantir compat):
  - `app/components/founder/corporate-identity.tsx` (linha 7 importa `formatCnpj, getOnlyDigits, isCnpjComplete`)
  - `app/routes/private/create-startup.tsx` (linha 10 importa `formatCnpj, getOnlyDigits, isCnpjComplete`)

## Dependências

- **Upstream:** nenhuma
- **Downstream:** T003, T004, T005, T006 (todos importam de `cnpj-format.ts`)

## Status Final Esperado

Arquivo `app/lib/cnpj-format.ts` com `getAlphanumeric` + `formatCnpj` alfanumérico + `isCnpjComplete` alfanumérico + `getOnlyDigits` com `@deprecated`. `npm run typecheck` verde.