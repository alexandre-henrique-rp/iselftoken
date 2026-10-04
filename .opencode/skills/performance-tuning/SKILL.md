---
name: performance-tuning
description: >-
  Auditoria one-shot de performance full-stack para iSelfToken (React Router 7 SSR +
  NestJS 10 + Prisma 7 + SQLite + Redis). Analisa página por página (~290 rotas)
  medindo TTFB, FCP, LCP, queries Prisma, cache Redis, waterfall de rede e
  hidratação TanStack Query. Identifica gargalos de carregamento, busca e
  renderização no frontend e no backend, e inclui template k6 para validar meta
  de 500 usuários simultâneos. Use quando pedir para auditar, medir, diagnosticar,
  otimizar, melhorar performance, reduzir TTFB/FCP/LCP, identificar gargalo, fazer
  load test, ou aumentar capacidade. Aciona também ao detectar rota lenta,
  dashboard admin com 30+ agregações, ou falta de cache em endpoints quentes.
  Escreve apenas em docs/performance/ e .opencode/skills/performance-tuning/.
---

# Performance Tuning — Auditoria Full-Stack do iSelfToken

Esta skill audita **página por página** o iSelfToken, cobrindo frontend (React Router 7 SSR + TanStack Query) e backend (NestJS + Prisma + Redis). O objetivo é identificar gargalos de carregamento, busca e renderização, priorizar fixes por ROI e validar a meta de **500 usuários simultâneos** via k6.

> **Modo one-shot:** a skill mede durante a auditoria. Não instrumenta produção continuamente. Para monitoramento contínuo, use Sentry Performance (já configurado em `instrument.ts`).

---

## 1. Princípios

1. **Página por página**: cada rota vira uma entrada no relatório. Sem agregação genérica.
2. **Causa raiz, não sintoma**: proibido apenas aumentar `take` para "esconder" lentidão.
3. **ROI antes de correção**: priorize por `impacto_p95 / esforço`. Quick wins primeiro.
4. **Read-only por padrão**: skill só escreve em `docs/performance/` e `.opencode/skills/performance-tuning/`.
5. **Aprovação humana** antes de aplicar diff: nenhum fix é aplicado sem `question`.
6. **Idempotência**: timestamp + escopo evitam colisão de relatórios.

---

## 2. Workflow (5 Fases)

```
FASE 1 — RECON
  Varredura read-only de todas as ~290 rotas
  Saída: inventário { path, tipo, auth, role, loader, queries, deps, chunk }

FASE 2 — MEDIR
  Top-15 páginas + BFFs críticos:
    Lighthouse: TTFB / FCP / LCP / CLS / TBT
    Waterfall: entry → loader → BFF → backend
    Chunk size JS + CSS
    Cache hits TanStack (staleTime efetivo)
    Queries Prisma disparadas (count + latency)
    k6: 5 cenários (marketplace, login, checkout, admin, wallet)

FASE 3 — DIAGNOSE POR PÁGINA
  Classificar bottlenecks: { categoria, arquivo, linha, severidade, fix }

FASE 4 — RELATÓRIO
  Gerar docs/performance/<timestamp>-<escopo>.md
  Estrutura: top-10 + seção por página priorizada

FASE 5 — VERIFY
  Re-rodar k6 + diff antes/depois (se diff aplicado)
```

---

## 3. Comandos CLI

| Comando | Ação | Quando usar |
|---|---|---|
| `@perf audit full` | Todas as ~290 páginas | Baseline completo |
| `@perf audit /admin/dashboard` | Análise profunda de 1 página | Investigação focada |
| `@perf audit top-10` | Apenas top-10 páginas | Sprint de otimização rápida |
| `@perf audit backend payment` | Foco em módulo NestJS | Bug específico de serviço |
| `@perf compare <A> <B>` | Diff entre 2 relatórios | CI gate |
| `@perf load-test` | Roda template k6 | Validar 500 VUs |
| `@perf recheck <report-id>` | Re-roda e marca deltas | Após aplicar fixes |

---

## 4. Estrutura de Saída

### 4.1 Relatório Markdown (`docs/performance/<timestamp>-<escopo>.md`)

```markdown
# Performance Audit — <escopo> — <timestamp>

## Sumário executivo (top-10 páginas)
| # | Página | Tipo | Auth | p95 atual | p95 meta | Gap | Fix prioritário |

## Detalhamento por página
### Página: <path>
- Loader / BFFs / TanStack queries
- TTFB / FCP / LCP / CLS
- Bottlenecks priorizados
- Fix sugerido (diff)

## Ranking priorizado (ROI)
1. [Página] Fix → impacto

## Cenários k6 validados
| Cenário | VUs sustentados | p95 medido | SLO | Status |

## Apêndice
- Diff .patch aplicado (se aprovado)
- Comandos de verificação pós-fix
```

### 4.2 Diff opcional (`docs/performance/<timestamp>-<escopo>.patch`)

Gerado apenas após `question` ao usuário. Aplica via `git apply`.

---

## 5. Catálogo de Referências

| Arquivo | Conteúdo |
|---|---|
| `references/frontend-checklist.md` | F1–F13 por página (SSR, hidratação, TanStack Query, code splitting) |
| `references/backend-checklist.md` | B1–B12 por endpoint (Prisma, Redis, paginação, índices, PKI) |
| `references/page-priority.md` | Top-15 páginas pré-mapeadas por tráfego estimado |
| `references/k6-scenarios.md` | 5 jornadas para validar 500 VUs |
| `references/slo-budgets.md` | Budgets p50/p95/p99 por tipo de rota |
| `templates/report.md` | Esqueleto do relatório final |
| `templates/k6-script.js` | Template base de load test |
| `scripts/perf-scout.sh` | Varredura read-only via ripgrep |

---

## 6. Procedimento Padrão

### Fase 1 — Recon

```bash
bash .opencode/skills/performance-tuning/scripts/perf-scout.sh
```

Coleta para cada rota:
- Path + tipo (SSR/API/BFF)
- Auth required + role
- Loader presente? (`setQueryData` + `dehydrate` + `<HydrationBoundary>`)
- Queries TanStack registradas em `lib/queries.ts`
- Tamanho do chunk JS no build

### Fase 2 — Medir

Para top-15 páginas:
```bash
npx lighthouse <url> --output=json --output-path=docs/performance/<id>-lighthouse.json
k6 run .opencode/skills/performance-tuning/templates/k6-script.js \
  --out json=docs/performance/<id>-k6.json
```

Medições paralelas:
- Backend: `EXPLAIN QUERY PLAN` em queries do service da página
- Redis: `redis-cli INFO stats` para hit rate
- Network: DevTools waterfall via Puppeteer/Playwright headless

### Fase 3 — Diagnose

Para cada bottleneck, classificar:

| Categoria | Exemplo | Severidade típica |
|---|---|---|
| **SSR/Hidratação** | Loader sem `dehydrate` | Bloqueante |
| **N+1 Query** | `include` profundo sem projeção | Bloqueante |
| **Cache miss** | Endpoint sem Redis | Alta |
| **Paginação offset** | `skip > 1000` | Média |
| **Índice faltante** | `WHERE userId, createdAt` sem `@@index` | Média |
| **Sync CPU-bound** | `node-forge` no PKI | Alta |
| **Code split ausente** | Bundle > 200KB | Média |

### Fase 4 — Relatório

Renderizar template `templates/report.md` com findings reais. Salvar em:
```
docs/performance/YYYY-MM-DD-HHMM-<escopo>.md
```

### Fase 5 — Verify (opcional, se diff aplicado)

```bash
git apply docs/performance/<id>.patch
bash .opencode/skills/performance-tuning/scripts/perf-scout.sh   # re-conferir
k6 run ...                                                      # re-medir
```

---

## 7. Restrições Obrigatórias

- **Read-only no source** — apenas `docs/performance/` + `.opencode/skills/performance-tuning/`
- **Sem novas dependências** além do binário `k6`
- **Idempotente** — timestamp + escopo evitam colisão
- **Fail-loud** se `k6` ausente — pula fase 2/5 com aviso explícito
- **Approval gate** — diff só após `question` ao usuário
- **Mirror em `.agents/skills/`** obrigatório

---

## 8. Integração com Outras Skills

| Skill | Relação |
|---|---|
| `frontend-architecture` | Complementar — auditoria runtime vs guard de arquitetura |
| `frontend-reviewer` | Complementar — style/visual vs performance/carga |
| `nestjs-best-practices` | Referência — regras `perf-use-caching`, `perf-lazy-loading` |
| `tanstack-query-best-practices` | Referência — 5 caching rules + 4 SSR rules |
| `tanstack-router-best-practices` | Referência — 6 data-loading + 3 preloading rules |
| `impeccable` | Referência — UI diagnostics via `optimize` |

---

## 9. Critérios de Sucesso da Auditoria

A auditoria é considerada bem-sucedida quando:

1. Todas as ~290 rotas foram inventariadas (Fase 1)
2. Top-15 páginas têm medições reais (Fase 2)
3. Cada bottleneck tem `{ arquivo, linha, severidade, fix }` (Fase 3)
4. Relatório Markdown salvo em `docs/performance/` (Fase 4)
5. k6 valida 500 VUs dentro dos SLOs OU lista páginas fora do budget (Fase 5)

---

## 10. Meta: 500 Usuários Simultâneos

Budget global:
- TTFB p95 < 500ms (rotas BFF)
- FCP p95 < 1.5s
- LCP p95 < 2.5s
- Taxa de erro < 1%
- Queries Prisma médias < 50ms

Páginas devem manter seus SLOs específicos (ver `references/slo-budgets.md`) sob carga de 500 VUs distribuídos em:
- 200 VUs marketplace browse
- 150 VUs auth + profile
- 80 VUs wallet
- 50 VUs checkout
- 20 VUs admin dashboard
