# Report Template — Auditoria de Performance

Esqueleto do relatório gerado pela skill `performance-tuning`. Salvo em:

```
docs/performance/YYYY-MM-DD-HHMM-<escopo>.md
```

---

```markdown
# Performance Audit — <escopo> — <timestamp ISO>

**Skill:** performance-tuning
**Modo:** one-shot
**Escopo:** <full | /path | top-10 | backend payment>
**Páginas auditadas:** <N> de ~290
**VUs validados:** <N> (k6)

---

## 1. Sumário Executivo (Top-10 Páginas)

| # | Página | Tipo | Auth | p95 atual | p95 meta | Gap | Fix prioritário |
|---|--------|------|------|-----------|----------|-----|-----------------|
| 1 | /admin/dashboard | SSR+private | sim | 2400ms | 500ms | -79% | Cache Redis 30s |
| 2 | /marketplace | SSR+public | não | 180ms | 100ms | -44% | StaleTime Infinity |
| 3 | /home | SSR+private | sim | 220ms | 200ms | -10% | Promise.all no loader |
| 4 | /wallet | SSR+private | sim | 380ms | 400ms | OK | — |
| 5 | /startup/:slug | SSR+public | não | 520ms | 300ms | -42% | Projeção parcial |
| 6 | /checkout/:id | SSR+private | sim | 1850ms | 3000ms | OK | — |
| 7 | /founder/dashboard | SSR+private | sim | 480ms | 500ms | OK | — |
| 8 | /financeiro/dashboard | SSR+private | sim | 920ms | 500ms | -45% | Cache 60s |
| 9 | /compliance/dashboard | SSR+private | sim | 540ms | 500ms | -7% | — |
| 10 | /api/admin/dashboard/summary | BFF | sim | 2400ms | 500ms | -79% | Cache Redis 30s |

**Capacidade estimada:** <X> VUs sustentados (meta: 500)

---

## 2. Detalhamento por Página

### 2.1 Página: /admin/dashboard

- **Path completo**: /admin/dashboard
- **Arquivo**: frontend/app/routes/private/admin/dashboard.tsx
- **Tipo**: SSR private (role: ADMIN)
- **Loader**: `requireAuthorizedUser` + 0 fetches paralelos
- **Componentes hidratados**: AdminDashboardHeader, KPIGrid, ChartsPanel, RecentActivity
- **Chunks JS**: admin.dashboard-BvRk9kiK.js (47 KB gzip)
- **BFFs chamados**: GET /api/admin/dashboard/summary

**Métricas medidas (Fase 2):**
- TTFB: 1850ms | FCP: 1800ms | LCP: 2800ms | CLS: 0.05 | TBT: 180ms
- TanStack queries: 4 (todas staleTime: 0 — refetch imediato)
- Backend hits (admin-dashboard-summary.service.ts):
  - 30+ agregados em Promise.all — SEM cache
  - 3 scans de Investment/Payment sem índice composto

**Checklist Frontend (F1–F13):**
- F1: OK (HydrationBoundary presente)
- F2: OK
- F3: OK
- F4: **FALHA** (staleTime: 0 em 4 queries)
- F5: OK
- F6: OK
- F7: **FALHA** (loader sequencial)
- F8: OK (47 KB gzip)
- F9: OK
- F10: OK
- F11: OK
- F12: OK
- F13: N/A

**Checklist Backend (B1–B12) — endpoint /api/admin/dashboard/summary:**
- B1: **FALHA** (30 includes profundos)
- B2: OK (take: 20)
- B3: **FALHA** (sem cache)
- B4: **FALHA** (sem Redis)
- B5: N/A
- B6: **FALHA** (índices faltantes: Payment[userId, createdAt])
- B7: N/A
- B8: OK
- B9: N/A
- B10: N/A
- B11: OK
- B12: N/A

**Bottlenecks identificados:**

| # | Categoria | Arquivo | Linha | Severidade | Impacto p95 |
|---|-----------|---------|-------|------------|-------------|
| 1 | Cache miss | admin-dashboard-summary.service.ts | 74-234 | Bloqueante | -1800ms |
| 2 | Index miss | schema.sqlite.prisma | — | Alta | -300ms |
| 3 | staleTime=0 | frontend/app/lib/queries.ts | — | Média | -150ms (refetch) |
| 4 | Loader sequencial | admin/dashboard.tsx | — | Média | -200ms |

**Fix sugerido (pronto para aplicar):**

```diff
--- a/backendnode/src/api/admin/admin-dashboard-summary.service.ts
+++ b/backendnode/src/api/admin/admin-dashboard-summary.service.ts
@@ -71,6 +71,12 @@ export class AdminDashboardSummaryService {
+  private readonly CACHE_KEY = 'admin:dashboard:summary';
+  private readonly CACHE_TTL = 30_000;
+
   async getSummary(): Promise<DashboardSummary> {
+    const cached = await this.redis.get(this.CACHE_KEY);
+    if (cached) return JSON.parse(cached);
+
     const [users, startups, investments, ...] = await Promise.all([...]);
+    await this.redis.set(this.CACHE_KEY, JSON.stringify(result), 'PX', this.CACHE_TTL);
     return result;
   }
```

**SLO alvo:** p95 < 500ms (gap atual: -79%)

---

### 2.2 Página: /marketplace
... (mesma estrutura)

---

## 3. Ranking Priorizado (ROI = impacto_p95 / esforço)

| Rank | Página | Fix | Impacto p95 | Esforço | ROI |
|------|--------|-----|-------------|---------|-----|
| 1 | /admin/dashboard | Cache Redis 30s | -1800ms | 2h | -900ms/h |
| 2 | /api/admin/dashboard/summary | Mesmo fix (B3) | -1800ms | (já contado) | — |
| 3 | /startup/:slug | Projeção parcial | -220ms | 4h | -55ms/h |
| 4 | /financeiro/dashboard | Cache 60s | -420ms | 1h | -420ms/h |
| 5 | /marketplace | StaleTime Infinity | -80ms | 30min | -160ms/h |

---

## 4. Cenários k6 Validados

| Cenário | VUs | Duração | p50 | p95 | p99 | Erros | SLO p95 | Status |
|---------|-----|---------|-----|-----|-----|-------|---------|--------|
| marketplace_browse | 200 | 5min | 95ms | 178ms | 320ms | 0.2% | 300ms | OK |
| auth_login | 50 | 5min | 180ms | 290ms | 480ms | 0.1% | 800ms | OK |
| checkout_flow | 30 | 5min | 1200ms | 1850ms | 2400ms | 0.5% | 3000ms | OK |
| admin_dashboard | 20 | 5min | 2100ms | 2400ms | 4100ms | 1.2% | 2000ms | **FAIL** |
| wallet_load | 200 | 5min | 280ms | 380ms | 520ms | 0.3% | 400ms | OK |

**Conclusão:** 4 de 5 cenários dentro do SLO. `/admin/dashboard` ultrapassa budget — fix prioritário.

**Total sustentado:** ~500 VUs em rajada (marketplace 200 + auth 50 + checkout 30 + admin 20 + wallet 200).

---

## 5. Plano de Ação

### Fase 1 — Quick Wins (< 1 sprint)
- [ ] **#1** Adicionar cache Redis TTL 30s em `/admin/dashboard/summary` (2h)
- [ ] **#4** Cache Redis TTL 60s em `/financeiro/dashboard` (1h)
- [ ] **#5** Alterar `staleTime: Infinity` em queries de planos/paises (30min)

### Fase 2 — Refatorações Médias (1–2 sprints)
- [ ] **#3** Projeção parcial em `/api/startups/:slug` (4h)
- [ ] Adicionar `@@index([userId, createdAt])` em Payment (2h)
- [ ] Adicionar `@@index([allocatedAt])` em Investment (2h)

### Fase 3 — Refatorações Profundas (> 2 sprints)
- [ ] Migrar paginação offset → cursor em endpoints admin (1 semana)
- [ ] Worker Thread para PKI signing (1 semana)
- [ ] Batch paralelo no cron `expirePendingPayments` (3 dias)

---

## 6. Apêndice

### 6.1 Diff Aplicado (se aprovado)
- Arquivo: `docs/performance/<timestamp>-<escopo>.patch`
- Comando de aplicação: `git apply docs/performance/<timestamp>-<escopo>.patch`
- Comando de verificação pós-fix: `bash .opencode/skills/performance-tuning/scripts/perf-scout.sh`

### 6.2 Comandos de Re-verificação
```bash
# Fase 1 (Recon)
bash .opencode/skills/performance-tuning/scripts/perf-scout.sh

# Fase 2 (Medir)
k6 run .opencode/skills/performance-tuning/templates/k6-script.js \
  --out json=docs/performance/<id>-k6.json

# Fase 5 (Verify)
@perf recheck <report-id>
```

### 6.3 Arquivos Modificados
| Arquivo | Tipo de mudança | LOC delta |
|---------|-----------------|-----------|
| admin-dashboard-summary.service.ts | +cache Redis | +12 |
| schema.sqlite.prisma | +índices | +6 |
| lib/queries.ts | staleTime Infinity | +3 |
| ... | ... | ... |

### 6.4 Métricas Agregadas
- **TTFB médio p95**: <N>ms
- **FCP médio p95**: <N>ms
- **LCP médio p95**: <N>ms
- **Queries Prisma médias**: <N>ms
- **Redis hit rate**: <N>%
- **Total chunks JS**: <N>
- **Maior chunk**: <N> KB
```
