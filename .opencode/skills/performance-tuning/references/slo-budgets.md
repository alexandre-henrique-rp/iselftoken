# SLO Budgets — Latência por Tipo de Rota

Budgets p50/p95/p99 para cada categoria de rota do iSelfToken. Usados pela Fase 2 (Medir) e Fase 5 (Verify) da auditoria.

> **Fonte:** baseada em exploration do codebase + comparação com SLOs típicos fintech (PCI-DSS + LGPD).

---

## 1. Rotas BFF (Same-Origin)

| Tipo | p50 | p95 | p99 | Erro aceitável |
|------|-----|-----|-----|----------------|
| **BFF autenticado** (GET) | 50ms | 200ms | 500ms | < 0.5% |
| **BFF autenticado** (POST/PATCH) | 100ms | 300ms | 800ms | < 1% |
| **BFF público** (cacheado) | 30ms | 100ms | 300ms | < 0.5% |
| **BFF público** (dinâmico) | 80ms | 250ms | 600ms | < 1% |

**Justificativa:**
- BFFs devem ser rápidos (passam por Redis para sessão)
- Erro < 1% é tolerável em fluxos de checkout (UX é mais importante que velocidade)

---

## 2. Páginas SSR (Frontend)

| Tipo | TTFB p95 | FCP p95 | LCP p95 | CLS |
|------|----------|---------|---------|-----|
| **Pública sem auth** | 200ms | 800ms | 1500ms | < 0.1 |
| **Privada auth simples** | 300ms | 1000ms | 1800ms | < 0.1 |
| **Privada auth + dashboard** | 500ms | 1500ms | 2500ms | < 0.1 |
| **Admin dashboard** | 800ms | 2000ms | 3500ms | < 0.05 |

**Justificativa:**
- Públicas sem auth: SEO e primeira impressão — TTFB crítico
- Privadas: latência adicionada por `requireAuthorizedUser` (Redis GET)
- Admin: agregados pesados (30+ queries), budget mais generoso

---

## 3. Endpoints Críticos de Negócio

| Endpoint | p50 | p95 | p99 | Erro aceitável | Notas |
|----------|-----|-----|-----|----------------|-------|
| `POST /auth` (login) | 200ms | 800ms | 1500ms | < 0.5% | Inclui bcrypt |
| `POST /auth/newcode` (2FA) | 300ms | 1000ms | 2000ms | < 1% | Email SES |
| `GET /admin/dashboard/summary` | 500ms | 2000ms | 5000ms | < 1% | 30+ agregados |
| `POST /payment` (criação) | 400ms | 1500ms | 3000ms | < 1% | EFI síncrono |
| `POST /payment/efi/webhook` | 100ms | 500ms | 1500ms | < 0.1% | Crítico (HMAC) |
| `GET /wallet` | 100ms | 400ms | 1000ms | < 0.5% | — |
| `GET /startup/:slug` | 150ms | 300ms | 800ms | < 0.5% | Rota pública SEO |
| `POST /signature` (PKI) | 200ms | 1000ms | 3000ms | < 1% | CPU-bound |

**Justificativa:**
- Login inclui bcrypt (50–100ms) + Redis SET + audit log
- Webhook PIX é tolerante a erro (retry RabbitMQ)
- PKI signing é CPU-bound (node-forge bloqueia event loop)

---

## 4. Cenários Compostos (Páginas Completas)

| Página | LCP p95 | Interações até interativo | Notas |
|--------|---------|---------------------------|-------|
| `/` (landing) | 1500ms | 2000ms | Marketing estático |
| `/marketplace` | 1800ms | 2500ms | Grid de startups |
| `/startup/:slug` | 2000ms | 3000ms | Hero + seções |
| `/login` | 800ms | 1200ms | Form simples |
| `/home` (autenticado) | 1500ms | 2000ms | Dashboard leve |
| `/wallet` | 1800ms | 2500ms | Bento editorial |
| `/checkout/:id` | 2500ms | 4000ms | Form + PIX QR |
| `/founder/dashboard` | 2200ms | 3000ms | KPIs |
| `/admin/dashboard` | 3500ms | 5000ms | 30+ agregados |
| `/compliance/dashboard` | 2500ms | 3500ms | Filtros |

**Justificativa:**
- LCP = Largest Contentful Paint (métrica Google Core Web Vitals)
- Interações = tempo até responder ao primeiro input do usuário
- Páginas admin têm budget mais alto (poucos usuários, dados densos)

---

## 5. Recursos Estáticos

| Tipo | p95 | Notas |
|------|-----|-------|
| HTML principal | 200ms | SSR |
| CSS crítico | 100ms | Inline no head |
| JS chunks (lazy) | 300ms | Carregamento sob demanda |
| JS chunks (entry) | 500ms | Bloqueia render |
| Imagens (cover) | 400ms | Lazy loading |
| Fontes (Inter) | 200ms | Preload |
| S3 presigned (PDFs, logos) | 800ms | CloudFront |

---

## 6. Queries Backend

| Tipo | p50 | p95 | Notas |
|------|-----|-----|-------|
| `findUnique` (PK) | 5ms | 20ms | SQLite é rápido para PK |
| `findFirst` (índice) | 10ms | 50ms | Depende do índice |
| `findMany` (paginado, índice) | 20ms | 100ms | Página 1 |
| `findMany` (paginado, sem índice) | 100ms | 500ms | Scan parcial |
| `findMany` (skip > 1000) | 500ms | 2000ms | Degrada O(n) |
| `aggregate` (count, sum) | 30ms | 200ms | Plano de query |
| `Promise.all` com 5+ queries | 80ms | 400ms | Paralelo |
| `Promise.all` com 30+ queries | 800ms | 2400ms | Gargalo conhecido |

---

## 7. Cache Hit Rate

| Cache | Hit rate esperado | TTL |
|-------|-------------------|-----|
| Sessão Redis | > 95% | 7d |
| System config | > 90% | 1h |
| Marketplace featured | > 80% | 5min |
| Transparency posts | > 70% | 5min |
| Lista de países | > 99% | 24h (imutável) |
| Planos | > 95% | 1h |

**Justificativa:**
- Sessão: cada request validado precisa cache hit (caso contrário, latência + DB query)
- Listas estáticas (países): hit rate muito alto, invalidação rara

---

## 8. Erro Tolerável Global

| Categoria | Erro aceitável |
|-----------|----------------|
| GET autenticado | < 0.5% |
| POST/PATCH autenticado | < 1% |
| Webhook | < 0.1% (retry) |
| Cron jobs | < 0% (deve reportar) |
| PKI signing | < 0.1% |

---

## Como Usar Esta Tabela

### Fase 2 (Medir)

Para cada página/endpoint auditado, comparar métrica medida contra o budget da categoria. Marcar como:
- **OK**: dentro do budget
- **WARN**: 1–25% acima do budget
- **FAIL**: > 25% acima do budget

### Fase 4 (Relatório)

Incluir tabela no sumário executivo com gap percentual por página.

### Fase 5 (Verify)

Re-medir após aplicar fixes. Validar que páginas FAIL viraram OK.

---

## Ajuste Fino de Budgets

Estes budgets são **iniciais**. Após 3–4 auditorias, ajustar baseado em:
- P99 real observado (se consistentemente menor, apertar)
- Feedback de UX (se usuários reclamam de lentidão, relaxar é errado)
- Mudanças de stack (ex: trocar SQLite por Postgres muda baseline)
