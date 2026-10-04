# Marketplace — Runbook de Go-Live

**Sprint S5** — `scripts/marketplace/sprints.json :: MKT-S5-T03`

> Plano operacional para deploy do módulo marketplace (S0-S4) em produção.
> Aplicar em horário de baixo tráfego (madrugada BRT). Executar smoke tests
> antes de marcar deploy como sucesso.

## Pré-condições

- [ ] Branch `feature/marketplace-s0-s4` mergeada em `main`
- [ ] Migrations SQLite aplicadas: `prisma/migrations-sqlite/20260922000000_marketplace_pinning_score/`
- [ ] `pnpm run prisma:setup` executado (Prisma client regenerado)
- [ ] `npm run openapi:dump` regenerou `backend/docs/openapi.json` (S5-T01)
- [ ] Seed atualizado em prod: TechInnovate com `score=45` (S1 retrocomp)

## Sequência de deploy

```bash
# 1. Backend
cd backendnode
pnpm run prisma:setup
npm run openapi:dump
npm run build
pm2 restart backend

# 2. Verificar
curl -fsS http://localhost:7077/ready
curl -fsS http://localhost:7077/docs-json | jq '.paths | keys | length'   # esperado: ~250+

# 3. Smoke tests (S5-T03 — 5 testes)
npm run test:e2e:flows -- --testPathPattern="marketplace-go-live"
# esperado: 5/5 verde
```

## Rollback (se algo falhar)

| Falha | Ação |
|---|---|
| Migration quebra em prod | `rollback.sql` em `prisma/migrations-sqlite/20260922000000_marketplace_pinning_score/` (DROP COLUMN) |
| Pin manual retorna 500 | Reverter deploy do backend; pinos não persistidos |
| Cron falha em loop | Sentry alert `score_cron_duration_min > 60min`; parar manualmente |
| Cache Redis invalido | TTL natural de 5min cobre; não há impacto imediato |

## Monitoramento pós-deploy (primeiras 24h)

- [ ] Sentry: nenhum error 500 em `/admin/startups/:id/pin` ou `/marketplace/*`
- [ ] Logs: nenhum `MAX_PINNED_EXCEEDED` inesperado
- [ ] Cron `RecalculateMarketplaceScore` (S2 — quando ativado) rodou às 03:00 BRT
- [ ] Redis: chave `marketplace:featured:v1` sendo invalidada em pinos

## Smoke tests (PRD §11)

| # | Comando | Esperado |
|---|---|---|
| 1 | `sqlite DESCRIBE startups` | colunas `manuallyPinned*` + `scoreBreakdown` + `scoreLastCalculatedAt` |
| 2 | `curl http://localhost:7077/api/marketplace/featured` | 200 com ≤ 15 cards |
| 3 | `curl --cookie "session_id=..." /api/startups/1/marketplace-info` | score 45 esperado |
| 4 | `curl -X POST --cookie "session_id=$ADMIN" /api/admin/startups/4/pin` | 201 com `manuallyPinned: true` |
| 5 | `curl -X POST /internal/admin/recalculate-scores -H "X-Internal-Token: $TOKEN"` | 202 + `[SCORE-CRON] lock adquirido; recalculando scores` no log |

## Sentry alerts (S5-T02)

| Trigger | Threshold | Ação |
|---|---|---|
| `marketplace.score-recalc` duration | > 60min | Email DPO + Slack #ops-marketplace |
| Pin/unpin actions por user/dia | >= 5 | Email DPO |
| Score outlier delta | >= 50pts | Email DPO + audit flag |

Constantes em `backendnode/src/api/marketplace/marketplace.sentry.ts`.

## Endpoint de ativação manual (S5-T02)

Em staging, antes de deixar o cron 03:00 BRT rodar em produção:

```bash
# 1. Configurar token em staging (.env)
INTERNAL_ADMIN_TOKEN=<random-64-char>

# 2. Disparar recalculo manualmente
curl -X POST http://staging:7077/internal/admin/recalculate-scores \
  -H "X-Internal-Token: $INTERNAL_ADMIN_TOKEN"
# esperado: 202 Accepted + log [SCORE-CRON] lock adquirido; recalculando scores

# 3. Verificar audit log
sqlite3 prisma/dev.db "SELECT action, entityId, createdAt FROM AuditLog WHERE action='SCORE_RECALCULATED' ORDER BY createdAt DESC LIMIT 10"

# 4. Validar lock distribuido (em multi-instancia)
# A segunda chamada concorrente deve receber 202 com skip silencioso (lock ja ativo)
```

**Sem `INTERNAL_ADMIN_TOKEN`** configurado: endpoint retorna **503 Service Unavailable** (proteção contra deploy acidental em prod sem token).

## Comunicação aos founders (S5-T04 — requer aprovação)

Email para todos os founders ativos explicando o novo card "Posição no marketplace" em `/founder/dashboard`. **Não enviar sem aprovação humana** (Risco: emails em massa).

Template sugerido (curto, sem PII):
> "Oi founder! Agora você pode ver sua posição no marketplace em `/founder/dashboard`.
> O card mostra score 0-100 com breakdown de 9 critérios (KYC, documentos, selos, etc).
> Para melhorar: cadastre documentos, conquiste selos, mantenha captação ativa."