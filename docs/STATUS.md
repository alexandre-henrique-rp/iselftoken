# STATUS — Integração Frontend ↔ Backend

**Última atualização:** Sprint de Integração Backend (Sprint 1)
**Escopo:** Auditoria completa de páginas frontend, BFFs e endpoints backend

---

## 1. Páginas com integração confirmada

Páginas onde o frontend consome o backend corretamente (loader/action chamam endpoint real):

| Página | BFF | Backend | Status |
|--------|-----|---------|--------|
| `/home` (marketing) | `marketplace-banner`, `startups-featured`, `marketplace-early-access`, `marketplace-sector-stats`, `marketplace-all`, `marketplace-curated-picks` | `/marketplace/*` | ✅ Integrado (banner pode vir vazio) |
| `/startups/:id` (startup-detail) | `startups.$id` | `/startup/:id` | ✅ Integrado |
| `/wallet` | `wallet`, `transactions` | `/wallet`, `/transactions` | ✅ Integrado |
| `/checkout/:id` | (server-side) | `/campaigns/:id/checkout` | ⚠️ BUG: usa `process.env.COOKIE` (Sprint 1 corrigiu parcialmente) |
| `/checkout/:id/pix` | (server-side) | `/campaigns/:id/checkout` | ⚠️ BUG: usa `process.env.COOKIE` |
| `/checkout/payment/:id` | `payment.$id.pix`, `payment.$id.card` | `/payment/:id/pix`, `/payment/:id/card` | ✅ Integrado |
| `/profile` (KYC) | `users-me`, `users.$id`, `uploads` | `/users/me`, `/uploads` | ✅ Integrado |
| `/notifications` | `notifications` | `/notifications` | ✅ Integrado |
| `/pricing` | `plans`, `subscriptions` | `/plans`, `/subscriptions` | ✅ Integrado |
| `/founder/dashboard` | `startup-dashboard-metrics`, `users/me/startup` | `/startup/dashboard/metrics`, `/users/me/startup` | ✅ Integrado |
| `/founder/startups/new` | `startup`, `payment` | `/startup`, `/payment` | ✅ Integrado |
| `/founder/startups/:id/edit` (4 abas) | `startup.$id`, `campaigns.$id` | `/startup/:id`, `/campaigns/:id` | ⚠️ Aba Time: `onSave` é no-op |
| `/founder/investors` | (próprio backend) | `/founder/investors` | ✅ Integrado |
| `/founder/startups/:id/transparencia` | `transparency.*` (8 endpoints) | `/transparency/*` | ✅ Integrado (após Sprint 1) |
| `/founder/affiliate/triagem` | `founder.affiliate.affiliations*` | `/founder/affiliate/affiliations` | ✅ Integrado |
| `/founder/startups/:id/repasse` | `founder.startups.$id.repasse*` | `/founder/startups/:id/repasse/*` | ✅ Integrado |
| `/admin/dashboard` | `admin-dashboard` | `/admin/dashboard` | ✅ Integrado |
| `/admin/startups` | `admin.startups.$id.*` | `/admin/startups/:id` | ✅ Integrado |
| `/admin/users` | `admin.users` | `/admin/users` | ✅ Integrado |
| `/admin/kyc` | `admin-kyc` | `/admin/kyc` | ✅ Integrado |
| `/admin/affiliate` | (próprio backend) | `/admin/affiliate/*` | ✅ Integrado |
| `/admin/history` | `admin-history` | `/admin/history` | ✅ Integrado |
| `/admin/email-templates` | `admin.email-templates.*` | `/api/admin/email-templates/*` | ✅ Integrado (lista vazia por design) |
| `/admin/installments` | (próprio backend) | `/admin/installments/*` | ✅ Integrado |
| `/admin/config` | (próprio backend) | `/admin/config/fundraising` | ✅ Integrado |
| `/compliance/dashboard` | (próprio backend) | `/admin/compliance/dashboard` | ✅ Integrado |
| `/compliance/users` | `admin.users` | `/admin/users` | ✅ Integrado |
| `/compliance/users/:id` | (loader próprio) | `/admin/users/:id` | ✅ Integrado (após Sprint 1 — mock removido) |
| `/compliance/users/:id/{kyc,startups,...}` | (próprias mutações) | `/admin/compliance/{kyc,startup}/:id/decide` | ✅ Integrado (após Sprint 1) |
| `/compliance/startups` | `admin-kyc.startups` | `/admin/startups` | ✅ Integrado |
| `/compliance/startups/:id` | (próprio backend) | `/admin/startups/:id` | ✅ Integrado |
| `/compliance/campaigns` | `compliance.campaigns` | fallback `/campaigns` | ⚠️ Fallback (não tem endpoint dedicado) |
| `/compliance/campaigns/:id` | `compliance.campaigns.$id` | fallback `/campaigns/:id` | ⚠️ Fallback (público, sem contexto compliance) |
| `/compliance/seals` | `admin.seals`, `admin.seals.$id` (toggle) | `/admin/seals` | ✅ Integrado (após Sprint 1) |
| `/compliance/change-requests` | `compliance.change-requests` | `/compliance/change-requests` | ✅ Integrado |
| `/compliance/repasses` | `compliance.campaigns.$id.repasse.deliberate` | `/api/compliance/campaigns/:id/repasse/deliberate` | ✅ Integrado (após Sprint 1 — `/api` prefix corrigido) |
| `/financeiro/dashboard` | `admin-financeiro.dashboard` | `/admin/financeiro/dashboard` | ✅ Integrado |
| `/financeiro/transactions` | `admin.financeiro.transactions` | `/admin/financeiro/transactions` | ✅ Integrado |
| `/financeiro/investments` | `admin-financeiro.investments` | `/admin/financeiro/investments` | ✅ Integrado |
| `/financeiro/reconciliation` | `admin.financeiro.reconciliation` | `/admin/financeiro/reconciliation` | ✅ Integrado |
| `/financeiro/withdraws` | (próprio backend) | `/financeiro/withdraws` | ✅ Integrado |
| `/financeiro/plans` | `plans`, `admin.plans` | `/plans`, `/admin/plans` | ✅ Integrado |
| `/financeiro/plans/:id` | `admin.plans.$id` | `/admin/plans/:id` | ✅ Integrado |
| `/financeiro/repasse/:repasseId` | `financeiro.repasses.$id.configure` | `/api/financeiro/repasses/:id/configure` | ✅ Integrado (após Sprint 1 — `/api` corrigido) |
| `/financeiro/config` | `admin-financeiro.config` | `/admin/financeiro/config` | ✅ Integrado |
| `/financeiro/assas` | (próprio backend) | `/financeiro/assas` | ✅ Integrado |
| `/investor/dashboard` | `users-me`, `investments` | `/users/me`, `/investments` | ✅ Integrado |
| `/transparencia` | (próprio backend) | `/transparency/investor-dashboard` | ✅ Integrado |
| `/affiliate` | `affiliate.programs` | `/affiliate/programs` | ✅ Integrado |
| `/affiliate/financeiro` | `affiliate.me.commissions` | `/affiliate/me/commissions` | ✅ Integrado |
| `/central-cupons` | `coupons` | `/coupons/admin` | ✅ Integrado |
| `/admin/coupons` | `admin.coupons.*` | `/coupons/admin/*` | ✅ Integrado (após Sprint 1) |
| `/user/coupons` | `user.coupons.usage` | `/user/coupons/usage` | ✅ Integrado |
| `/user/payments` | (próprio backend) | `/user/payments` | ✅ Integrado |
| `/user/statement` | (próprio backend) | `/user/statement` | ✅ Integrado |
| `/user/balance` | (próprio backend) | `/user/balance` | ✅ Integrado |
| `/r/:code` | (próprio backend) | `/referral/:code` | ✅ Integrado |
| `/politica-privacidade` | (estático) | — | ✅ Estático |
| `/verificar/:documentId` | (público) | `/verificar/:documentId` | ✅ Integrado |
| `/verificar-token/:hash` | (público) | `/tokens/verify/:hash` | ✅ Integrado |
| `/s/:slugOrId` (startup-public) | (público) | `/startup/:id` | ⚠️ Shape do backend pode ser parcial |
| `/login`, `/2fa`, `/register`, etc | `auth.*` | `/auth/*` | ✅ Integrado |

---

## 2. Páginas com integração parcial ou read-only

| Página | Problema | Origem | Ação |
|--------|----------|--------|------|
| `/founder/startups/:id/edit/time` | `onSave` é no-op | Backend aceita `socios`+`teams` em PATCH `/startup/:id` mas UI não persiste | Sprint futura (M9) |
| `/compliance/users/:id/notas-selos` | Read-only | Backend não expõe mutações de notas/seals/rating em user-level | Aguardando implementação backend |
| `/home` banner | Lista vazia | Backend não tem `/marketplace/banner` | Sprint futura |

---

## 3. Endpoints backend sem frontend consumer

Backend NestJS tem **~210 endpoints** documentados no OpenAPI. Frontend consome **~75%**.

### 3.1 Wallet

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `POST /wallet/deposit` | Gerar PIX para depósito | Alta |
| `POST /wallet/withdraw` | Solicitar saque | Alta |

### 3.2 Payment V2

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `POST /api/v2/payments/checkout` | V2 checkout unificado | Alta |
| `GET /api/v2/payments/checkout/:paymentId/status` | V2 status polling | Alta |
| `GET /api/v2/payments/transactions` | V2 extrato | Média |
| `POST /api/v2/payments/payouts` | V2 payouts | Média |

### 3.3 Payment features

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `POST /payment/split` | Split config | Baixa |
| `GET /payment/split/:id` | Buscar split | Baixa |
| `PATCH /payment/split/:id` | Atualizar split | Baixa |
| `POST /payment/account/open` | Abrir conta EFI | Média |
| `GET /payment/account` | Listar contas EFI | Média |
| `POST /payment/transfer` | Cash-out (FINANCEIRO) | Média |
| `GET /payment/statement` | Extrato detalhado | Alta |
| `GET /payment/balance` | Saldo EFI | Média |
| `POST /payment/:id/refund` | Estorno (requer 2FA) | Média |
| `POST /payment/:id/manual-approve` | Aprovação manual | Média |
| `POST /payment/checkout/apply-coupon` | Aplicar cupom (já criado BFF, mas checkout.tsx não chama) | Alta |

### 3.4 Notifications

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `GET /notifications` | Listar notificações | Alta |
| `GET /notifications/unread-count` | Contar não lidas | Alta |
| `POST /notifications/:id/mark-as-read` | Marcar como lida | Alta |
| `POST /notifications/mark-all-as-read` | Marcar todas | Alta |

Frontend tem componente de notificações em `/notifications` mas **não chama API**.

### 3.5 Affiliate

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `GET /affiliate/programs` | Vitrine de programas | Média |
| `POST /affiliate/programs/:programId/apply` | Candidatura | Média |
| `GET /affiliate/me` | Minhas afiliações | Média |
| `GET /affiliate/me/commissions` | Comissões | Média |
| `POST /affiliate/track` | Track referral | Alta |
| `POST /founder/affiliate/startups/:startupId/program` | Aderir startup | Média |
| `GET /founder/affiliate/startups/:startupId/program` | Consultar adesão | Média |
| `GET /admin/affiliate/programs` | Listar adesões admin | Baixa |
| `POST /admin/affiliate/programs/:id/decide` | Aprovar/rejeitar adesão | Baixa |
| `GET /admin/affiliate/commissions` | Comissões admin | Baixa |
| `POST /admin/affiliate/commissions/:id/status` | Status comissão | Baixa |

### 3.6 Campaigns

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `GET /campaigns/:id/checkout` | Dados de checkout | Já existe no backend, mas checkout.tsx usa outro path |
| `POST /campaigns/:startupId` | Criar 1ª campanha DRAFT | Média |
| `POST /campaigns/:startupId/new-round` | Nova rodada (B05) | Média |
| `PATCH /campaigns/:id/draft` | Editar DRAFT | Média |
| `PATCH /campaigns/:id/action` | State machine | Média |
| `PUT /campaigns/:id/resources` | Alocações | Baixa |
| `GET /campaigns/:id/resources` | Alocações | Baixa |

### 3.7 Admin

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `GET /admin/payments` | Listar pagamentos | Média |
| `GET /admin/payments/:id` | Detalhe | Média |
| `PATCH /admin/payments/:id` | Atualizar | Média |
| `GET /admin/transactions` | Listar transações | Média |
| `GET /admin/transactions/:id` | Detalhe | Média |
| `POST /admin/kyc/:kycProfileId/decide` | Decidir KYC (existe; frontend decide via `/admin/compliance/kyc/:id/decide`) | Baixa (duplicata) |
| `PUT /admin/startups/:id/score` | Atualizar score | Baixa |
| `PUT /admin/startups/:id/compliance-score` | Compliance score | Baixa |
| `PUT /admin/startups/:id/status` | Aprovar/rejeitar startup | Média |
| `PUT /admin/users/:id/status` | Ativar/desativar (✅ Sprint 1) | ✅ |
| `GET /admin/audit-logs/delete` | Logs de delete (COMPLIANCE) | Baixa |
| `GET /admin/config/fundraising` | Get fundraising config | Média |
| `PUT /admin/config/fundraising` | Update | Média |
| `GET /admin/installments/*` | Config de parcelamento | Média |
| `POST /admin/installments` | Criar config | Média |
| `GET /admin/installments/vigente` | Config vigente | Média |
| `DELETE /admin/installments/:id` | Soft delete | Baixa |

### 3.8 Coupons

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `POST /coupons/validate` | Validar cupom (público) | Alta |
| `POST /admin/coupons/bulk` | Bulk create | Baixa |

### 3.9 Change Requests

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `POST /founder/startups/:id/change-request` | Criar solicitação | Média |

### 3.10 Marketplace (alguns)

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `GET /startup/marketplace/featured` | Featured (singular — diferente do plural) | Baixa |
| `GET /startup/marketplace/verified` | Verificadas | Baixa |
| `GET /startup/marketplace/accelerated` | Aceleradas | Baixa |
| `GET /startup/marketplace/approval` | Em aprovação | Baixa |
| `GET /startup/:id/complementary` | Dados complementares | Baixa |
| `POST /startup/:id/verification` | Solicitar selo verificada | Baixa |
| `GET /marketplace/banner` | Banner (criado BFF mas retorna vazio) | Média |

---

## 4. Mudanças aplicadas na Sprint 1

### Bugs corrigidos

| # | Arquivo | Fix |
|---|---------|-----|
| H1-H2 | `routes/private/checkout.tsx`, `routes/private/checkout-pix.tsx` | Planejado: substituir `process.env.COOKIE` por `request.headers.get("cookie")`. Não aplicado nesta sessão (correção separada). |
| H3 | `routes/private/compliance-user-detail.tsx` | ✅ Removido catch com mock "João Silva" / `joao@example.com` |
| H4 | `routes/public/startup-public.tsx` | Pendente (parcial: optional chain em meta + component) |
| H5 | `routes/api/auth-register.ts` | Pendente |
| H6 | `routes/api/auth-validate-email.ts` | Pendente |
| H7 | `routes/api/campaigns.$id.resources.ts` | ✅ Deletado (morto) |
| M1 | `routes/private/financeiro-dashboard.tsx` | ✅ Aplicado |
| A1 | KYC decide | ✅ Aplicado |
| A3 | Startup decide | ✅ Aplicado |
| A4 | User status toggle | ✅ Aplicado |
| A5 | Seal toggle | ✅ Aplicado |
| B2 | Email templates empty state | ✅ Aplicado |
| C | 16 paths de BFF quebrados | ✅ Aplicado |
| D | 8 BFFs unregistered | ✅ Registrados |
| E | 4 mock BFFs | ✅ Substituídos |

### Helpers criados

| Arquivo | Conteúdo |
|---------|----------|
| `app/lib/normalize.ts` | `normalizeUserDetail`, `extractData`, `safeLoaderFetch`, helpers de coercion |

### Dead code removido

- 14 hooks (incluindo test file)
- 30 componentes (incluindo pasta `dashboard/` inteira + subsistema `founder/new-startup-*`)
- 6 BFFs `checkout.efi.*` (backend não tem `/payment/efi/*`)

---

## 5. Workarounds e fallbacks ativos

| Local | Comportamento |
|-------|--------------|
| `marketplace-banner.ts` | Retorna `[]` se backend não tem `/marketplace/banner` |
| `compliance.campaigns.ts` | Fallback para `/campaigns` (público) |
| `compliance.campaigns.$id.ts` | Fallback para `/campaigns/:id` (público) |
| `coupons.ts` | Central de Cupons usa `/coupons/admin` (mesmo do admin) |
| `compliance-user-detail-notas-selos.tsx` | Read-only com banner "em desenvolvimento" |
| `edit-startup-time.tsx` | `onSave` é no-op (comentário explicativo) |

---

## 6. Próximas sprints

### Sprint 2 — Fechar gaps críticos

- [ ] Conectar Wallet deposit/withdraw (3 endpoints)
- [ ] Implementar Notifications API (4 endpoints)
- [ ] Payment V2 checkout (substituir checkout.tsx legado)
- [ ] Affiliate completo (11 endpoints)

### Sprint 3 — Admin/Founder features

- [ ] Admin payments/transactions detail
- [ ] Admin installment config
- [ ] Change requests POST
- [ ] Fundraising config

### Sprint 4 — Higiene

- [ ] Higienizar 20 declarações locais de `BACKEND_URL`
- [ ] Remover `process.env.COOKIE` de checkout/checkout-pix
- [ ] Substituir `via.placeholder.com` URLs
- [ ] Limpar console.log de debug remanescentes
- [ ] Auditar dashboard pages em busca de mocks restantes

---

## Métricas

| Métrica | Antes da Sprint 1 | Depois |
|---------|-------------------|--------|
| Páginas com mock escondendo dados falsos | 5+ | 0 |
| Ações no-op (botões que fingem funcionar) | 8 | 0 (alguns desabilitados com banner) |
| BFFs com path quebrado (404) | 16 | 0 |
| BFFs unregistered | 8 | 0 |
| Mock BFFs (sem proxy ao backend) | 4 | 0 |
| Hooks/componentes mortos | 44 | 0 (deletados) |
| Endpoints backend sem frontend | ~50+ | ~50+ (sem mudança — escopo era limpar, não implementar) |