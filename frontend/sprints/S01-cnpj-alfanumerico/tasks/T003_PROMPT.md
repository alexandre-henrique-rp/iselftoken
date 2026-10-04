---
id: "T003"
status: "pending"
type: "frontend"
sprint: "S01-cnpj-alfanumerico"
milestone: "M1"
owner: "frontend"
estimatedEffort: 4
dependencies: ["T002"]
---

# Task T003 — Atualizar `new-startup-schema.ts` (regex Zod alfanumérico + DV placeholder)

## Contexto Regulatório

- **Origem:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (status `confirmed`)
- **Marco regulatório:** IN RFB 2.229/2024 — CNPJ Alfanumérico
- **Impacto direto:** RAG §3.1 (Regex de validação) + §4 (Algoritmo do DV)

## ⚠️ Blocker Documentado

O algoritmo **completo** do DV alfanumérico depende da leitura do manual técnico oficial:

- **Manual de cálculo do DV (PDF):** https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf/view
- **Arquivos de referência (códigos CNPJ):** https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/codigos-cnpj.zip/view

Sem leitura do PDF, **NÃO** inventar tabela de mapeamento letra→valor (RAG §6 Antipadrão 3 — "Implementar DV sem consultar o manual oficial" resulta em validação silenciosamente incorreta).

## Descrição

1. Atualizar `CNPJ_REGEX` (linha 3) para aceitar letras maiúsculas no radical:
   ```typescript
   // ANTES
   const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
   
   // DEPOIS
   const CNPJ_REGEX = /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/;
   ```

2. Criar helper exportado `cnpjAlfanumericoValidator()` que:
   - **Aceita** CNPJ numérico legado válido (formato antigo `00.000.000/0000-00`)
   - **Aceita** CNPJ alfanumérico formato novo (`XX.XXX.XXX/XXXX-YY`) com validação **soft** do DV (placeholder — passa + `console.warn('pending-manual-dv-review', { cnpj })`)
   - **Rejeita** comprimento incorreto
   - **Rejeita** caracteres minúsculos
   - **Rejeita** caracteres fora de `[A-Z0-9]` no radical
   - **Mensagens distintas** em PT-BR para: formato, comprimento, DV inválido (placeholder)

3. Atualizar a mensagem do Zod (linha 47) com exemplo alfanumérico:
   ```typescript
   cnpj: z
     .string()
     .regex(CNPJ_REGEX, "Formato: AB.12C.3DE/45F6-78 (letras maiúsculas e dígitos)")
     .superRefine(cnpjAlfanumericoValidator),
   ```

4. **NÃO** deletar a constante `cnpj` de `newStartupDefaults` (linha 99) — apenas confirmar que continua sendo string vazia.

## Escopo Cirúrgico

### Paths allowlist

- `app/lib/new-startup-schema.ts` (modificar — único arquivo do escopo)

### Paths proibidos

- `app/lib/mask-utils.ts` (T001)
- `app/lib/cnpj-format.ts` (T002)
- `app/lib/banking-schema.ts` (T004)
- `app/components/**` (T005)
- `app/routes/api/geral.cnpj.$cnpj.ts` (T006)
- Qualquer arquivo de teste — T007

## Acceptance Criteria

- [ ] `CNPJ_REGEX === /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/`
- [ ] Mensagem de erro do regex em PT-BR mencionando **exemplo alfanumérico** (`AB.12C.3DE/45F6-78`)
- [ ] `cnpjAlfanumericoValidator` exportado como função pura (recebe `(value: string, ctx: z.RefinementCtx) => void`)
- [ ] `cnpjAlfanumericoValidator('12.345.678/0001-90')` aceita (CNPJ legado válido) — sem warn
- [ ] `cnpjAlfanumericoValidator('AB.12C.3DE/45F6-78')` aceita com `console.warn('pending-manual-dv-review')` (soft)
- [ ] `cnpjAlfanumericoValidator('AB.12C.3DE/45F6-99')` aceita com warn (DV placeholder, validação real pendente — placeholder ignora o DV por ora)
- [ ] `cnpjAlfanumericoValidator('XX.000.000/0000-00')` rejeita com mensagem "Use apenas letras maiúsculas e dígitos"
- [ ] `cnpjAlfanumericoValidator('123')` rejeita com mensagem "CNPJ deve conter 14 caracteres no formato XX.XXX.XXX/XXXX-YY"
- [ ] `cnpjAlfanumericoValidator('12.345.678/0001-9')` rejeita (comprimento)
- [ ] `cnpjAlfanumericoValidator('')` rejeita
- [ ] `console.warn` emitido **NUNCA** loga o CNPJ em claro — usar hash se precisar para debug:
  ```typescript
  // Correto
  console.warn("cnpj-validator: pending-manual-dv-review", {
    hash: await sha256(value), // ou crypto.subtle.digest
    length: value.length,
  });
  ```
- [ ] `newStartupSchema.cnpj` aplicado com `superRefine(cnpjAlfanumericoValidator)`
- [ ] `npm run typecheck` passa

## Notas LGPD / Compliance

- **LGPD:** CNPJ é dado pessoal (mesmo sendo PJ, é identificável). O `console.warn` para debug **NÃO** deve logar o CNPJ em claro. Usar hash SHA-256 + comprimento como metadado.
- **Compliance:** Marcar esta task como `pending-manual-dv-review` (string única e pesquisável) — futuro agente ao reabrir deve ver o `console.warn` e saber que precisa atualizar para DV completo após ler o PDF.
- **Mensagens de erro:** devem distinguir "formato" / "comprimento" / "DV" para que o usuário saiba o que corrigir (RAG §6 Antipadrão 5).

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** inventar `letterToValue(ch)` com `ch.charCodeAt(0) - 'A'.charCodeAt(0)` (RAG §6 Antipatrão 3).
- ❌ **NÃO** logar CNPJ em claro no `console.warn` (LGPD).
- ❌ **NÃO** validar só regex e pular DV — o `superRefine` é obrigatório (RAG §3.1).
- ❌ **NÃO** misturar letras minúsculas no storage — sempre normalizar para maiúsculas antes da regex.
- ❌ **NÃO** criar arquivo separado (`new-startup-schema-alfanumerico.ts`) — manter em um único arquivo.
- ❌ **NÃO** hard-codar lista de letras permitidas (`A-Z`) — usar `[A-Z0-9]` para flexibilidade até o PDF ser lido.

## Ponteiros de Contexto

- **RAG:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (§3.1, §4, §6)
- **AGENTS.md relevante:** `app/lib/AGENTS.md` (SCHEMAS — "Schemas Zod com mensagens em PT-BR")
- **Schema consumidor:** `app/routes/private/create-startup.tsx` (linha 8 importa `newStartupSchema`)
- **Blocker externo:** manual-dv-cnpj.pdf — registrar data de última tentativa de leitura no audit log

## Dependências

- **Upstream:** T002 (precisa de `getAlphanumeric` para normalizar entrada antes de validar)
- **Downstream:** T005 (componentes que validam via este schema), T007 (testes)

## Status Final Esperado

Arquivo `app/lib/new-startup-schema.ts` com regex alfanumérica + `cnpjAlfanumericoValidator` exportado + DV placeholder com flag `pending-manual-dv-review`. `npm run typecheck` verde. ZERO `console.log` de debug (apenas `console.warn` permitido para o flag).