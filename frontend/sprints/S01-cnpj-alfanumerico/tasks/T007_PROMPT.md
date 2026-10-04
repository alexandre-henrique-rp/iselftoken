---
id: "T007"
status: "pending"
type: "test"
sprint: "S01-cnpj-alfanumerico"
milestone: "M1"
owner: "tester"
estimatedEffort: 5
dependencies: ["T001", "T002", "T003", "T004", "T005", "T006"]
---

# Task T007 — Setup Vitest + testes unitários de CNPJ alfanumérico

## Contexto

- **Primeira configuração de Vitest** na história do projeto (dívida residual reconhecida em `AGENTS.md` raiz — "NO tests configured - No Vitest, Jest, or testing infrastructure").
- **Stack atual de testes:** apenas `@playwright/test` (E2E) — `package.json` `devDependencies` não tem `vitest`.
- **Profile:** lean → cobertura mínima **70%** por linha nos arquivos alterados.
- **Origem regulatória:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (§4.2 item 5 — testes contra Simulador oficial)

## Descrição

### Parte A — Setup Vitest

1. **Instalar:**
   ```bash
   npm install --save-dev vitest@^2 @vitest/coverage-v8@^2 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6
   ```

2. **Criar `vitest.config.ts`** (na raiz do projeto):
   ```typescript
   import { defineConfig } from "vitest/config";
   import react from "@vitejs/plugin-react"; // ou equivalente
   import path from "node:path";

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: "jsdom",
       globals: true,
       setupFiles: ["./vitest.setup.ts"],
       coverage: {
         provider: "v8",
         reporter: ["text", "html", "json-summary"],
         include: [
           "app/lib/cnpj-format.ts",
           "app/lib/mask-utils.ts",
           "app/lib/new-startup-schema.ts",
           "app/lib/banking-schema.ts",
           "app/routes/api/geral.cnpj.$cnpj.ts",
         ],
         thresholds: {
           lines: 70,
           functions: 70,
           branches: 60,
           statements: 70,
         },
       },
     },
     resolve: {
       alias: {
         "~": path.resolve(__dirname, "./app"),
       },
     },
   });
   ```

3. **Atualizar `package.json` scripts:**
   ```json
   {
     "scripts": {
       "test": "vitest --run",
       "test:watch": "vitest",
       "test:coverage": "vitest --run --coverage"
     }
   }
   ```

4. **Criar `vitest.setup.ts`** (matchers do `@testing-library/jest-dom`).

### Parte B — Suíte de testes

#### `app/lib/__tests__/cnpj-format.test.ts`

- `getAlphanumeric` com CNPJ legado mascarado
- `getAlphanumeric` com CNPJ alfanumérico mascarado
- `getAlphanumeric` com letras minúsculas (normalizado)
- `getAlphanumeric('')` → `''`
- `formatCnpj` com CNPJ numérico legado (14 dígitos)
- `formatCnpj` com CNPJ alfanumérico (14 chars)
- `formatCnpj` com input parcial progressivo
- `formatCnpj('')` → `''`
- `isCnpjComplete` true/false nos casos acima

#### `app/lib/__tests__/mask-utils.test.ts`

- `MASK_PATTERNS.CNPJ === 'AA.AAA.AAA/AAAA-99'`
- `applyCnpjMask` idempotente
- `applyCnpjMask` aceita letras (do Simulador oficial)
- `cnpjMaskHandler` não quebra em onChange com letras

#### `app/lib/__tests__/new-startup-schema.test.ts`

- `newStartupSchema.cnpj` aceita CNPJ legado
- `newStartupSchema.cnpj` aceita CNPJ alfanumérico formato novo (3+ casos do Simulador oficial)
- `newStartupSchema.cnpj` rejeita comprimento curto
- `newStartupSchema.cnpj` rejeita minúsculas
- `cnpjAlfanumericoValidator` aceita com `console.warn('pending-manual-dv-review')` em CNPJ alfanumérico

#### `app/lib/__tests__/banking-schema.test.ts`

- `bankingSchema.documentoTitular` aceita CPF
- `bankingSchema.documentoTitular` aceita CNPJ legado
- `bankingSchema.documentoTitular` aceita CNPJ alfanumérico
- `bankingSchema.documentoTitular` aceita com minúsculas (normalizado)
- `bankingSchema.documentoTitular` rejeita 12/13 chars alfanuméricos

#### `app/routes/api/__tests__/geral.cnpj.$cnpj.test.ts`

- Mock de `fetch` global
- BFF retorna 400 com `chars.length !== 14`
- BFF propaga letras para `BACKEND_URL` no path
- BFF repassa `Cookie`
- BFF retorna 502 em caso de `fetch failed`
- BFF propaga `data` do body em caso de sucesso

### Casos do Simulador oficial (CNPJs alfanuméricos válidos)

> ⚠️ **Pendência:** o Simulador oficial (https://www.gov.br/pt-br/servicos/simulador-cnpj-alfanumerico) gera CNPIs sob demanda — o agente executor deve gerar **mínimo 3 CNPIs válidos** durante a execução desta task e **registrá-los como fixtures** em `app/lib/__tests__/fixtures/cnpj-alfanumerico-valid.ts`. **Não inventar** CNPIs — usar os do Simulador.

Para a **parte A (Vitest setup)**, é possível usar exemplos placeholder e atualizar quando o Simulador for consultado. Para a **parte B final**, fixtures devem vir do Simulador.

## Escopo Cirúrgico

### Paths allowlist (CRIAÇÃO)

- `vitest.config.ts` (novo, na raiz)
- `vitest.setup.ts` (novo, na raiz)
- `app/lib/__tests__/cnpj-format.test.ts` (novo)
- `app/lib/__tests__/mask-utils.test.ts` (novo)
- `app/lib/__tests__/new-startup-schema.test.ts` (novo)
- `app/lib/__tests__/banking-schema.test.ts` (novo)
- `app/lib/__tests__/fixtures/cnpj-alfanumerico-valid.ts` (novo)
- `app/routes/api/__tests__/geral.cnpj.$cnpj.test.ts` (novo)
- `package.json` (modificar — adicionar scripts)

### Paths proibidos

- `app/lib/cnpj-format.ts`, `mask-utils.ts`, `new-startup-schema.ts`, `banking-schema.ts` (T001-T004 implementam — não duplicar)
- `app/routes/api/geral.cnpj.$cnpj.ts` (T006)
- `app/components/**`, `app/routes/private/**` (T005)

## Acceptance Criteria

- [ ] `npm run test` executa suíte completa sem erros
- [ ] `npm run test:coverage` reporta cobertura ≥70% nos arquivos listados no `coverage.include`
- [ ] Suíte cobre (mínimo): 5 testes para `cnpj-format`, 3 para `mask-utils`, 6 para `new-startup-schema`, 5 para `banking-schema`, 4 para BFF
- [ ] ZERO `console.log` de debug nos arquivos de produção (grep pós-execução)
- [ ] Apenas `console.warn` em `cnpjAlfanumericoValidator` para flag `pending-manual-dv-review`
- [ ] Fixtures de CNPJ alfanumérico geradas **do Simulador oficial** (não inventadas)
- [ ] Cobertura mínima 70% em cada arquivo alterado (linhas E funções)
- [ ] `npm run typecheck` continua passando
- [ ] Documentação mínima no topo de cada arquivo de teste (1-2 linhas sobre o que testa)

## Notas LGPD / Compliance

- Fixtures de CNPJ em arquivos `__tests__/fixtures/` são **públicos** (estarão em git) — usar CNPIs gerados pelo Simulador oficial, **nunca** CNPJs reais.
- Não incluir CNPJ real em logs de teste (asserts com `expect(cnpj).toBe(...)` são OK porque são strings literais geradas para teste).

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** inventar CNPJs alfanuméricos para fixtures — **somente do Simulador oficial**.
- ❌ **NÃO** usar CNPJs reais em testes (LGPD).
- ❌ **NÃO** mockar `cnpj-format.ts` nos testes dele (testar a implementação real).
- ❌ **NÃO** configurar `thresholds: { lines: 100 }` — perfil lean aceita 70%.
- ❌ **NÃO** adicionar snapshot testing (`toMatchSnapshot`) para CNPJ — manter assertions explícitas.
- ❌ **NÃO** pular testes de borda (entrada vazia, comprimento curto, minúsculas).
- ❌ **NÃO** deletar nenhum arquivo `.test.ts` pré-existente (não há nenhum no projeto, mas a regra vale para housekeeping futuro).

## Ponteiros de Contexto

- **RAG:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (§4.2 item 5)
- **AGENTS.md raiz:** "NO tests configured - No Vitest, Jest, or testing infrastructure"
- **Vitest docs:** https://vitest.dev/
- **Simulador oficial:** https://www.gov.br/pt-br/servicos/simulador-cnpj-alfanumerico
- **Playwright existente (referência):** `package.json` `devDependencies` já tem `@playwright/test` e `playwright`

## Dependências

- **Upstream:** T001, T002, T003, T004, T005, T006 (TODAS — testes cobrem todas)
- **Downstream:** nenhum (suíte final desta sprint)

## Status Final Esperado

Vitest configurado + 5 arquivos de teste + 1 fixture file + scripts `test`, `test:watch`, `test:coverage` em `package.json`. Cobertura ≥70% nos 5 arquivos alterados. `npm run test:coverage` verde.