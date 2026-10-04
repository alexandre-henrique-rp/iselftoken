---
id: "T005"
status: "pending"
type: "frontend"
sprint: "S01-cnpj-alfanumerico"
milestone: "M1"
owner: "frontend"
estimatedEffort: 3
dependencies: ["T001", "T002", "T003", "T004"]
---

# Task T005 — Atualizar componentes `founder/*` que aceitam CNPJ para não destruir letras

## Contexto Regulatório

- **Origem:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (status `confirmed`)
- **Marco regulatório:** IN RFB 2.229/2024 — CNPJ Alfanumérico
- **Impacto direto:** RAG §3.6 (Componentes de formulário)

## Descrição

Mapear e ajustar todos os pontos onde o frontend **destrói letras** do CNPJ durante digitação, lookup ou envio:

### Pontos identificados via grep (estado atual)

| Arquivo | Linha | Problema | Correção |
|---|---|---|---|
| `app/components/founder/corporate-identity.tsx` | 7 | `import { formatCnpj, getOnlyDigits, isCnpjComplete }` | Trocar `getOnlyDigits` por `getAlphanumeric` (T002) |
| `app/components/founder/corporate-identity.tsx` | 110 | `const digits = getOnlyDigits(values.cnpj)` | Trocar para `const chars = getAlphanumeric(values.cnpj)` |
| `app/components/founder/corporate-identity.tsx` | 112 | `toast.error("CNPJ deve ter 14 dígitos para a busca.")` | Trocar para `"CNPJ deve ter 14 caracteres alfanuméricos para a busca."` |
| `app/components/founder/corporate-identity.tsx` | 118 | `fetch(\`/api/geral/cnpj/${digits}\`)` | Trocar para `\`/api/geral/cnpj/${chars}\`` |
| `app/routes/private/create-startup.tsx` | 10 | mesmo import | mesmo ajuste |
| `app/routes/private/create-startup.tsx` | 122 | `const digits = getOnlyDigits(cnpjValue)` | Trocar para `const chars = getAlphanumeric(cnpjValue)` |
| `app/routes/private/create-startup.tsx` | 124 | `toast.error("CNPJ deve ter 14 dígitos para a busca.")` | Trocar para `"CNPJ deve ter 14 caracteres alfanuméricos para a busca."` |
| `app/routes/private/create-startup.tsx` | 130 | `fetch(\`/api/geral/cnpj/${digits}\`)` | Trocar para `\`/api/geral/cnpj/${chars}\`` |
| `app/routes/private/create-startup.tsx` | 199 | `cnpj: values.cnpj.replace(/\D/g, "")` | Trocar para `cnpj: getAlphanumeric(values.cnpj)` (preserva letras) |

### Arquivos que **não precisam mudar** (apenas consomem helpers)

- `app/components/founder/banking-details.tsx` — usa `FieldText` para `documentoTitular`; o tratamento é delegado ao `bankingSchema` (T004). Verificar se há alguma string hardcoded tipo "000.000.000-00" no placeholder que precise virar "AB.12C.3DE/45F6-78" ou "00.000.000/0000-00" — decisão: manter placeholder numérico para não confundir usuário.
- `app/components/founder/new-startup-step-1-identity.tsx` — apenas passa o `form` para `CorporateIdentity`; sem mudança direta.
- `app/components/founder/new-startup-step-4-banking-review.tsx` — apenas passa o `form` para `BankingDetails`; sem mudança direta.
- `app/components/founder/review-accordion.tsx` — exibe `["CNPJ", v.cnpj]` (linha 27), apenas leitura; **NÃO** modificar (a string já vem formatada via `formatCnpj`).

## Escopo Cirúrgico

### Paths allowlist

- `app/components/founder/corporate-identity.tsx` (modificar)
- `app/routes/private/create-startup.tsx` (modificar — apenas o trecho CNPJ)

### Paths observados mas **fora de escopo** desta task

- `app/components/founder/banking-details.tsx` (T004)
- `app/components/founder/new-startup-step-1-identity.tsx`
- `app/components/founder/new-startup-step-4-banking-review.tsx`
- `app/components/founder/review-accordion.tsx`
- `app/components/founder/documents-section.tsx` (apenas rótulo `"CNPJ"` no tipo de documento — sem mudança)
- `app/components/founder/address-fields.tsx` (apenas texto "Endereço da sede informado no CNPJ" — sem mudança comportamental)

## Acceptance Criteria

- [ ] `corporate-identity.tsx`: `import { formatCnpj, getAlphanumeric, isCnpjComplete }` (sem `getOnlyDigits`)
- [ ] `corporate-identity.tsx` linha 110: usa `getAlphanumeric` em vez de `getOnlyDigits`
- [ ] `corporate-identity.tsx` linha 118: propaga `${chars}` (com letras) para o BFF
- [ ] `corporate-identity.tsx` linha 112: toast mensagem atualizada para "14 caracteres alfanuméricos"
- [ ] `create-startup.tsx`: import substitui `getOnlyDigits` por `getAlphanumeric`
- [ ] `create-startup.tsx` linha 130: propaga `${chars}` para o BFF
- [ ] `create-startup.tsx` linha 199: payload preserva letras (`getAlphanumeric(values.cnpj)`)
- [ ] **ZERO** ocorrências de `replace(/\D/g, "")` em arquivos `app/components/**` ou `app/routes/private/create-startup.tsx` (buscar via grep pós-edição)
- [ ] Botão "Buscar CNPJ" continua desabilitado enquanto `isCnpjComplete` for `false` (helper já é alfanumérico após T002)
- [ ] `npm run typecheck` passa

## Notas LGPD / Compliance

- O `formatCnpj` (T002) já normaliza para maiúsculas — não introduzir normalização extra nos componentes para evitar dupla normalização.
- O payload enviado para `POST /api/startups` agora conterá letras — **verificar** com o time de backend que o endpoint aceita (registrado em `cross-sprint.json`).

## Anti-padrões Explicitamente Proibidos

- ❌ **NÃO** continuar usando `getOnlyDigits` em qualquer componente (RAG §6 Antipadrão 1).
- ❌ **NÃO** reintroduzir `replace(/\D/g, "")` no payload de envio (RAG §6 Antipatrão 1).
- ❌ **NÃO** trocar o `placeholder` do input para "AB.12C.3DE/45F6-78" — manter `00.000.000/0000-00` (placeholder é didático, não formato canônico).
- ❌ **NÃO** mexer em `review-accordion.tsx` linha 27 (`["CNPJ", v.cnpj]`) — é apenas display.
- ❌ **NÃO** introduzir nova prop `isAlfanumerico` no `CorporateIdentity` — o componente já está agnóstico via T002.

## Ponteiros de Contexto

- **RAG:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (§3.6, §6)
- **AGENTS.md relevante:** `app/components/AGENTS.md`, `app/components/founder/AGENTS.md` (se existir)
- **Tarefas relacionadas:** T001 (máscara), T002 (formatter), T003 (schema), T004 (banking schema), T006 (BFF)

## Dependências

- **Upstream:** T001, T002, T003, T004 (todas precisam estar entregues para os imports existirem)
- **Downstream:** T007 (testes)

## Status Final Esperado

Componentes `corporate-identity.tsx` e rota `create-startup.tsx` propagando letras no lookup e no payload. ZERO `getOnlyDigits` em `app/components/**` e `app/routes/private/**`. `npm run typecheck` verde.