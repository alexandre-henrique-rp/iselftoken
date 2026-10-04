# Sprint Plan — S01-cnpj-alfanumerico

> **Marco regulatório:** IN RFB 2.229/2024 — CNPJ Alfanumérico, vigência operacional **julho/2026**.
> **Regra de falha:** a partir de `2026-07-01`, novos CNPJs atribuídos pela RFB conterão letras `[A-Z]` no radical. O código atual rejeita qualquer letra e quebra o cadastro.
> **Origem:** `.harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md` (status `confirmed`, effectiveDate `2026-07-01`).

---

## Objetivo da Sprint

Adaptar o frontend Iselftoken para aceitar, validar, formatar, transmitir e armazenar **CNPJ Alfanumérico** sem rejeitar inscrições legítimas a partir de julho/2026, mantendo **100% de compatibilidade** com CNPJs numéricos legados.

---

## Tarefas Planejadas

### Frontend (6 tasks)

- [ ] **T001** — Adaptar `app/lib/mask-utils.ts` para CNPJ alfanumérico (token `A` do `remask`). Mascara `AA.AAA.AAA/AAAA-99`. (2h)
- [ ] **T002** — Adaptar `app/lib/cnpj-format.ts` para preservar letras no radical. Helper `getAlphanumeric()` + `formatCnpj()`/`isCnpjComplete()` cientes de letras. `getOnlyDigits()` vira `@deprecated`. (2h)
- [ ] **T003** — Atualizar `app/lib/new-startup-schema.ts` (regex Zod `^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$` + custom refinement `cnpjAlfanumericoValidator` com DV placeholder — flag `pending-manual-dv-review`). (4h) ⚠️ Blocker: depende do PDF oficial da RFB
- [ ] **T004** — Atualizar `app/lib/banking-schema.ts` para aceitar 14 chars alfanuméricos no `documentoTitular` (mantém 11 dígitos para CPF). (2h)
- [ ] **T005** — Atualizar componentes `corporate-identity.tsx`, `banking-details.tsx`, `create-startup.tsx` para não destruir letras no fluxo de digitação/lookup. (3h)
- [ ] **T006** — Atualizar BFF `app/routes/api/geral.cnpj.$cnpj.ts` para propagar letras no path para o backend. (2h)

### Test (1 task)

- [ ] **T007** — Setup mínimo de **Vitest** (dívida residual — primeira vez na história do projeto) + testes unitários cobrindo: CNPJ numérico antigo, CNPJ alfanumérico novo (Simulador oficial), DV inválido, máscara com letras, integração BFF. (5h)

**Total: 7 tasks / 20h** (perfil lean, abaixo do limite de 80h).

---

## Acceptance Criteria (macro)

- [ ] 100% dos 6 pontos do RAG §3 migrados
- [ ] CNPJ numérico legado (14 dígitos) continua aceito sem regressão
- [ ] CNPJ alfanumérico (`XX.XXX.XXX/XXXX-YY` com letras no radical) aceito em todos os fluxos
- [ ] `isCnpjComplete` conta **caracteres alfanuméricos**, não dígitos
- [ ] BFF `/api/geral/cnpj/:cnpj` propaga letras no path
- [ ] `newStartupSchema.cnpj` aceita letras
- [ ] `bankingSchema.documentoTitular` aceita CNPJ alfanumérico
- [ ] Vitest configurado + suíte completa + ≥70% cobertura nos arquivos alterados (perfil lean)
- [ ] `console.warn('pending-manual-dv-review')` registrado em `cnpjAlfanumericoValidator` até leitura do manual-dv-cnpj.pdf
- [ ] ZERO `console.log` de debug nos arquivos de produção

---

## Riscos & Dependências Externas

| Item | Tipo | Quem bloqueia | Mitigação |
|---|---|---|---|
| `manual-dv-cnpj.pdf` | regulatório | T003 (DV completo) | Validação **soft** + `pending-manual-dv-review` flag |
| `codigos-cnpj.zip` | regulatório | T003 (tabela letra→valor) | Idem; sem isso não dá para validar DV alfanumérico |
| Backend NestJS | cross-repo | Lookup na Receita Federal | Frontend propaga letras; backend precisa adaptar separadamente (registrado em `cross-sprint.json`) |
| Vitest setup | técnica | T007 | Primeira configuração; perfil lean permite 70% cobertura |

---

## Ordem de Execução Recomendada

```
T001 ─┐
T002 ─┼─→ T003 ─→ T005 ─┐
      └→ T004 ─────────┤
T002 ─→ T006 ──────────┤
                       └→ T007
```

- **T001** e **T002** podem rodar em paralelo (sem dependências).
- **T003** depende de T002 (helper `getAlphanumeric`).
- **T004** depende de T002.
- **T005** depende de T001, T002, T003, T004.
- **T006** depende de T002.
- **T007** depende de todas (suíte final).

---

## Mudança de Localização de Artefatos

> ⚠️ **Nota para orchestrator:** o briefing original pediu para criar os artefatos em `.harness/sprints/S01-cnpj-alfanumerico/`, mas o hook `path-boundary.ts` do opencode **não permite** escrita em `.harness/sprints/**` (allowlist atual cobre apenas `sprints/**` na raiz e `.harness/RAG/**`, `.harness/reviews/**`, `.harness/security/**`, `.harness/qa-gate/**`, `.harness/lgpd/**`).
>
> **Decisão aplicada:** todos os arquivos desta sprint foram criados em `sprints/S01-cnpj-alfanumerico/` (raiz do projeto). O conteúdo em `.harness/sprints/S01-cnpj-alfanumerico/` é o esqueleto antigo (5 tasks desatualizadas) e pode ser apagado após validação do orchestrator.
>
> **Recomendação para o orchestrator:** ou (a) mover os artefatos de `sprints/` (raiz) para `.harness/sprints/` ajustando o hook, ou (b) atualizar o AGENTS do orchestrator para padronizar `sprints/` na raiz.