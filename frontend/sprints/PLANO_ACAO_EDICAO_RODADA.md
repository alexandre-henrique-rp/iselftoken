# Plano de Ação — Edição de Rodada (Tab 1: Captação + Reserva | Tab 2: Distribuição)

**Data:** 2026-07-13
**Status:** AGUARDANDO GERAÇÃO DE MICRO-PROMPTS
**Sprint target:** S19 → S23 (sequencial, 5 sprints)
**Owner frontend:** `frontend` (React Router 7)
**Owner backend (T02 cross-repo):** `backendnode` (NestJS)

---

## 1. DECISÕES APROVADAS (confirmadas com o usuário)

| # | Decisão | Escolha |
|---|---|---|
| D1 | Estrutura de navegação | **1 aba "Rodada"** com 3 secções agrupadas (segue padrão `edit-startup-time`) |
| D2 | Endpoint para update de Captação | **Novo endpoint backend** `PATCH /startup/{id}/rodada/{id}` (cross-repo, S19) |
| D3 | Forma da distribuição | **7 campos fixos**: Fundador, Desenvolvimento, Comercial, Marketing, Nuvem, Jurídico, Reserva de Caixa |
| D4 | UX do status da reserva | **Card read-only + botão "Pagar reserva"** se status PENDING |
| D5 | Estratégia de save | **2 botões na action bar**: "Salvar Captação" + "Salvar Distribuição" |

---

## 2. MAPA DE ENDPOINTS BACKEND (`/docs-json`)

### Já existentes ✅

| Verbo | Path | Função |
|---|---|---|
| GET | `/startup` | Lista startups + `roundStatus` (7 estados) |
| PATCH | `/startup/{id}/complementary` | **DISTRIBUIÇÃO %** + tese + endereço + dividendos + 3 aceites obrigatórios |
| PATCH | `/startup/{id}` | Update geral incluindo `uso_recursos[]` |
| POST | `/campaigns/{startupId}/new-round` | Criar nova rodada |
| PATCH | `/startup/{id}/rodada/{id}/pausar` | Pausar rodada (BFF já existe) |
| PATCH | `/startup/{id}/rodada/{id}/cancelar` | Cancelar rodada (BFF já existe) |
| POST | `/transactions` | Criar reserva (PENDING) |
| POST | `/transactions/{id}/confirm` | Confirmar reserva (PAID) |

### Gaps ❌ (precisam ser criados)

| Verbo | Path | Para quê |
|---|---|---|
| GET | `/startup/{id}/rodada/{id}` | Hidratar aba Rodada com terms/schedule atual |
| PATCH | `/startup/{id}/rodada/{id}` | **T02 cross-repo** — Update de metaCaptacao, equityOferecido, prazoCaptacao, dataAbertura, dataEncerramento, dataLiquidacao |

### Schemas críticos

```ts
// RecursoPercentual — usado em PATCH complementary
{ descricao: string, percentual: number (1-100) }
// Validação backend: soma === 100

// UpdateComplementaryDto — campos relevantes para esta feature
{
  dataLancamentoRodada: string (YYYY-MM-DD),
  descricaoBreve: string (50-200),
  objetivoCaptacao: string,
  esperaAlcancar: string,
  recursosPercentuais: RecursoPercentual[],
  aceiteTermosPlataforma: boolean,    // ← REQUIRED
  aceitePoliticaPrivacidade: boolean, // ← REQUIRED
  declaracaoVeracidade: boolean       // ← REQUIRED
}

// RoundStatus (7 estados — vem de GET /startup)
'sem_rodada' | 'criada_aguardando_reserva' | 'reserva_paga' | 'ativa' | 'pausada' | 'cancelada' | 'encerrada'
```

---

## 3. MAPA DE ARQUIVOS FRONTEND (gaps)

### Já existem como código (parcial/morto)

| Arquivo | Estado atual | Ação |
|---|---|---|
| `app/components/founder/round-terms.tsx` | 2 modos (edit/create), state local, **mock** | T11 refactor |
| `app/components/founder/round-schedule.tsx` | State local, **código órfão** | T12 refactor + integrar |
| `app/components/founder/token-economics-calculator.tsx` | Readonly, 2 modos, funcional | Reusar como readonly |
| `app/components/founder/token-reservation.tsx` | **Código morto** (popup + MessageEvent) | T13 avaliar (integrar ou remover) |
| `app/hooks/use-cancel-round-mutation.ts` | Funcional (apenas cancelar) | Manter |
| `app/hooks/use-pause-round-mutation.ts` | Funcional (apenas pausar) | Manter |
| `app/routes/api/startup.$id.rodada.$rodadaId.cancelar.ts` | BFF funcional | Manter |
| `app/routes/api/startup.$id.rodada.$rodadaId.pausar.ts` | BFF funcional | Manter |
| `app/lib/startup-loader.ts` `StartupDetail` | **Falta `rodadaId`** | T01 estender |
| `app/types/founder-startup.ts` `RoundStatus` | Funcional | Reusar |
| `app/routes/private/edit-startup-layout.tsx` | 4 abas (identidade/time/documentos/bancario), **onSave mock** | T19+T20 |
| `app/components/founder/edit-startup-nav.tsx` | 4 navItems | T18 adicionar 5º |

### Precisam ser criados ❌

| Categoria | Arquivos |
|---|---|
| **Lib** | `app/lib/round-update-schema.ts` (Zod) |
| **Types** | `app/types/round.ts` |
| **API BFFs** | `app/routes/api/startup.$id.rodada.$rodadaId.ts` (action PATCH + loader GET) |
| **Hooks** | `app/hooks/use-update-round-mutation.ts`, `use-update-round-resources-mutation.ts`, `use-round-query.ts` |
| **Componentes** | `round-section-headers.tsx`, `round-reservation-status-card.tsx`, `round-resources-distribution.tsx`, `round-resources-summary.tsx` |
| **Rota** | `app/routes/private/edit-startup-rodada.tsx` |
| **Test** | T22-T24 |

### Bloqueadores pré-existentes 🔴

- `app/routes/api/startups.$id.ts` é **MOCK estático** retornando "FinFlow" hardcoded — loader do layout sempre falha com dados reais
- 4 sub-rotas existentes mockam `onSave` (`toast.success("Alterações salvas (mock)")`)
- `startup-list-view.tsx:23,29` tem `rodadaId: "0"` hardcoded (T106)
- `StartupDetail` em `startup-loader.ts` não tem `rodadaId`

---

## 4. BACKLOG GRANULAR (28 tasks)

### Sprint S19 — Pré-requisitos (13h) 🔴 BLOQUEIA TUDO

| ID | Task | Tipo | Complexidade | Owner |
|---|---|---|---|---|
| **T00** | Substituir BFF mock `startups.$id.ts` por proxy real ao backend | API BFF | Simples | frontend |
| **T01** | Estender `StartupDetail` em `startup-loader.ts` → adicionar `rodadaId: string \| null` | Types | Simples | frontend |
| **T02** | Criar endpoint backend `PATCH /startup/{id}/rodada/{id}` (terms + schedule) + `GET /startup/{id}/rodada/{id}` | Backend | **Complexo** | **backend (cross-repo)** |

### Sprint S20 — Fundação front (8h)

| ID | Task | Tipo | Complexidade | Micro-prompt |
|---|---|---|---|---|
| **T03** | Criar `app/lib/round-update-schema.ts` — Zod: `roundTermsSchema`, `roundScheduleSchema`, `roundResourcesSchema`, `roundUpdateInputSchema` (refine soma=100) | Lib | Simples | — |
| **T04** | Criar `app/types/round.ts` — `RoundTerms`, `RoundSchedule`, `RoundResources`, `TokenReservationStatus` | Types | Simples | — |
| **T05** | Criar BFF `app/routes/api/startup.$id.rodada.$rodadaId.ts` (action PATCH proxy + loader GET proxy) | API BFF | Simples | — |
| **T06** | Criar query option `roundQueryOptions(id)` em `app/lib/queries.ts` | Lib | Simples | — |
| **T07** | Criar hook `app/hooks/use-update-round-mutation.ts` (PATCH terms/schedule) | Hook | Simples | — |
| **T08** | Criar hook `app/hooks/use-update-round-resources-mutation.ts` (PATCH complementary) | Hook | Simples | — |
| **T09** | Criar hook `app/hooks/use-round-query.ts` (GET rodada por id) | Hook | Simples | — |

### Sprint S21 — Componentes da aba Rodada (16h)

| ID | Task | Tipo | Complexidade | Micro-prompt |
|---|---|---|---|---|
| **T10** | Refatorar `round-terms.tsx` (modo 'edit') — RHF + Zod + onSubmit real via T07; **preservar API do modo `create`** (usado em `new-startup-step-2-offer.tsx`) | Component | **Complexo** | ✅ `T10_PROMPT.md` |
| **T11** | Refatorar `round-schedule.tsx` — RHF + Zod + onSubmit real via T07 | Component | **Complexo** | ✅ `T11_PROMPT.md` |
| **T12** | Criar `round-reservation-status-card.tsx` — card read-only com status (PENDING/PAID/CANCELED) + botão "Pagar reserva" se PENDING | Component | Médio | ✅ `T12_PROMPT.md` |
| **T13** | Criar `round-resources-distribution.tsx` — 7 inputs %, validação em tempo real (verde=100, vermelho≠100), 3 checkboxes obrigatórios no rodapé, submit via T08 | Component | **Complexo** | ✅ `T13_PROMPT.md` |
| **T14** | Criar `round-section-headers.tsx` — headers compartilhados (Captação/Distribuição) | Component | Simples | — |
| **T15** | Criar `round-resources-summary.tsx` — visual readonly dos 7 % com gráfico de pizza simples (CSS) | Component | Simples | — |

### Sprint S22 — Integração na rota edit-startup (10h)

| ID | Task | Tipo | Complexidade | Micro-prompt |
|---|---|---|---|---|
| **T16** | Criar `app/routes/private/edit-startup-rodada.tsx` — shell com 2 tabs internas (Captação / Distribuição) via state local; integrar T10-T15 | Route | **Complexo** | ✅ `T16_PROMPT.md` |
| **T17** | Adicionar "Rodada" no `edit-startup-nav.tsx` (5ª posição, entre Identidade e Time) com ícone `Coins` | Component | Simples | — |
| **T18** | Atualizar `edit-startup-layout.tsx` loader para retornar `rodadaId` no payload | Route | Simples | — |
| **T19** | Atualizar `edit-startup-action-bar.tsx` para suportar 2 actions distintas (Salvar Captação / Salvar Distribuição) | Component | Médio | ✅ `T19_PROMPT.md` |
| **T20** | Registrar nova rota em `app/routes.ts` dentro do children de `founder/startups/:id/edit` | Route | Simples | — |

### Sprint S23 — Validação + dívida (8h)

| ID | Task | Tipo | Complexidade | Owner |
|---|---|---|---|---|
| **T21** | Vitest: hook `use-update-round-mutation` (success/409/error) | Test | Simples | frontend |
| **T22** | Vitest: hook `use-update-round-resources-mutation` (success/422-soma≠100) | Test | Simples | frontend |
| **T23** | Vitest: `round-update-schema.ts` (soma=100 OK, soma=99.99 FAIL, soma=100.01 FAIL, soma=0 FAIL) | Test | Simples | frontend |
| **T24** | E2E Playwright: fluxo completo (login → edit/rodada → editar Captação → salvar → editar Distribuição → salvar) | Test | **Complexo** | frontend (tester) |
| **T25** | LGPD audit: nenhum dado pessoal de investidor exposto | Audit | Simples | frontend (lgpd-officer) |
| **T26** | Substituir `rodadaId: "0"` hardcoded em `startup-list-view.tsx` (resolver T106) | Fix | Simples | frontend |
| **T27** | Decidir destino do `token-reservation.tsx` órfão: integrar ou remover | Refactor | Simples | frontend |
| **T28** | Atualizar AGENTS.md de `app/components/founder/`, `app/routes/private/`, `app/hooks/` | Docs | Simples | frontend (documenter) |

---

## 5. CRITÉRIOS DE ACEITE GLOBAIS

- [ ] Item "Rodada" visível no nav de `/founder/startups/:id/edit` com ícone `Coins` e label "Rodada"
- [ ] **Tab 1 — Captação:** 3 campos editáveis (metaCaptacao, equityOferecido, prazoCaptacao) + 3 readonly (dataAbertura, dataEncerramento, dataLiquidacao) com Zod min/max
- [ ] **Tab 1 — Status da reserva:** Card sempre visível, mostra estado + botão "Pagar reserva" quando PENDING
- [ ] **Tab 2 — Distribuição:** 7 inputs % com validação em tempo real (verde quando soma=100, vermelho≠100), submit desabilitado até soma=100
- [ ] **Tab 2 — 3 checkboxes obrigatórios:** aceiteTermosPlataforma, aceitePoliticaPrivacidade, declaracaoVeracidade (visíveis antes do submit)
- [ ] Action bar com 2 botões: "Salvar Captação" + "Salvar Distribuição" (separados, dirtyCount independente)
- [ ] Backend validation errors (soma≠100, meta<min, equity>max) refletidos em toast com mensagem do backend
- [ ] Visual consistente com `edit-startup-time` (cores neon #d500f9, glow background, gradientes)
- [ ] Sem regressão no wizard de criação (`new-startup-step-2-offer.tsx` ainda funciona)
- [ ] Cobertura ≥ 85% (Strict) ou ≥ 70% (Lean)
- [ ] E2E Playwright cobrindo o fluxo happy path
- [ ] 0 vuln LGPD (campos não expõem dado pessoal de investidor)
- [ ] Commits semânticos: `feat(round): ...`, `fix(round): ...`, `test(round): ...`

---

## 6. RISCOS E MITIGAÇÕES

| # | Risco | Sev | Mitigação |
|---|---|---|---|
| R1 | BFF mock `startups.$id.ts` | 🔴 | T00 PREREQUISITO |
| R2 | Endpoint `PATCH /rodada/{id}` não existe | 🔴 | T02 cross-repo S19 |
| R3 | `StartupDetail` sem `rodadaId` | 🟠 | T01 antes de mutations |
| R4 | Action bar global mock chama toast sem mutation | 🟠 | T19 corrige para nova aba |
| R5 | Backend exige 3 booleanos no complementary | 🟡 | UX: 3 checkboxes no rodapé Tab 2 (T13) |
| R6 | `token-reservation.tsx` órfão | 🟡 | T27 decidir destino |
| R7 | Refactor `round-terms.tsx` pode quebrar wizard | 🟡 | T10 preservar modo `create` (regression test em T24) |
| R8 | Path singular vs plural nos BFFs | 🟢 | T00 padroniza em `/api/startup/:id/*` |

---

## 7. PRÓXIMOS PASSOS (delegações ao orchestrator)

Após aprovação deste plano, eu (orchestrator) devo:

1. **Aprovar Sprint S19** via `harness_advance` com `userApproval: true` (gate UX) — coordenar com backend para T02
2. **Aprovar Sprints S20-S23** sequencialmente conforme gate de build metrics
3. **Delegar para sub-agents:**
   - `sprint-tasker` (Phase 4) → gerar `frontend/sprints/S19.json` até `S23.json` + micro-prompts `T00_PROMPT.md` até `T28_PROMPT.md`
   - `backend` (Phase 5 worker, cross-repo) → executar T02 no repo `backendnode`
   - `frontend` (Phase 5 worker) → executar T00-T01, T03-T28 no repo `frontend`
   - `tester` (Phase 5 worker) → executar T21-T24 (Vitest + Playwright)
   - `security` + `lgpd-officer` (Phase 5) → auditar T25
   - `qa-gate` (Phase 5 portão final) → validar coverage ≥ 85% + 0 vuln
4. **Transicionar para Phase 6 (UX Gate)** após cada marco, pedindo aprovação humana

---

## 8. ESTIMATIVA CONSOLIDADA

| Sprint | Tasks | Horas | Complexidade dominante |
|---|---|---|---|
| S19 — pré-requisitos | T00-T02 | 13h | T02 backend cross-repo |
| S20 — fundação front | T03-T09 | 8h | nenhuma complexa |
| S21 — componentes | T10-T15 | 16h | T10, T11, T13 |
| S22 — integração | T16-T20 | 10h | T16 |
| S23 — validação + dívida | T21-T28 | 8h | T24 E2E |
| **TOTAL** | **28 tasks** | **~55h** | **6 tasks complexas (precisam TXXX_PROMPT.md)** |

**6 tasks marcadas como COMPLEXAS que requerem micro-prompt formal:**
- T02 (backend cross-repo)
- T10, T11, T13 (componentes com RHF + Zod + integração)
- T16 (rota nova com 2 tabs internas)
- T24 (E2E Playwright completo)

**22 tasks SIMPLES** (pode delegar inline sem micro-prompt).