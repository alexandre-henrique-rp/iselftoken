# Sprint Plan — S02-m2-debts

> **Marco regulatório:** IN RFB 2.229/2024 — CNPJ Alfanumérico, vigência operacional **julho/2026**.
> **Origem:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (v2 — inclui algoritmo oficial completo).
> **Trigger:** S01 (`b4f4e95c`) saiu do commit com **typecheck quebrado** (erros pré-existentes do Zod 4 + Resolver inference) e **DV placeholder** (DEBT-DV-001 aguardando leitura do manual oficial). A RFB republicou o manual em **junho/2026** — `manual-dv-cnpj.pdf` extraído em `/tmp/opencode/manual-dv.txt`.
> **Regra de falha:** em produção, o frontend aceita CNPJ alfanumérico **sem validar DV** (soft) — qualquer CNPJ com DV incorreto passa para o backend, que pode rejeitar ou (pior) aceitar inconsistentemente.

---

## Objetivo da Sprint

Fechar 2 dívidas residuais da **S01** e desbloquear o caminho regulatório:

1. **DEBT-ZOD-001** — restaurar `npm run typecheck` verde (4 lugares com `z.literal(true, { errorMap: ... })` incompatíveis com Zod 4 + erro `Resolver<...>` em `create-startup.tsx:83`).
2. **DEBT-DV-001** — substituir `cnpjAlfanumericoValidator` placeholder (soft-warn + `pending-manual-dv-review`) pelo **algoritmo oficial completo** do manual serpro.gov.br (`charValue = charCodeAt - 48`; pesos cíclicos 2–9; módulo 11 com borda `resto ≤ 1 → 0`).
3. **Atualização da suíte T007** — fixtures com DVs **validados** contra o algoritmo do manual + novos casos de teste (aceita com DV válido, rejeita com DV inválido, **NÃO** emite mais o warn antigo).

Resultado final: typecheck verde, cadastro de startup com validação rígida de DV alfanumérico, cobertura ampliada em `new-startup-schema.ts`.

---

## Tarefas Planejadas

### Frontend (2 tasks)

- [ ] **T008** — Zod 3→4 migration (escopo cirúrgico). Substituir `errorMap: () => ({ message: "..." })` por `message: "..."` em 4 chamadas no schema `complementaryStartupSchema` (`app/lib/new-startup-schema.ts:226-229`). Investigar e corrigir a inferência do `Resolver` em `app/routes/private/create-startup.tsx:83` (RHF v5 + Zod 4 + `.superRefine()` final produz `ZodEffects` cujo tipo diverge). (1h)
- [ ] **T009** — DV completo do CNPJ Alfanumérico. Substituir `cnpjAlfanumericoValidator` em `app/lib/new-startup-schema.ts` por implementação **REAL** do algoritmo do manual serpro.gov.br/RFB §4.1-4.5. Helpers: `charValue(ch)`, `computeDv(radical12)`. Validação em 3 etapas: regex + cálculo de DV esperado + comparação. Backward compat: CNPJ numérico legado passa pelo mesmo cálculo (sem branch). LGPD: SHA-256 hash + masked. **Remoção** do `console.warn('cnpj-validator: pending-manual-dv-review', ...)` e da string `pending-manual-dv-review`. JSDoc do validator reescrito em PT-BR. (4h)

### Test (1 task)

- [ ] **T010** — Atualizar testes T007 (fixtures + suíte). Substituir fixtures `CNPJ_ALFANUMERICO_RAW` (DVs `00` placeholder) por CNPIs cujos DVs foram **validados** contra o algoritmo do manual. Criar `app/lib/__tests__/fixtures/cnpj-alfanumerico-invalid.ts` (NOVO) com CNPJs de DV errado. Reescrever `new-startup-schema.test.ts`: adicionar testes "aceita com DV válido" / "rejeita com DV inválido" e remover/adaptar o teste de "warn `pending-manual-dv-review`". Cobertura ≥80% em `new-startup-schema.ts` (linhas E funções). (3h)

**Total: 3 tasks / 8h** (perfil lean, dentro do limite — extensão S02 enxuta porque validador está bem isolado).

---

## Acceptance Criteria (macro)

- [ ] `npm run typecheck` retorna 0 erros (DEBT-ZOD-001 fechado)
- [ ] Algoritmo de DV implementado segue literalmente `/tmp/opencode/manual-dv.txt` e RAG v2 §4.1-4.5 (DEBT-DV-001 fechado)
- [ ] `grep -rn 'pending-manual-dv-review' app/` retorna vazio (legado removido de código de produção)
- [ ] CNPJ alfanumérico com DV **válido** é aceito sem warn
- [ ] CNPJ alfanumérico com DV **inválido** é rejeitado com mensagem PT-BR distinta (`"Dígito verificador incorreto"`)
- [ ] CNPJ numérico legado continua aceito (compatibilidade S01 preservada)
- [ ] Cobertura reportada em `app/lib/new-startup-schema.ts` ≥80% (linhas E funções)
- [ ] Suíte completa `npm run test` passa — 55+ testes prévios verdes + casos novos T010
- [ ] ZERO `expect(cnpj).toBe(<literal CNPJ real>)` em testes (LGPD)
- [ ] ZERO regressão funcional: S01 (mask, formatter, BFF lookup) continua funcionando
- [ ] Sprints S01 e S02 coexistem em `sprints/` (sem delete)

---

## Algoritmo do DV (sucinto — fonte primária: `/tmp/opencode/manual-dv.txt`)

> Para detalhes completos (tabela de 36 chars, pesos, exemplos validados passo-a-passo), ver `RAG v2 §4.1-4.5` ou o snapshot do manual oficial. Implementação de referência em `RAG v2 §6 Antipadrão 3 — Implementação correta`.

```
1. charValue(ch) = ch.charCodeAt(0) - 48     // vale para 0-9 (48-57) e A-Z (65-90)
2. Pesos cíclicos [2,3,4,5,6,7,8,9] aplicados da direita para a esquerda
   • Para 12 chars radicais (DV1) [esq→dir]:  [5,4,3,2,9,8,7,6,5,4,3,2]
   • Para 13 chars radicais (DV2) [esq→dir]: [6,5,4,3,2,9,8,7,6,5,4,3,2]
3. S = Σ (valor[i] × peso[i]); resto = S mod 11
   • Se resto ≤ 1 → DV = 0
   • Senão → DV = 11 - resto
4. Exemplo validado pelo manual: "12.ABC.345/01DE" → DV1=3, DV2=5 → "12.ABC.345/01DE-35"
```

**Aplicação no formulário:** após regex validar formato (`^[A-Z0-9]{2}\\.[A-Z0-9]{3}\\.[A-Z0-9]{3}\\/[A-Z0-9]{4}-\\d{2}$`), extrair os 12 primeiros caracteres alfanuméricos e calcular DV. Comparar com os 2 últimos. **Backward compat:** o mesmo algoritmo serve para CNPJs puramente numéricos (subconjunto de `[0-9]` ⊂ `[A-Z0-9]`) — não diferenciar branch.

---

## Ordem de Execução Recomendada

```
T008 ──→ T009 ──→ T010
(sequencial estrito)
```

- **T008** libera o typecheck — pré-requisito para que T009 não reintroduza erro latente.
- **T009** implementa o validador — pré-requisito para T010 (que valida contra a API final).
- **T010** fecha a suíte.

---

## Riscos & Dependências Externas

| Item | Tipo | Quem afeta | Mitigação |
|---|---|---|---|
| `manual-dv-cnpj.pdf` | regulatório | T009 | Manual extraído em `/tmp/opencode/manual-dv.txt` (junho/2026). DEBT-DV-001 destravada — fonte primária disponível. |
| `codigos-cnpj.zip` | regulatório | monitoramento | Não-bloqueante para T009 — manual-dv não cita exclusões; algoritmo cobre os 36 caracteres `[0-9A-Z]` (RAG §4.5). |
| Simulador oficial | test-fixture | T010 | Plano: gerar fixtures via `computeDv()` local e validar contra o Simulador se acessível via webfetch durante a task. Caso contrário, documentar pendência no header da fixture. |
| Backend NestJS | cross-repo | (não-bloqueante) | Frontend valida DV localmente; backend precisa de adaptação análoga (registrado em `cross-sprint.json EXT-04`). |
| Zod 4 `/errorMap` API | técnica | T008 | Substituir por `message` direto (string) — 4 chamadas pontuais. Validar com `npm run typecheck`. |

---

## Artefatos Produzidos

- **3 tasks** T008, T009, T010 em `sprints/S02-m2-debts/tasks/`
- **Sprint JSON** `sprints/S02-m2-debts.json`
- **Cross-sprint update** `sprints/cross-sprint.json` (reabertura de DEBT-ZOD-001/DEBT-DV-001 como `in-progress-via-S02`; fechamento de EXT-01; adição de nota de monitoramento para EXT-02)
- **Index update** `sprints/index.json`

**Não produzidos nesta sprint:**
- Mudanças em `app/**` (escopo de planejamento — implementação é de responsabilidade do frontend agent na Fase 5)
- Mudanças em `.harness/state.json` ou `.harness/events.jsonl` (boundary explícito)
- Mudanças em `app/lib/__tests__/fixtures/cnpj-alfanumerico-{valid,invalid}.ts` (criadas pelos agents na Fase 5 — T010 PROMPT.md instrui)

---

## Coexistência com S01

> ⚠️ **Importante — relação com `sprints/S01-cnpj-alfanumerico/`**:
>
> A S01 está completa (`status: pending` no índice — agents ainda não marcaram como `completed`, mas commit `b4f4e95c` valida a entrega). **Esta sprint NÃO deleta nem sobrescreve** artefatos da S01. Coexistem lado a lado:
>
> - `sprints/S01-cnpj-alfanumerico/` (entregue, pendente housekeeping)
> - `sprints/S01-cnpj-alfanumerico.json`
> - `sprints/S02-m2-debts/` (esta sprint)
> - `sprints/S02-m2-debts.json`
>
> A regra é cumulativa: S02 **estende** S01 (corrige typecheck + fecha DV) sem refazer trabalho.
