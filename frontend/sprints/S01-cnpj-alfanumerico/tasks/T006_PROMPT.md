---
id: "T006"
status: "pending"
type: "frontend"
sprint: "S01-cnpj-alfanumerico"
milestone: "M1"
owner: "frontend"
estimatedEffort: 2
dependencies: ["T002"]
---

# Task T006 — Atualizar BFF `geral.cnpj.$cnpj.ts` para propagar CNPJ alfanumérico

## Contexto Regulatório

- **Origem:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (status `confirmed`)
- **Marco regulatório:** IN RFB 2.229/2024 — CNPJ Alfanumérico
- **Impacto direto:** RAG §3.5 (BFF de lookup)

## Descrição

O BFF em `app/routes/api/geral.cnpj.$cnpj.ts` é o proxy entre o frontend e o backend NestJS (`BACKEND_URL/geral/cnpj/:cnpj`). Hoje ele faz:

```typescript
// ❌ ESTADO ATUAL (linha 18)
const digits = raw.replace(/\D/g, "");
if (digits.length !== 14) {
  return Response.json(
    { error: "invalid_cnpj", message: "CNPJ deve ter 14 dígitos" },
    { status: 400 },
  );
}
// ...
const upstream = await fetch(`${BACKEND_URL}/geral/cnpj/${digits}`, { ... });
```

Isso **destrói letras** antes de enviar ao backend. Migração:

```typescript
// ✅ DEPOIS
import { getAlphanumeric } from "~/lib/cnpj-format";

const chars = getAlphanumeric(raw); // T002 helper — preserva letras, força uppercase, slice 14
if (chars.length !== 14) {
  return Response.json(
    { error: "invalid_cnpj", message: "CNPJ deve ter 14 caracteres alfanuméricos" },
    { status: 400 },
  );
}
// ...
const upstream = await fetch(`${BACKEND_URL}/geral/cnpj/${chars}`, { ... });
```

> **Observação:** o nome `digits`/`chars` é semântico — `digits` sugere só números. Renomear para `chars` em toda a função para clareza.

## Escopo Cirúrgico

### Paths allowlist

- `app/routes/api/geral.cnpj.$cnpj.ts` (modificar — único arquivo do escopo)

### Paths proibidos

- `app/lib/**` (T001-T004)
- `app/components/**` (T005)
- `app/routes/api/auth-*.ts`, outros BFFs (escopo é só `geral.cnpj`)
- Backend NestJS — flag em `cross-sprint.json`

## Acceptance Criteria

- [ ] BFF importa `getAlphanumeric` de `~/lib/cnpj-format`
- [ ] BFF **NÃO** contém `replace(/\D/g, "")` em nenhum lugar (verificar via grep pós-edição)
- [ ] Validação trocada: `chars.length !== 14` em vez de `digits.length !== 14`
- [ ] Mensagem de erro: `"CNPJ deve ter 14 caracteres alfanuméricos"` (não "14 dígitos")
- [ ] Status code 400 preservado
- [ ] Path enviado para `BACKEND_URL` contém letras intactas: `AB12C3DE45F678` chega como `AB12C3DE45F678` no NestJS
- [ ] `Cookie` propagation preservada (`request.headers.get("cookie")`)
- [ ] `catch` (502 fetch_failed) preserva mensagem genérica
- [ ] `npm run typecheck` passa

## Notas LGPD / Compliance

- O BFF **NÃO** deve logar o CNPJ no console — `console.error` do `catch` atual não loga a `raw`, então está OK. Manter sem mudança.
- O backend NestJS (que consome este BFF) precisa aceitar letras — **flag em `cross-sprint.json`** (cross-repo).

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** manter `replace(/\D/g, "")` em nenhuma linha deste BFF (RAG §6 Antipatrão 1).
- ❌ **NÃO** deletar a constante `raw` (linha 13) — ela é a entrada do `params.cnpj`.
- ❌ **NÃO** trocar `BACKEND_URL` por valor hard-coded.
- ❌ **NÃO** adicionar validação de DV aqui — o BFF é proxy puro (validação fica no `new-startup-schema.ts` no client e no backend NestJS).
- ❌ **NÃO** introduzir cache local no BFF — o backend já tem cache Redis (24h) mencionado nos comentários do arquivo.

## Ponteiros de Contexto

- **RAG:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (§3.5, §6)
- **AGENTS.md relevante:** `app/routes/AGENTS.md`, `app/lib/AGENTS.md` (API-CONFIG STRUCTURE — "`BACKEND_URL` constante resolvida em build")
- **Consumer:** `app/components/founder/corporate-identity.tsx` (linha 118) e `app/routes/private/create-startup.tsx` (linha 130) — T005 atualiza o caller
- **Declaração da rota:** `app/routes.ts` linha 62 — `route("geral/cnpj/:cnpj", "routes/api/geral.cnpj.$cnpj.ts")` (não modificar)

## Dependências

- **Upstream:** T002 (helper `getAlphanumeric`)
- **Downstream:** T007 (testes de integração do BFF)

## Status Final Esperado

BFF `app/routes/api/geral.cnpj.$cnpj.ts` propagando CNPJ alfanumérico intacto para o backend. ZERO `replace(/\D/g, "")`. Mensagem de erro atualizada. `npm run typecheck` verde.