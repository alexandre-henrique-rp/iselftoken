---
id: "T004"
status: "pending"
type: "frontend"
sprint: "S01-cnpj-alfanumerico"
milestone: "M1"
owner: "frontend"
estimatedEffort: 2
dependencies: ["T002"]
---

# Task T004 — Atualizar `banking-schema.ts` para aceitar CNPJ alfanumérico no `documentoTitular`

## Contexto Regulatório

- **Origem:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (status `confirmed`)
- **Marco regulatório:** IN RFB 2.229/2024 — CNPJ Alfanumérico
- **Impacto direto:** RAG §3.4 (Schema de payout)

## Descrição

O schema `bankingSchema` em `app/lib/banking-schema.ts` valida `documentoTitular` aceitando **CPF (11 dígitos)** ou **CNPJ (14 dígitos)**. Com o CNPJ Alfanumérico, a regra passa a ser:

- **CPF:** 11 dígitos (sem mudança)
- **CNPJ numérico legado:** 14 dígitos (sem mudança)
- **CNPJ alfanumérico novo:** 14 caracteres `[A-Z0-9]` (com letras no radical)

Trocar o helper `digitCount()` (linha 6) por uma versão que conta **caracteres alfanuméricos** (`[A-Z0-9]`), e normalizar entrada para maiúsculas antes da contagem (para que `Ab.123.Cde/4567-89` seja aceito).

```typescript
// ANTES (linha 6)
function digitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

// DEPOIS
function alphanumericCount(value: string): number {
  return value.replace(/[^A-Za-z0-9]/g, "").length;
}

// Dentro do refine (linha 25-31), normalizar antes:
.refine(
  (v) => {
    const normalized = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const n = alphanumericCount(normalized);
    return n === 11 || n === 14;
  },
  { message: "Informe um CPF (11 dígitos) ou CNPJ (14 caracteres alfanuméricos)" },
),
```

> **Nota:** o refinamento aqui é **deliberadamente light** — aceita formato e comprimento, **não** valida DV (o DV é responsabilidade de T003 — o `bankingSchema` é separado e apenas garante o formato compatível).

## Escopo Cirúrgico

### Paths allowlist

- `app/lib/banking-schema.ts` (modificar — único arquivo do escopo)

### Paths proibidos

- `app/lib/mask-utils.ts` (T001)
- `app/lib/cnpj-format.ts` (T002)
- `app/lib/new-startup-schema.ts` (T003)
- `app/components/**` (T005)
- `app/routes/api/geral.cnpj.$cnpj.ts` (T006)
- Qualquer arquivo de teste — T007

## Acceptance Criteria

- [ ] `bankingSchema` valida CPF (11 dígitos) **sem mudança** (ex: `'123.456.789-09'`)
- [ ] `bankingSchema` valida CNPJ numérico legado (14 dígitos) **sem mudança** (ex: `'12.345.678/0001-90'`)
- [ ] `bankingSchema` valida CNPJ alfanumérico (14 chars `[A-Z0-9]`) — ex: `'AB.12C.3DE/45F6-78'`
- [ ] `bankingSchema` valida CNPJ alfanumérico com letras minúsculas (normalizado) — ex: `'ab.12c.3de/45f6-78'` passa
- [ ] `bankingSchema` rejeita entrada com 12 chars alfanuméricos
- [ ] `bankingSchema` rejeita entrada com 13 chars alfanuméricos
- [ ] Mensagem de erro atualizada para **`'Informe um CPF (11 dígitos) ou CNPJ (14 caracteres alfanuméricos)'`**
- [ ] Helper `alphanumericCount` interno (não exportado)
- [ ] `BankingFormValues` type preservado (assinatura compatível com `app/components/founder/banking-details.tsx`)
- [ ] `npm run typecheck` passa

## Notas LGPD / Compliance

- O `bankingSchema` é executado no client (validação Zod no formulário) — **nenhum** dado de documentoTitular deve ser logado ou transmitido antes da validação completa.
- A normalização para uppercase **antes** da contagem garante que `"ab.123.cde/4567-78"` e `"AB.123.CDE/4567-78"` sejam tratados como equivalentes — evita diferenciação por case que seria falso positivo de duplicidade.

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** validar DV aqui (escopo do `bankingSchema` é só formato/comprimento; DV é responsabilidade do backend).
- ❌ **NÃO** aceitar 14 dígitos para CNPJ alfanumérico se houver letras — a regra é "ou 11 dígitos puros OU 14 chars alfanuméricos", não mistura.
- ❌ **NÃO** deletar `digitCount` antes de verificar se é usado em outro arquivo (grep antes de remover).
- ❌ **NÃO** criar um novo schema paralelo (`banking-schema-alfanumerico.ts`) — modificar in-place.
- ❌ **NÃO** introduzir regex de CNPJ Alfanumérico aqui — manter contagem agnóstica (este é o contrato de payout, não validação oficial).

## Ponteiros de Contexto

- **RAG:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (§3.4, §6)
- **AGENTS.md relevante:** `app/lib/AGENTS.md` (SCHEMAS — "Schemas Zod com mensagens em PT-BR")
- **Consumer:** `app/components/founder/banking-details.tsx` (linha 22 usa `FieldText name="documentoTitular"` — apenas consome o schema via `useForm({ resolver: zodResolver(bankingSchema) })`)
- **Helper atual:** `digitCount` na linha 6 — verificar uso antes de renomear

## Dependências

- **Upstream:** T002 (para consistência semântica com `getAlphanumeric`, embora T004 tenha sua própria normalização interna)
- **Downstream:** T005 (componentes de formulário), T007 (testes)

## Status Final Esperado

Arquivo `app/lib/banking-schema.ts` com helper `alphanumericCount` + normalização para maiúsculas + mensagem de erro atualizada. `npm run typecheck` verde. **Nenhuma mudança** em `titular`, `banco`, `tipoConta`, `agencia`, `conta`, `digito`, `chavePix` — apenas `documentoTitular`.