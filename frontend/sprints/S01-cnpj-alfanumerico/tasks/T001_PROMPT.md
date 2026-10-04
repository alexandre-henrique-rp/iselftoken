---
id: "T001"
status: "pending"
type: "frontend"
sprint: "S01-cnpj-alfanumerico"
milestone: "M1"
owner: "frontend"
estimatedEffort: 2
dependencies: []
---

# Task T001 — Adaptar `mask-utils.ts` para CNPJ alfanumérico (token `A` do `remask`)

## Contexto Regulatório

- **Origem:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (status `confirmed`, effectiveDate `2026-07-01`)
- **Marco regulatório:** IN RFB 2.229/2024 — CNPJ Alfanumérico
- **Impacto direto:** RAG §3.2 (Máscara) — o padrão `remask` `9` é exclusivo para dígitos; CNPJs alfanuméricos precisam do token `A` (alfanumérico maiúsculo).

## Descrição

Atualizar a constante `MASK_PATTERNS.CNPJ` em `app/lib/mask-utils.ts` para suportar letras maiúsculas no radical, migrando do token `9` para o token `A` na porção do radical (12 primeiros caracteres). O DV (2 últimos) permanece token `9` (sempre numérico).

```typescript
// ANTES (estado atual, linha 16 de mask-utils.ts)
CNPJ: '99.999.999/9999-99',

// DEPOIS (migração)
CNPJ: 'AA.AAA.AAA/AAAA-99',
```

Garantir que `applyCnpjMask` e `cnpjMaskHandler` (linhas 63 e 102) continuam funcionando idempotentemente em inputs com letras e dígitos misturados.

## Escopo Cirúrgico

### Paths allowlist

- `app/lib/mask-utils.ts` (modificar — único arquivo do escopo)

### Paths proibidos

- `app/lib/cnpj-format.ts` (T002 trata deste)
- `app/lib/new-startup-schema.ts` (T003)
- `app/lib/banking-schema.ts` (T004)
- `app/components/**` (T005)
- `app/routes/api/geral.cnpj.$cnpj.ts` (T006)
- `package.json` (T007 adiciona Vitest)
- Qualquer arquivo de teste — T007 gera `app/lib/__tests__/mask-utils.test.ts`

## Acceptance Criteria

- [ ] `MASK_PATTERNS.CNPJ === 'AA.AAA.AAA/AAAA-99'`
- [ ] `applyCnpjMask('AB12C3')` retorna `'AB.12C.3'` (parcial progressivo)
- [ ] `applyCnpjMask('AB12C3DE45F6')` retorna `'AB.12C.3DE/45F6-'`
- [ ] `applyCnpjMask('ab12c3de45f678')` retorna `'AB.12C.3DE/45F6-78'` (uppercase automático via `unmaskAlphanumeric`)
- [ ] `cnpjMaskHandler` é idempotente em `onChange` (chamar 2x com mesmo valor produz mesma string)
- [ ] Demais máscaras (`CPF`, `PHONE`, `CEP`, `RG`, `CNH`) **inalteradas**
- [ ] Assinaturas de `applyCnpjMask` e `cnpjMaskHandler` preservadas (compat com `CorporateIdentity` e `BankingDetails`)
- [ ] `npm run typecheck` passa sem erros

## Notas LGPD / Compliance

- A máscara **não precisa** de log porque é transformação local em memória do navegador.
- Não introduzir nenhum `console.log(cnpj)` — se precisar debugar, usar `console.warn` com **hash do CNPJ** (ex.: `sha256.slice(0, 8)`) em ambiente dev.

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** trocar para `SS.SSS.SSS/SSSS-99` (token `S` aceita minúsculas — quebra invariante de storage em maiúsculas).
- ❌ **NÃO** alterar `unmaskAlphanumeric` (linha 27) — ele já é a base correta; reuso.
- ❌ **NÃO** criar uma nova função `applyCnpjAlfanumericoMask` separada — manter a função existente.
- ❌ **NÃO** hard-codar a máscara em qualquer outro arquivo — sempre importar `MASK_PATTERNS.CNPJ`.

## Ponteiros de Contexto

- **RAG:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (§3.2, §6 Antipadrão 2)
- **AGENTS.md relevante:** `app/lib/AGENTS.md` (seção MASK-UTILS STRUCTURE)
- **Biblioteca externa:** `remask` (https://github.com/brunobertolini/remask) — verificar docs do token `A` antes de implementar
- **Simulador oficial (test-de-verdade):** https://www.gov.br/pt-br/servicos/simulador-cnpj-alfanumerico

## Dependências

- **Upstream:** nenhuma (esta task não depende de outras; pode ser primeira a rodar)
- **Downstream:** T005 (componentes) e T007 (testes) consomem esta API

## Status Final Esperado

Arquivo `app/lib/mask-utils.ts` com a máscara alfanumérica implementada + `npm run typecheck` verde.