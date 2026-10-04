---
id: "T006"
status: "pending"
type: "frontend"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "frontend"
estimatedEffort: 0.2
complexity: "simple"
dependencies: ["T005"]
---

# Task T006 — Registrar rota em `app/routes.ts`

## Contexto

O React Router 7 usa file-based routing + registro explícito em `app/routes.ts` (linhas 124-129 contêm os children de `founder/startups/:id/edit`). A nova rota `/founder/startups/:id/edit/rodada` precisa ser registrada como filho da rota layout existente.

## Descrição

Modificar `app/routes.ts:124-129` (bloco `route("founder/startups/:id/edit", "routes/private/edit-startup-layout.tsx", [...])`). Adicionar **1 linha** após `route("bancario", ...)`.

**ANTES (linhas 124-129 atuais):**

```typescript
route("founder/startups/:id/edit", "routes/private/edit-startup-layout.tsx", [
  index("routes/private/edit-startup-identidade.tsx"),
  route("time",        "routes/private/edit-startup-time.tsx"),
  route("documentos",  "routes/private/edit-startup-documentos.tsx"),
  route("bancario",    "routes/private/edit-startup-bancario.tsx"),
]),
```

**DEPOIS:**

```typescript
route("founder/startups/:id/edit", "routes/private/edit-startup-layout.tsx", [
  index("routes/private/edit-startup-identidade.tsx"),
  route("time",        "routes/private/edit-startup-time.tsx"),
  route("documentos",  "routes/private/edit-startup-documentos.tsx"),
  route("bancario",    "routes/private/edit-startup-bancario.tsx"),
  route("rodada",      "routes/private/edit-startup-rodada.tsx"),
]),
```

## Escopo Cirúrgico

### Paths allowlist (MODIFICAÇÃO)

- `app/routes.ts` (modificar — adicionar 1 linha)

### Paths proibidos

- Qualquer outro arquivo (NÃO modificar)

## Acceptance Criteria

- [ ] Linha adicionada: `route("rodada", "routes/private/edit-startup-rodada.tsx"),`
- [ ] Posição: última entrada do array children de `founder/startups/:id/edit` (após `bancario`)
- [ ] Sem alteração em outras rotas (4 rotas existentes preservadas)
- [ ] Indentação consistente com as 4 rotas anteriores (2 espaços)
- [ ] `npm run typecheck` passa
- [ ] Dev server sobe — rota `/founder/startups/:id/edit/rodada` é acessível

## Ponteiros de Contexto

- **Arquivo alvo:** `app/routes.ts:124-129`
- **Pattern:** todas as outras rotas de `founder/startups/:id/edit` seguem o mesmo shape `route("segment", "path")`
- **AGENTS.md:** `app/routes/AGENTS.md` (estrutura de rotas)

## Dependências

- **Bloqueia:** T010 (smoke test — sem rota registrada, page 404)
- **Bloqueada por:** T005 (arquivo da rota precisa existir)

## Status Final Esperado

`app/routes.ts` com +1 linha na posição correta. Typecheck verde. Navegação para `/founder/startups/:id/edit/rodada` funcional (sem 404).