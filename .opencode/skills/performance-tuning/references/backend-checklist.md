# Backend Checklist — Verificações por Endpoint

Checklist B1–B12 aplicada a **cada endpoint** do NestJS (controllers + services). Foco em queries Prisma, cache Redis, paginação, índices e PKI.

> **Convenção:** módulos em `backendnode/src/api/<domínio>/`. Services em `*.service.ts` (geralmente > 1000 LOC). Controllers delegam para services via injeção.

---

## B1 — N+1 Query (Include Profundo)

**Critério:** `prisma.*.findMany/findUnique` com `include` > 3 níveis OU sem projeção deve ser refatorado.

**Comando:**
```bash
rg -B2 -A15 "findMany|findUnique" backendnode/src/api/ -g '*.service.ts' | rg -A10 "include:"
```

**Anti-pattern conhecido (`payment.service.ts:findOne`):**
```typescript
this.prisma.payment.findUnique({
  where: { id },
  include: {
    serviceDetails: true,
    subscription: { include: { plan: true } },
    investment: true,
    campaign: { include: { startup: true } },
    couponUsages: { include: { coupon: true } },
    refunds: true,
  },
});
```

**Correto:**
```typescript
this.prisma.payment.findUnique({
  where: { id },
  select: {
    id: true,
    status: true,
    amount: true,
    serviceDetails: { select: { id: true, status: true } },
    subscription: { select: { plan: { select: { slug: true } } } },
  },
});
```

**Severidade:** Bloqueante — em tabelas grandes, include sem projeção escala O(n×m).

---

## B2 — findMany Sem `take`

**Critério:** `prisma.*.findMany` deve sempre ter `take` (mesmo que paginação seja intencional, limite explícito evita OOM).

**Comando:**
```bash
rg -B1 -A8 "findMany" backendnode/src/api/ -g '*.service.ts' | rg -A5 'orderBy:'
```

**Anti-pattern conhecido (`uploads.service.ts:findByUser/findByStartup`):**
```typescript
async findByUser(userId: number): Promise<any[]> {
  return this.prisma.upload.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}
```

**Severidade:** Bloqueante — user com 1000+ uploads trava request.

---

## B3 — 30+ Agregados Sem Cache

**Critério:** Services que fazem `Promise.all([...])` com > 5 agregados Prisma devem usar cache Redis (TTL apropriado).

**Comando:**
```bash
rg -c "Promise.all" backendnode/src/api/ -g '*.service.ts' | awk -F: '$2 > 5'
rg -B2 -A2 "Promise.all" backendnode/src/api/admin/admin-dashboard-summary.service.ts
```

**Anti-pattern conhecido:**
```typescript
// admin-dashboard-summary.service.ts:74-234
const [users, startups, investments, ...] = await Promise.all([
  this.prisma.user.aggregate({ ... }),
  this.prisma.startup.aggregate({ ... }),
  this.prisma.investment.aggregate({ ... }),
  // ... 27 mais
]);
```

**Correto:**
```typescript
const cached = await this.redis.get('admin:dashboard:summary');
if (cached) return JSON.parse(cached);

const [users, ...] = await Promise.all([...]);
const result = { users, /*...*/ };

await this.redis.set('admin:dashboard:summary', JSON.stringify(result), 'PX', 30_000);
return result;
```

**Severidade:** Bloqueante — dashboard admin é `/admin/dashboard`, principal ferramenta do ADMIN.

---

## B4 — Cache Ausente em Endpoints Quentes

**Critério:** Endpoints com > 10 req/min devem cachear (Redis) com TTL baseado em volatilidade do dado.

**Comando:**
```bash
rg -l "cacheManager\|@InjectRedis" backendnode/src/api/
rg -c "@InjectRedis" backendnode/src/api/ -g '*.service.ts'
```

**Política:**
- País, Estado, Cidade, Categoria, Tipo Documento: TTL 24h (imutável)
- Planos de assinatura: TTL 1h (mudança rara)
- Configurações financeiras: TTL 1h (já existe `financial_configs`)
- Marketplace featured: TTL 5min (já documentado em CASE.md)
- Transparency feed: TTL 5min (já documentado)
- User profile: TTL 5min (invalidação on-update)

**Severidade:** Alta — sem cache, cada leitura = 1 query SQLite.

---

## B5 — Paginação Offset em Tabelas Grandes

**Critério:** Endpoints com tabela > 10k rows devem usar **cursor-based pagination** (Prisma `cursor` + `take`) OU offset com limite explícito de `skip ≤ 1000`.

**Comando:**
```bash
rg -B1 -A2 'skip:' backendnode/src/api/ -g '*.service.ts' | awk -F'skip: ' '{print $2}' | sort -un | tail -20
```

**Anti-pattern conhecido:**
```typescript
const payments = await this.prisma.payment.findMany({
  skip: (page - 1) * 25,
  take: 25,
});
// page = 1000 → escaneia 25000 rows antes de retornar 25
```

**Severidade:** Média — degrada progressivamente, não é imediato.

---

## B6 — Índices Faltantes

**Critério:** Queries com `WHERE col1, col2 ORDER BY createdAt` devem ter índice composto `@@index([col1, col2, createdAt])`.

**Comando:**
```bash
rg "@@index\|@@unique" backendnode/prisma/schema.sqlite.prisma | wc -l
rg "@@index\(\[userId" backendnode/prisma/schema.sqlite.prisma
rg -B2 "where:.*userId.*createdAt" backendnode/src/api/ -g '*.service.ts'
```

**Lacunas conhecidas (de exploration prévio):**
- `Payment(userId, createdAt)` — admin financeiro por usuário
- `Investment.allocatedAt` — dashboard agregados por data
- `WebhookLog[eventType, receivedAt]` — reconciliação EFI

**Severidade:** Média — em SQLite, scan sem índice é O(n) na tabela.

---

## B7 — PKI Síncrono Bloqueia Event Loop

**Critério:** `signPdf` em `signature.service.ts` usa `node-forge` (JS puro, síncrono) e bloqueia event loop por 50–200ms.

**Comando:**
```bash
rg -B1 -A3 "node-forge\|pkcs12" backendnode/src/signature/
rg -A10 "async signPdf" backendnode/src/signature/signature.service.ts
```

**Mitigação:**
- Mover para Worker Thread (`worker_threads`)
- Ou fila RabbitMQ (`payments.effects` — adicionar `signature.effects` queue)
- Cache da conversão PEM→P12 (1x por boot)

**Severidade:** Alta — assinatura de termo de adesão é caminho quente do signup de startup.

---

## B8 — Logging no Hot Path

**Critério:** `LoggingInterceptor` que faz `JSON.stringify` em todo request adiciona latência. Usar logger assíncrono (pino, winston) com sample rate.

**Comando:**
```bash
rg -B1 -A10 "LoggingInterceptor" backendnode/src/common/interceptors/
rg -A5 "JSON.stringify" backendnode/src/common/interceptors/logging.interceptor.ts
```

**Severidade:** Baixa — impacto cumulativo, mas real.

---

## B9 — SCAN O(N) em Sessões

**Critério:** `invalidateAllUserSessions` itera todas as chaves `session:*` no Redis. Para > 1000 sessões ativas, considerar `SCAN` com `MATCH session:{userId}:*` específico.

**Comando:**
```bash
rg -B2 -A15 "invalidateAllUserSessions\|scanIterator" backendnode/src/auth/session/session.service.ts
```

**Severidade:** Baixa — operação rara (revogação manual), mas custo cresce.

---

## B10 — Cron Síncrono com HTTP Externo

**Critério:** `payment.cron.ts:expirePendingPayments` chama 100x EFI sequencial a cada 15min. Mover para batch paralelo com `Promise.allSettled`.

**Comando:**
```bash
rg -B2 -A20 "expirePendingPayments" backendnode/src/api/payment/payment.cron.ts
```

**Severidade:** Alta — bloqueia outros crons (event loop) durante janela crítica.

---

## B11 — Throttler `email: 5/h` Global

**Critério:** Bug conhecido: throttler `email: 5/h` está aplicado globalmente e bloqueia rotas sem auth (`/uploads`). Todos controllers públicos devem ter `@SkipThrottle({ email: true })`.

**Comando:**
```bash
rg -l "@SkipThrottle" backendnode/src/api/
rg -l "@Controller" backendnode/src/api/ -g '*.controller.ts' | wc -l
```

**Severidade:** Média — bug conhecido, mas funcional com workaround.

---

## B12 — CORS Wildcard com Credenciais

**Critério:** `origin: true + credentials: true` permite qualquer origem com cookies. Vetor de risco conhecido.

**Comando:**
```bash
rg -A5 "enableCors" backendnode/src/main.ts
```

**Severidade:** Média — não é bug de perf direto, mas vetor de ataque que pode amplificar carga (DDoS).

---

## Procedimento de Auditoria por Endpoint

Para cada controller:

1. Listar todas as rotas (`@Get`, `@Post`, etc)
2. Para cada rota:
   - Identificar service chamado
   - Contar queries Prisma (`rg "this.prisma\."`)
   - Verificar cache Redis (B4)
   - Verificar projeção (B1)
   - Verificar `take` em `findMany` (B2)
   - Verificar índices usados (B6)
3. Medir latência média via `EXPLAIN QUERY PLAN` (SQLite)
4. Gerar entrada na seção "Detalhamento por endpoint" do relatório

---

## Métricas por Endpoint (template)

```markdown
### Endpoint: GET /api/admin/dashboard/summary
- **Controller**: admin-dashboard.controller.ts
- **Service**: admin-dashboard-summary.service.ts
- **Auth**: ADMIN role guard
- **Queries Prisma**: 30+ (Promise.all, sem cache)
- **Cache Redis**: NENHUM
- **Índices usados**: payment.idx_campaign_status (parcial)
- **Latência média**: 1850ms (medido)
- **p95**: 2400ms | **p99**: 4200ms
- **B1**: FALHA (30 includes) | **B2**: OK (take: 20) | **B3**: FALHA (sem cache) | **B4**: FALHA | **B5**: N/A | **B6**: FALHA (2 índices faltantes) | **B7**: N/A | **B8**: OK | **B9**: N/A | **B10**: N/A | **B11**: OK | **B12**: N/A
- **Fix prioritário**: Adicionar cache Redis TTL 30s + `@@index([userId, createdAt])` em Payment
```
