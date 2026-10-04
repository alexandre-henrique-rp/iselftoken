# Relatório de Impacto e Planejamento de Migração

**Data:** 10/08/2026  
**Fonte (Alterado):** `/ronaldo/backendnode-main` + `/ronaldo/frontend-main`  
**Alvo (Base):** `/backendnode` + `/frontend`

---

## 🟢 Adições (Novas Features / Arquivos)

### Backend — Novos Módulos

| Módulo | Arquivos | Descrição |
|--------|----------|-----------|
| `api/affiliate/` | 7 arquivos | Programa completo de afiliados: adesão de startups, candidatura de afiliados, triagem (fundador → admin), comissões, links de indicação, tracking de referrals |
| `api/config/` | 3 arquivos (`config.module.ts`, `config.service.ts`, `config.constants.ts`) | Sistema de parâmetros de cálculo versionados por data (append-only). Substitui `SystemConfig` com vigência temporal |
| `api/history/` | 3 arquivos (`history.module.ts`, `history.controller.ts`, `history.service.ts`) | Histórico/auditoria unificado (timeline admin/compliance) com exportação CSV |
| `api/tokens/token-certificate.service.ts` | 1 arquivo | Geração e download de certificados PDF dos tokens |
| `api/tokens/token-reservation.service.ts` | 1 arquivo | Reserva de tokens durante pagamento (previne oversell) |
| `api/tokens/tokens.controller.ts` | 1 arquivo | Rotas REST dos tokens (carteira, detalhe, certificado, verificação pública) |

### Backend — Novos Modelos Prisma

| Modelo | Propósito |
|--------|-----------|
| `ConfigParameterValue` | Parâmetros de cálculo com vigência temporal (substitui `SystemConfig`) |
| `AffiliateProgram` | Adesão de startup ao programa de afiliados |
| `Affiliation` | Vínculo usuário↔programa (PENDING_FOUNDER → PENDING_ADMIN → ACTIVE) |
| `AffiliateReferral` | Registro de indicação (por LINK ou CHECKOUT_CODE) |
| `AffiliateCommission` | Comissão apurada por investimento confirmado |
| `TokenReservation` | Reserva de estoque de tokens durante checkout |

### Backend — Novas Migrations (a criar)

- `20260723130000_add_affiliate_program`
- `20260723140000_add_affiliate_commission_wallet_type`
- `20260723150000_add_investment_affiliate_code`
- `20260731115833_add_config_parameter_values`
- `20260801202646_add_campaign_affiliate_pct`

### Frontend — Novas Páginas/Rotas

| Arquivo | Rota | Descrição |
|---------|------|-----------|
| `routes/private/admin-affiliate.tsx` | `/admin/affiliate` | Painel admin de afiliados (programas + afiliações) |
| `routes/private/admin-config.tsx` | `/admin/config` | Tela de parâmetros de configuração admin |
| `routes/private/admin-history.tsx` | `/admin/history` | Histórico unificado de transações |
| `routes/private/affiliate-panel.tsx` | `/affiliate` | Painel do afiliado (catálogo de startups) |
| `routes/private/affiliate-commissions.tsx` | `/affiliate/financeiro` | Comissões e pendências do afiliado |
| `routes/private/founder-affiliate-triagem.tsx` | `/founder/affiliate/triagem` | Triagem de candidaturas de afiliados pelo fundador |
| `routes/private/founder-investors.tsx` | `/founder/investors` | Lista de investidores da startup |
| `routes/private/founder-new-round.tsx` | `/founder/startups/:id/new-round` | Abertura de nova rodada de captação |
| `routes/public/referral.tsx` | `/r/:code` | Redirect público do link de afiliado |
| `routes/verificar-token.$hash.tsx` | `/verificar-token/:hash` | Verificação pública de autenticidade de token |

### Frontend — Novos Componentes e Utilitários

| Arquivo | Descrição |
|---------|-----------|
| `app/components/admin/admin-kyc-list.tsx` | Componente de listagem KYC para admin |
| `app/lib/kyc-status.ts` | Helpers de status KYC |
| `app/lib/roles.ts` | Constantes e helpers de roles |
| `app/routes/api/admin.history.export.ts` | API route para exportar histórico |
| `app/routes/api/startup.$id.ts` | API route para detalhe público de startup |

---

## 🟡 Modificações (Refatorações / Fixes)

### Backend — Arquivos Modificados (87 arquivos)

#### Mudanças Estruturais Críticas

| Arquivo | Natureza da Mudança |
|---------|---------------------|
| `app.module.ts` | Remove EventEmitterModule, SystemConfigModule, V2PaymentsModule; adiciona PlatformConfigModule, TokensModule, HistoryModule, AffiliateModule |
| `api/investments/investments.service.ts` | Adiciona gate de KYC, reserva de tokens transacional, atribuição de afiliado, prevenção de oversell |
| `api/investments/investments.module.ts` | Importa AffiliateModule e TokensModule; substitui TokensService direto por TokenReservationService |
| `api/tokens/tokens.service.ts` | Adiciona TokenCertificateService, presigned URLs para certificados, verificação pública por hash |
| `api/campaigns/campaigns.service.ts` | Refatoração (remoção de lógica financeira avançada que era do modelo ADR-008) |
| `api/payment/payment.service.ts` | Modificações no fluxo de confirmação (integração com reservas + comissões) |
| `prisma/schema.prisma` | Novos modelos, novos campos em Token/Investment/Campaign, remoção de campos legados |

#### Mudanças em Controllers/Services (parciais)

- `api/admin/admin.controller.ts` — novos endpoints admin
- `api/admin/admin-financeiro.controller.ts` — ajustes financeiro
- `api/admin/admin-kyc.controller.ts` — integrações KYC
- `api/admin/admin-other.controller.ts` — endpoints administrativos diversos
- `api/admin/admin.service.ts` — métodos de suporte aos novos controllers
- `api/marketplace/marketplace.controller.ts` / `marketplace.service.ts` — ajustes
- `api/startup/startup.controller.ts` e services — refatorações de rodadas/captação
- `api/users/users.service.ts` / `users.controller.ts` — ajustes
- `api/payment/*` — múltiplos ajustes no fluxo de pagamento
- `auth/auth.service.ts` — ajustes na autenticação
- `common/storage/*` — modificações no provider de storage

### Frontend — Arquivos Modificados (54 arquivos)

#### Rotas e Pages

- `app/routes.ts` — novas rotas (affiliate, history, config, founder, referral, verificar-token)
- `app/routes/private/admin-dashboard.tsx` — ajustes no dashboard admin
- `app/routes/private/admin-kyc.tsx` — integrações com novo componente
- `app/routes/private/admin-startups.tsx` / `admin-users.tsx` — novos filtros/tabelas
- `app/routes/private/founder-dashboard.tsx` / `investor-dashboard.tsx` — melhorias
- `app/routes/private/financeiro-*.tsx` — diversas telas financeiras
- `app/routes/private/startup-detail.tsx` — página de detalhe
- `app/routes/private/checkout-payment.tsx` — campo affiliateCode no checkout
- `app/routes/api/investments.ts` / `startup.ts` / `startups.$id.ts` — API routes

#### Componentes

- `app/components/admin/*` — 15 componentes modificados (KYC, filtros, tabelas, gráficos)
- `app/components/founder/*` — 6 componentes (métricas, cards, ações)
- `app/components/investor/*` — 2 componentes (investment-card, metrics)
- `app/components/auth/register-form.tsx` — ajustes no registro
- `app/components/layout/sidebar.tsx` — novos itens de menu (affiliate, config, history)
- `app/components/startup-detail/investment-sidebar.tsx` — campo affiliateCode

#### Hooks e Types

- `app/hooks/use-register-mutation.ts` — ajustes
- `app/types/founder-startup.ts` — novos tipos

---

## ⚙️ Configurações e Ambiente

### Backend `package.json`

| Ação | Item |
|------|------|
| **Remover** | `@nestjs/event-emitter` (dependência) |
| **Renomear script** | `seed:config` → `seed:matrix` + adicionar `seed:history` |
| **Downgrade** | `undici`: ^8.2.0 → ^6.27.0 |

### Prisma Migrations

Migrations divergem a partir de `20260723`. A base possui:
- `20260723000000_add_startup_isAccelerated_for_marketplace`
- `20260723195626_add_captacao_fields_to_campaign`
- `20260729141450_add_system_config_and_campaign_snapshots`

O alterado possui (no lugar):
- `20260723130000_add_affiliate_program`
- `20260723140000_add_affiliate_commission_wallet_type`
- `20260723150000_add_investment_affiliate_code`
- `20260731115833_add_config_parameter_values`
- `20260801202646_add_campaign_affiliate_pct`

**Estratégia recomendada:** Criar novas migrations incrementais na base (não copiar timestamps do alterado) para adicionar os novos modelos e campos sem conflito com o histórico existente.

### Variáveis de Ambiente

Nenhuma variável nova identificada nos `.env.example` (verificar se há defaults implícitos no código).

---

## ⚠️ Riscos / Conflitos

### 1. **CONFLITO CRÍTICO: SystemConfig vs ConfigParameterValue**

A Base utiliza `SystemConfig` (tabela `system_configs`) com um modelo simples key-value + updatedAt.  
O Alterado **remove** esse modelo e o substitui por `ConfigParameterValue` (tabela `config_parameter_values`) com vigência temporal append-only.

**Impacto:** Todo código da Base que referencia `SystemConfigModule`, `SystemConfigService`, `SystemConfigController` e DTOs associados precisa ser migrado.

**Mitigação:** Criar migration que:
1. Cria a tabela `config_parameter_values`
2. Migra dados de `system_configs` para `config_parameter_values` (com effectiveFrom = epoch)
3. Remove a tabela `system_configs` (ou mantém como deprecated)

### 2. **CONFLITO MÉDIO: Campaigns — campos de captação e snapshots financeiros**

A Base adicionou campos de pitch/captação na Campaign (`problema`, `solucao`, `modeloReceita`, etc.) e snapshots financeiros (`adminFeeValue`, `tokenBaseValue`, etc.). O Alterado **não possui** esses campos.

**Impacto:** Perder esses campos significaria perder funcionalidade da Base.

**Mitigação:** Manter os campos da Base E adicionar os novos campos do Alterado (`affiliateCommissionPct`). Não remover `isAccelerated` nem os campos de captação.

### 3. **CONFLITO MÉDIO: V2PaymentsModule**

A Base possui `api/v2/payments/` (Payments Hub v2) com controllers de checkout, payouts, transactions, webhooks. O Alterado **remove** esse módulo inteiro.

**Impacto:** Perder o módulo de pagamentos v2 pode quebrar funcionalidades em desenvolvimento.

**Mitigação:** Preservar o V2PaymentsModule na Base. Integrar as mudanças do Alterado no módulo `api/payment/` existente sem remover o v2.

### 4. **CONFLITO MENOR: EventEmitterModule**

A Base usa `@nestjs/event-emitter` para desacoplar payment dos módulos de domínio. O Alterado remove essa dependência.

**Impacto:** Remover quebraria os event listeners existentes na Base.

**Mitigação:** Manter o EventEmitterModule na Base. As novas funcionalidades do Alterado não dependem dele.

### 5. **CONFLITO MENOR: Campaign `isAccelerated`**

A Base adicionou `isAccelerated` na Campaign para filtro de marketplace. O Alterado não tem.

**Mitigação:** Manter o campo na Base.

---

## 📋 Plano de Execução (Ordem de Implementação)

### Etapa 1: Schema Prisma (fundação)
1. Adicionar modelos novos (ConfigParameterValue, AffiliateProgram, Affiliation, AffiliateReferral, AffiliateCommission, TokenReservation)
2. Adicionar campos novos em modelos existentes (Token.investmentId, Investment.affiliateCode, Campaign.affiliateCommissionPct)
3. **Preservar** campos exclusivos da Base (isAccelerated, campos de captação, snapshots financeiros)
4. Gerar migration incremental

### Etapa 2: Backend — Novos Módulos
1. Copiar `api/config/` (PlatformConfigModule)
2. Copiar `api/affiliate/` (completo)
3. Copiar `api/history/` (completo)
4. Copiar novos arquivos de `api/tokens/` (controller, certificate, reservation)
5. Registrar no `app.module.ts` (sem remover módulos existentes da Base)

### Etapa 3: Backend — Merge Cirúrgico de Modificações
1. `api/investments/` — KYC gate + reserva transacional + affiliateCode
2. `api/tokens/tokens.service.ts` — certificados + verificação pública
3. `api/payment/` — integração com reservas e comissões
4. `api/admin/` — novos endpoints
5. `api/startup/` — ajustes de rodadas
6. `api/campaigns/` — ajustes (preservando lógica ADR-008 da Base)
7. Demais services e controllers

### Etapa 4: Frontend — Novos Arquivos
1. Copiar todas as 10 novas páginas/rotas
2. Copiar novos componentes e utilitários
3. Atualizar `app/routes.ts`

### Etapa 5: Frontend — Merge de Modificações
1. Componentes admin (KYC, filtros, tabelas)
2. Sidebar (novos menus)
3. Checkout (affiliateCode)
4. Dashboards e páginas existentes
5. Types e hooks

### Etapa 6: Validação
1. `npx prisma generate` (verificar schema)
2. Build do backend (`nest build`)
3. Build do frontend (`vite build`)
4. Testes existentes

---

## Resumo Quantitativo

| Categoria | Backend | Frontend | Total |
|-----------|---------|----------|-------|
| Arquivos novos | 17 | 17 | 34 |
| Arquivos modificados | 87 | 54 | 141 |
| Modelos Prisma novos | 6 | — | 6 |
| Novas rotas API | ~15 | 10 | ~25 |
| Conflitos críticos | 1 | 0 | 1 |
| Conflitos médios | 3 | 0 | 3 |
| Conflitos menores | 2 | 0 | 2 |
