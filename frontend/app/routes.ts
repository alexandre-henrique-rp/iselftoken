import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  // Public Routes
  index("routes/public/index.tsx"),
  route("login", "routes/public/login.tsx"),
  route("2fa", "routes/public/2fa.tsx"),
  route("register", "routes/public/register.tsx"),
  route("forgot-password", "routes/public/forgot-password.tsx"),
  route("reset-password", "routes/public/reset-password.tsx"),
  route("validate-email", "routes/public/validate-email.tsx"),
  // LGPD Art. 9 — Política de Privacidade pública e versionada (S00 T00-02).
  route("politica-privacidade", "routes/public/politica-privacidade.tsx"),
  // Termos de Uso — CVM 88/2022 (equity crowdfunding tokenizado).
  route("termos-de-uso", "routes/public/termos-de-uso.tsx"),
  // Página de manutenção (pagamentos desabilitados)
  route("manutencao", "routes/public/manutencao.tsx"),
  // Link público de divulgação do afiliado: captura ?ref= e leva ao cadastro.
  route("r/:code", "routes/public/referral.tsx"),
  // Fase A.6 — landing do link "Nao fui eu" do email de alerta de login novo.
  // Publica (sem layout autenticado) para que o user consiga abrir mesmo
  // apos ter sido desconectado pelo dismiss.
  route("auth/confirm-login", "routes/auth.confirm-login.tsx"),
  route("auth/dismiss-session", "routes/auth.dismiss-session.tsx"),
  // Preview do fundador: logado, sem layout (sem sidebar/topnav)
  route("startup/:slug/preview", "routes/startup.$slug.preview.tsx"),
  // Página pública canônica por slug (sem layout autenticado)
  route("startup/:slug", "routes/public/startup.tsx"),
  // Alias legado mantido para links antigos; novas URLs devem usar /startup/:slug.
  route("s/:slugOrId", "routes/public/startup-public-legacy.tsx"),
  // Sitemap dinâmico para SEO
  route("sitemap.xml", "routes/sitemap[.]xml.ts"),
  // Catch-all para /.well-known/* (Chrome DevTools, app manifests)
  route(".well-known/*", "routes/well-known.ts"),

  // api routes (proxy to backend)
  ...prefix("api", [
    route("auth", "routes/api/auth.ts"),
    route("auth/logout", "routes/api/auth-logout.ts"),
    route("auth/newcode", "routes/api/auth-newcode.ts"),
    route("auth/validate-email", "routes/api/auth-validate-email.ts"),
    route("auth/forgot-password", "routes/api/auth-forgot-password.ts"),
    route("auth/reset-password", "routes/api/auth-reset-password.ts"),
    route("auth/verify-code", "routes/api/auth-verify-code.ts"),
    route("auth/access", "routes/api/auth-access.ts"),
    route("auth/status", "routes/api/auth-status.ts"),
    // Fase A.6 — dismiss-session endpoint (link "Nao fui eu" no email de alerta)
    route("auth/confirm-login", "routes/api/auth.confirm-login.ts"),
    route("auth/dismiss-session", "routes/api/auth.dismiss-session.ts"),
    route("auth/register", "routes/api/auth-register.ts"),
    route("auth/dev/2fa-code", "routes/api/auth-dev-2fa-code.ts"),
    route("affiliate/track", "routes/api/affiliate-track.ts"),
    route("users/me", "routes/api/users-me.ts"),
    route(
      "users/me/liveness-telemetry",
      "routes/api/users-me.liveness-telemetry.ts",
    ),
    // Notificações — BFF proxy (list + unread-count + mark-as-read + mark-all)
    route(
      "notifications/unread-count",
      "routes/api/notifications.unread-count.ts",
    ),
    route(
      "notifications/mark-all-as-read",
      "routes/api/notifications.mark-all-as-read.ts",
    ),
    // Static segments acima DEVEM ficar antes do :id param route abaixo.
    route(
      "notifications/:id/mark-as-read",
      "routes/api/notifications.$id.mark-as-read.ts",
    ),
    route("notifications", "routes/api/notifications.ts"),
    route("plans", "routes/api/plans.ts"),
    route("plans/:id", "routes/api/plans.$id.ts"),
    route("admin/plans", "routes/api/admin.plans.ts"),
    route("admin/plans/:id", "routes/api/admin.plans.$id.ts"),
    route("admin/plans/:id/stats", "routes/api/admin.plans.$id.stats.ts"),
    route("admin/payments", "routes/api/admin.payments.ts"),
    route("admin/payments/:id", "routes/api/admin.payments.$id.ts"),
    route("subscriptions", "routes/api/subscriptions.ts"),
    route("subscriptions/:id", "routes/api/subscriptions.$id.ts"),
    route("subscriptions/:id/cancel", "routes/api/subscriptions.$id.cancel.ts"),
    route("uploads/:id/status", "routes/api/uploads.$id.status.ts"),
    route("uploads", "routes/api/uploads.ts"),
    route("country", "routes/api/country.ts"),
    route("startups/featured", "routes/api/startups-featured.ts"),
    route("startups/opportunities", "routes/api/startups-opportunities.ts"),
    route("startups/recently-added", "routes/api/startups-recently-added.ts"),
    // Static segments above (startups/featured, startups/opportunities,
    // startups/recently-added) MUST stay before this :id param route.
    // React Router resolves by specificity, so it's safe today, but
    // reordering could silently break the static routes if the :id
    // param matched them first.
    route("startups/slug/:slug", "routes/api/startups.slug.ts"),
    route("pdf-proxy", "routes/api/pdf-proxy.ts"),
    // Legacy BFF por ID mantido para edição de startup.
    route("startups/:id", "routes/api/startups.$id.ts"),
    route("startups", "routes/api/startups.ts"),
    route("payment/startup-checkout", "routes/api/payment.startup-checkout.ts"),
    route("payment/checkout", "routes/api/payment.checkout.ts"),
    route("payment/simulate", "routes/api/payment.simulate.ts"),
    // Static segments above (payment/startup-checkout, payment/checkout) MUST
    // stay before the :id param routes below — RR matches by order and a :id
    // route would greedy-match "startup-checkout" or "checkout".
    route("payment", "routes/api/payment.ts"),
    route("payment/:id", "routes/api/payment.$id.ts"),
    route("payment/:id/pix", "routes/api/payment.$id.pix.ts"),
    route("payment/:id/card", "routes/api/payment.$id.card.ts"),
    route(
      "payment/:id/installments",
      "routes/api/payment.$id.installments.ts",
    ),
    route("admin/installments", "routes/api/admin.installments.ts"),
    route(
      "admin/installments/vigente",
      "routes/api/admin.installments.vigente.ts",
    ),
    route(
      "payment/:id/simulate-paid",
      "routes/api/payment.$id.simulate-paid.ts",
    ),
    // Gerar Novo Pagamento — recria cobrança de reserva expirada (fluxo §1/§4)
    route("payment/:id/regenerate", "routes/api/payment.$id.regenerate.ts"),
    route(
      "admin/financeiro/transactions",
      "routes/api/admin.financeiro.transactions.ts",
    ),
    route(
      "admin/financeiro/comprovantes",
      "routes/api/admin.financeiro.comprovantes.ts",
    ),
    route(
      "admin/financeiro/payments/:id/approve",
      "routes/api/admin.financeiro.payments.$id.approve.ts",
    ),
    route(
      "admin/financeiro/payments/:id/cancel",
      "routes/api/admin.financeiro.payments.$id.cancel.ts",
    ),
    route(
      "admin/financeiro/subscriptions/:id/cancel",
      "routes/api/admin.financeiro.subscriptions.$id.cancel.ts",
    ),
    route(
      "admin/financeiro/reconciliation",
      "routes/api/admin.financeiro.reconciliation.ts",
    ),
    route("config/fundraising", "routes/api/config.fundraising.ts"),
    route("admin/config/fundraising", "routes/api/admin.config.fundraising.ts"),
    route("admin/config/parameters", "routes/api/admin.config.parameters.ts"),
    route("admin/config/categories", "routes/api/admin.config.categories.ts"),
    // Dashboard executivo (KPIs + série mensal de GMV + crescimento + 2 filas) — consumido por /admin/dashboard.
    // Static segment acima DEVEM ficar antes do :id param route abaixo.
    route("admin/dashboard", "routes/api/admin.dashboard.ts"),
    // Auditoria do split financeiro (repasse × lucro plataforma) — S18.6+
    route("admin/financeiro/split", "routes/api/admin.financeiro.split.ts"),
    route(
      "admin/financeiro/split/:campaignId",
      "routes/api/admin.financeiro.split.$campaignId.ts",
    ),
    route(
      "admin/financeiro/split/:campaignId/export",
      "routes/api/admin.financeiro.split.$campaignId.export.ts",
    ),
    // Payouts consolidados (S4)
    route("admin/payouts", "routes/api/admin.payouts.ts"),
    route(
      "admin/payouts/installments/:installmentId/scheduled-date",
      "routes/api/admin.payouts.installments.$installmentId.scheduled-date.ts",
    ),
    // Finalizar definitivamente (definir parcelas) — admin-payout-management §3.6
    route(
      "admin/payouts/:campaignId/finalize",
      "routes/api/admin.payouts.$campaignId.finalize.ts",
    ),
    route(
      "admin/compliance/dashboard",
      "routes/api/admin.compliance.dashboard.ts",
    ),
    route(
      "admin/startups/:id/delete",
      "routes/api/admin.startups.$id.delete.ts",
    ),
    // Admin — approve/reject de resgates pendentes (fila pendingRedemptions).
    // Static segments acima DEVEM ficar antes do :id param route abaixo.
    route(
      "admin/withdrawals/:id/approve",
      "routes/api/admin.withdrawals.$id.approve.ts",
    ),
    route(
      "admin/withdrawals/:id/reject",
      "routes/api/admin.withdrawals.$id.reject.ts",
    ),
    route("geral/cnpj/:cnpj", "routes/api/geral.cnpj.$cnpj.ts"),
    route("geral/cep/:cep", "routes/api/geral.cep.$cep.ts"),
    route("testimonials/investors", "routes/api/testimonials-investors.ts"),
    route("testimonials/startups", "routes/api/testimonials-startups.ts"),
    route("marketplace/banner", "routes/api/marketplace-banner.ts"),
    route("marketplace/early-access", "routes/api/marketplace-early-access.ts"),
    route(
      "marketplace/early-access/ranking",
      "routes/api/marketplace-early-access-ranking.ts",
    ),
    route("marketplace/sector-stats", "routes/api/marketplace-sector-stats.ts"),
    route("marketplace/all", "routes/api/marketplace-all.ts"),
    route(
      "marketplace/curated-picks",
      "routes/api/marketplace-curated-picks.ts",
    ),
    route("startup", "routes/api/startup.ts"),
    route("startup/draft", "routes/api/startup.draft.ts"),
    // Compliance — decidir KYC (M9-S27 Sprint Compliance-QuickWins)
    route(
      "compliance/kyc/:id/decide",
      "routes/api/compliance.kyc.$id.decide.ts",
    ),
    // Admin — listar e detalhar usuários KYC (GET)
    route("admin/kyc", "routes/api/admin.kyc.ts"),
    // Admin — decidir documento KYC pelo perfil administrativo real
    route("admin/kyc/:id/decide", "routes/api/admin.kyc.$id.decide.ts"),
    // O detalhe genérico deve permanecer depois da rota estática de decisão.
    route("admin/kyc/:id", "routes/api/admin.kyc.$id.ts"),
    // Compliance — decidir startup
    route(
      "compliance/startup/:id/decide",
      "routes/api/compliance.startup.$id.decide.ts",
    ),
    // Admin — toggle status do usuário
    route("admin/users/:id/status", "routes/api/admin.users.$id.status.ts"),
    // Admin — detalhe do usuário (proxy GET para /admin/users/:id no backend)
    route("admin/users/:id", "routes/api/admin.users.$id.ts"),
    // Admin — escrita de startups deve ficar antes do detalhe :id.
    route(
      "admin/startups/:id/status",
      "routes/api/admin.startups.$id.status.ts",
    ),
    route("admin/startups/:id/score", "routes/api/admin.startups.$id.score.ts"),
    // Ação "Coroar" — incremento de score (pós-Fase 3). Static segment, antes do :id.
    route(
      "admin/startups/:id/score/increment",
      "routes/api/admin.startups.$id.score.increment.ts",
    ),
    // Gates de pagamento por fase (S2) — segmento adicional, antes do :id.
    route(
      "admin/startups/:id/payment-status",
      "routes/api/admin.startups.$id.payment-status.ts",
    ),
    // Admin — listagem de startups (proxy GET para /admin/startups no backend)
    route("admin/startups", "routes/api/admin.startups.ts"),
    // Admin — detalhe e edição da startup (proxy GET/PATCH)
    route("admin/startups/:id", "routes/api/admin.startups.$id.ts"),
    // Admin — CRUD do catálogo de serviços (proxy para /admin/services do backend)
    route("admin/services", "routes/api/admin.services.ts"),
    // Histórico de decisões de auditoria (aprovar/rejeitar) por fase
    route(
      "admin/startups/:id/review-decisions",
      "routes/api/admin.startups.$id.review-decisions.ts",
    ),
    // Admin — toggle active de selo
    route("admin/seals/:id", "routes/api/admin.seals.$id.ts"),
    route(
      "startup/dashboard/metrics",
      "routes/api/startup-dashboard-metrics.ts",
    ),
    // Detalhe público da startup consumido por /startups/:id (routes/private/startup-detail.tsx).
    // Static segments acima (startup, startup/dashboard/metrics) DEVEM ficar antes
    // deste :id param route — RR resolve por especificidade.
    route("startup/:id/resubmit", "routes/api/startup.$id.resubmit.ts"),
    route("startup/:id", "routes/api/startup.$id.ts"),
    route(
      "startup/:id/complete-stage2",
      "routes/api/startup.$id.complete-stage2.ts",
    ),
    route("startup/:id/draft", "routes/api/startup.$id.draft.ts"),
    route("startup/:id/banking", "routes/api/startup.$id.banking.ts"),
    route("startup/:id/pitch", "routes/api/startup.$id.pitch.ts"),
    route("startup/:id/documents", "routes/api/startup.$id.documents.ts"),
    // Static document-NA routes must precede the generic :docId route.
    route("startup/:id/documents/na", "routes/api/startup.$id.documents.na.ts"),
    route(
      "startup/:id/documents/na/:categoria",
      "routes/api/startup.$id.documents.na.$categoria.ts",
    ),
    // Lista investidores CONFIRMED da startup (founder-investors.tsx). LGPD-safe.
    route("startup/:id/investors", "routes/api/startup.dashboard.investors.ts"),
    route(
      "startup/:id/documents/:docId",
      "routes/api/startup.$id.documents.$docId.ts",
    ),
    route(
      "startup/:id/documents/:docId/download",
      "routes/api/startup.$id.documents.$docId.download.ts",
    ),
    route("investments", "routes/api/investments.ts"),
    route("investments/my-startups", "routes/api/investments.my-startups.ts"),
    route("wallet/assets", "routes/api/wallet.assets.ts"),
    route("investments/:id/cancel", "routes/api/investments.$id.cancel.ts"),
    route(
      "investments/:id/confirmation",
      "routes/api/investments.$id.confirmation.ts",
    ),
    route("seals", "routes/api/seals.ts"),
    route("seals/startup/:id", "routes/api/seals-startup.ts"),
    route("admin/seals", "routes/api/admin.seals.ts"),
    route(
      "admin/seals/startup/:startupId/:sealId",
      "routes/api/admin.seals.startup.$startupId.$sealId.tsx",
    ),
    route(
      "admin/seals/startup/:startupId",
      "routes/api/admin.seals.startup.$startupId.tsx",
    ),
    route("admin/users", "routes/api/admin.users.ts"),
    route("admin/audit-logs", "routes/api/admin.audit-logs.ts"),
    route("admin/document-requests", "routes/api/admin.document-requests.ts"),
    route(
      "admin/document-requests/:id/cancel",
      "routes/api/admin.document-requests.$id.cancel.ts",
    ),
    route(
      "founder/document-requests",
      "routes/api/founder.document-requests.ts",
    ),
    route("founder/payments", "routes/api/founder.payments.ts"),
    route("founder/services", "routes/api/founder.services.ts"),
    route(
      "founder/document-requests/:id/fulfill",
      "routes/api/founder.document-requests.$id.fulfill.ts",
    ),
    route(
      "admin/startups/:id/documents",
      "routes/api/admin.startups.$id.documents.ts",
    ),
    // Review de documento por Admin/Compliance (aprovar/rejeitar) — fluxo §2
    route(
      "admin/startups/:id/documents/:docId/review",
      "routes/api/admin.startups.$id.documents.$docId.review.ts",
    ),
    route("verificar/:documentId", "routes/api/verificar.$documentId.ts"),
    // Affiliate (founder triagem)
    route(
      "founder/affiliate/affiliations",
      "routes/api/founder.affiliate.affiliations.ts",
    ),
    route(
      "founder/affiliate/affiliations/:id/decide",
      "routes/api/founder.affiliate.affiliations.$id.decide.ts",
    ),
    // B13 — Solicitação de alteração dados bloqueados (M9-S27)
    route(
      "founder/startups/:id/change-requests",
      "routes/api/founder.startups.$id.change-requests.ts",
    ),
    // S3-T01 — Marketplace position (score + breakdown + pin) do founder
    route(
      "founder/startups/:id/marketplace-info",
      "routes/api/founder.startups.$id.marketplace-info.ts",
    ),
    // Captacao (dados consolidados da Campaign ativa para o founder)
    route(
      "founder/startups/:id/captacao",
      "routes/api/founder.startups.$id.captacao.ts",
    ),
    route(
      "founder/startups/:id/summary",
      "routes/api/founder.startups.$id.summary.ts",
    ),
    // S4-T03 — Lista de pinos manuais (Admin)
    route(
      "admin/marketplace/pinned",
      "routes/api/admin.marketplace.pinned.ts",
    ),
    route(
      "founder/startups/:id/termo-adesao",
      "routes/api/founder.startups.$id.termo-adesao.ts",
    ),
    // B12 — Repasse de Fundos (M9-S26). BFF para status NF + initiate (idempotente).
    // A UI canonica do repasse vive em /founder/campaigns/:campaignId/financeiro;
    // este endpoint BFF continua existindo para o backend de repasse.
    route(
      "founder/startups/:id/repasse",
      "routes/api/founder.startups.$id.repasse.ts",
    ),
    // Prorrogação da captação (dados) — PRD_RECEBIMENTO §6.3
    route(
      "founder/startups/:id/prorrogacao",
      "routes/api/founder.startups.$id.prorrogacao.ts",
    ),
    // FIN-11 BFFs: dashboard, installments request/resubmit, financeiro approve/reject/mark-paid, compliance deliberate, financeiro configure
    // Legacy: por startupId (mantido para retrocompatibilidade — redireciona internamente)
    route(
      "founder/startups/:id/repasse/dashboard",
      "routes/api/founder.startups.$id.repasse.dashboard.ts",
    ),
    // Preferida: por campaignId (repasse e 1:1 com Campaign)
    route(
      "founder/campaigns/:campaignId/repasse/dashboard",
      "routes/api/founder.campaigns.$campaignId.repasse.dashboard.ts",
    ),
    // PATCH de captação da campanha do founder (loader da página /captacao)
    route(
      "founder/campaigns/:campaignId",
      "routes/api/founder.campaigns.$campaignId.ts",
    ),
    // PUT de alocações de recursos da campanha (substitui todas em 1 tx atômica)
    route(
      "founder/campaigns/:campaignId/resources",
      "routes/api/founder.campaigns.$campaignId.resources.ts",
    ),
    route(
      "founder/startups/:id/repasse/installments/:installmentId/request",
      "routes/api/founder.startups.$id.repasse.installments.$installmentId.request.ts",
    ),
    route(
      "founder/startups/:id/repasse/installments/:installmentId/resubmit",
      "routes/api/founder.startups.$id.repasse.installments.$installmentId.resubmit.ts",
    ),
    route(
      "founder/startups/:id/repasse/request",
      "routes/api/founder.startups.$id.repasse.request.ts",
    ),
    route(
      "financeiro/installments/:installmentId/approve",
      "routes/api/financeiro.installments.$installmentId.approve.ts",
    ),
    route(
      "financeiro/installments/:installmentId/reject",
      "routes/api/financeiro.installments.$installmentId.reject.ts",
    ),
    route(
      "financeiro/installments/:installmentId/mark-paid",
      "routes/api/financeiro.installments.$installmentId.mark-paid.ts",
    ),
    route(
      "financeiro/installments/:installmentId/mark-paid-comprovante",
      "routes/api/financeiro.installments.$installmentId.mark-paid-comprovante.ts",
    ),
    route(
      "compliance/campaigns/:id/repasse/deliberate",
      "routes/api/compliance.campaigns.$id.repasse.deliberate.ts",
    ),
    route(
      "financeiro/repasses/:id/configure",
      "routes/api/financeiro.repasses.$id.configure.ts",
    ),
    route(
      "compliance/change-requests",
      "routes/api/compliance.change-requests.ts",
    ),
    route(
      "compliance/change-requests/:id",
      "routes/api/compliance.change-requests.$id.ts",
    ),
    route("compliance/campaigns", "routes/api/compliance.campaigns.ts"),
    route("compliance/campaigns/:id", "routes/api/compliance.campaigns.$id.ts"),
    route("admin/history", "routes/api/admin-history.ts"),
    route("admin/history/export", "routes/api/admin.history.export.ts"),
    route("categories", "routes/api/categories.ts"),
    route("admin/email-templates", "routes/api/admin.email-templates.ts"),
    route(
      "admin/email-templates/:slug",
      "routes/api/admin.email-templates.$slug.ts",
    ),
    route(
      "admin/email-templates/:slug/versions",
      "routes/api/admin.email-templates.$slug.versions.ts",
    ),
    route(
      "admin/email-templates/:slug/versions/:id",
      "routes/api/admin.email-templates.$slug.versions.$id.ts",
    ),
    route(
      "admin/email-templates/:slug/versions/:id/publish",
      "routes/api/admin.email-templates.$slug.versions.$id.publish.ts",
    ),
    route(
      "admin/email-templates/:slug/versions/:id/preview",
      "routes/api/admin.email-templates.$slug.versions.$id.preview.ts",
    ),
    // Central de Cupons (ADMIN + COMPLIANCE + FINANCEIRO)
    route("coupons", "routes/api/coupons.ts"),
    route("coupons/available", "routes/api/coupons.available.ts"),
    // Admin — CRUD de cupons (hooks useCreateCoupon/useToggleCouponStatus/useCouponAudit)
    route("admin/coupons", "routes/api/admin.coupons.ts"),
    route("admin/coupons/:id", "routes/api/admin.coupons.$id.ts"),
    route("admin/coupons/:id/status", "routes/api/admin.coupons.$id.status.ts"),
    route("admin/coupons/:id/usages", "routes/api/admin.coupons.$id.usages.ts"),
    route("admin/coupons/:id/audit", "routes/api/admin.coupons.$id.audit.ts"),
    // User — histórico pessoal de cupons
    route("user/coupons/usage", "routes/api/user.coupons.usage.ts"),
    // Compliance fee (founder) — gera (ou retorna idempotentemente) Payment PENDING
    route(
      "founder/compliance-fee",
      "routes/api/founder.compliance-fee.ts",
    ),
    // Payment — aplicar cupom ao checkout
    route("payment/apply-coupon", "routes/api/payment.apply-coupon.ts"),
    route(
      "categories/:categoryId/areas",
      "routes/api/categories.$categoryId.areas.ts",
    ),
  ]),

  // Proxy de assets estáticos do backend (selos PNG, etc) — serve no mesmo domínio do frontend
  route("icons/*", "routes/icons-proxy.ts"),
  // Proxy de uploads (logos/covers/PDFs de startups servidos por backend em /files/*)
  route("files/*", "routes/files-proxy.ts"),

  // 404
  route("404", "routes/error/404.tsx"),
  // 500
  route("500", "routes/error/500.tsx"),
  // 401
  route("401", "routes/error/401.tsx"),

  // Public verification page (no auth required)
  route("verificar/:documentId", "routes/verificar.$documentId.tsx"),
  route("verificar-token/:hash", "routes/verificar-token.$hash.tsx"),

  // Private Routes with Special Layout
  layout("routes/layout/index.tsx", [
    route("home", "routes/private/marketing.tsx"),
    route(
      "marketplace/startup/:slug",
      "routes/private/marketplace-startup.tsx",
    ),
    // Legacy route por ID mantida para compatibilidade de links antigos.
    route("startups/:id", "routes/private/startup-detail.tsx"),
    route("wallet", "routes/private/wallet.tsx"),
    route("wallet/withdraw", "routes/private/withdraw.tsx"),
    route(
      "checkout/payment/:id/success",
      "routes/private/checkout-payment-success.tsx",
    ),
    route("checkout/payment/:id", "routes/private/checkout-payment.tsx"),
    route("investments/:id/success", "routes/private/investment-success.tsx"),
    route("checkout/return", "routes/private/checkout-return.tsx"),
    route("checkout/efi/:paymentId", "routes/checkout.$paymentId.tsx"),
    route("checkout/:id", "routes/private/checkout.tsx"),
    route("checkout/:id/pix", "routes/private/checkout-pix.tsx"),
    // Rota raiz do perfil. A página tem seção com id="perfil" (âncora #perfil)
// onde fica o ProfilePlanBanner (Sprint S34-b — feedback do usuário: a
// 4ª seção da nav lateral agora chama "perfil" em vez de "plano").
    route("profile", "routes/private/perfil.tsx"),
    route("profile/plans", "routes/private/profile-plans.tsx"),
    route("notifications", "routes/private/notifications.tsx"),
    route("pricing", "routes/private/pricing.tsx"),
    route("transparencia", "routes/private/investor-transparencia.tsx"),

    // Founder Routes
    route("founder/dashboard", "routes/private/founder-dashboard.tsx"),
    route("founder/startups/new", "routes/private/create-startup.tsx"),
    route(
      "founder/affiliate/triagem",
      "routes/private/founder-affiliate-triagem.tsx",
    ),
    route("founder/investors", "routes/private/founder-investors.tsx"),
    route(
      "founder/startups/:id/new-round",
      "routes/private/founder-new-round.tsx",
    ),
    route(
      "founder/startups/:id/transparencia",
      "routes/private/founder.startups.$id.transparencia.tsx",
    ),
    route(
      "founder/startups/:id/financeiro",
      "routes/private/founder-startup-financeiro.tsx",
    ),
    route(
      "founder/financeiro",
      "routes/private/founder-financeiro.tsx",
    ),
    route(
      "founder/startups/:id/prorrogacao",
      "routes/private/founder.startups.$id.prorrogacao.tsx",
    ),
    route(
      "founder/campaigns/:campaignId/financeiro",
      "routes/private/founder.campaigns.$campaignId.financeiro.tsx",
    ),
    route(
      "founder/startups/:id/checkout",
      "routes/private/founder/startups.$id/checkout.tsx",
    ),
    route(
      "founder/termo-adesao/texto",
      "routes/founder/termo-adesao/texto.tsx",
    ),
    route(
      "founder/startups/:id/edit",
      "routes/private/edit-startup-layout.tsx",
      [
        index("routes/private/edit-startup-identidade.tsx"),
        route("time", "routes/private/edit-startup-time.tsx"),
        route("documentos", "routes/private/edit-startup-documentos.tsx"),
        route("bancario", "routes/private/edit-startup-bancario.tsx"),
      ],
    ),
    route(
      "founder/startups/:id/captacao",
      "routes/private/edit-startup-captacao-layout.tsx",
      [
        index("routes/private/edit-startup-captacao-valores.tsx"),
        route("recursos", "routes/private/edit-startup-captacao-recursos.tsx"),
        route("tese", "routes/private/edit-startup-captacao-tese.tsx"),
        route(
          "governanca",
          "routes/private/edit-startup-captacao-governanca.tsx",
        ),
        route("retornos", "routes/private/edit-startup-captacao-retornos.tsx"),
      ],
    ),

    // Admin Routes
    route("admin/dashboard", "routes/private/admin-dashboard.tsx"),
    route("admin/marketplace", "routes/private/admin.marketplace.tsx"),
    route("admin/startups", "routes/private/admin-startups.tsx"),
    // Páginas de Fase (S3) — segmento numérico adicional, antes do :id genérico.
    route(
      "admin/startups/:id/1",
      "routes/private/admin.startup-phase-1.tsx",
    ),
    route(
      "admin/startups/:id/2",
      "routes/private/admin.startup-phase-2.tsx",
    ),
    route(
      "admin/startups/:id/3",
      "routes/private/admin.startup-phase-3.tsx",
    ),
    // Admin — detalhe da startup (visão admin, não usa /compliance)
    route("admin/startups/:id", "routes/private/admin.startup-detail.tsx"),
    route("admin/coupons", "routes/private/admin.coupons.tsx"),
    route("admin/installments", "routes/private/admin.installments.tsx"),
    // Gestão de Payouts consolidada (S4)
    route("admin/payouts", "routes/private/admin.payouts.tsx"),
    // Auditoria do split financeiro (repasse × lucro plataforma)
    route(
      "admin/financeiro/split",
      "routes/private/admin.financeiro.split.tsx",
    ),
    // Central de Cupons (ADMIN + COMPLIANCE + FINANCEIRO)
    route("central-cupons", "routes/private/central-cupons.tsx"),
    route("admin/users", "routes/private/admin-users.tsx"),
    // Admin — detalhe do usuário (visão admin, não usa /compliance)
    route("admin/users/:id", "routes/private/admin.user-detail.tsx"),
    // Admin — gestão de planos (copy + preço + benefícios dos cards de /pricing)
    route("admin/plans", "routes/private/admin.plans.tsx"),
    route("admin/kyc", "routes/private/admin-kyc.tsx"),
    route("admin/affiliate", "routes/private/admin-affiliate.tsx"),
    // Admin — ordens e pagamentos (auditoria financeira + ordens de servico)
    route("admin/payments", "routes/private/admin.payments.tsx"),
    route("admin/history", "routes/private/admin-history.tsx"),
    route("admin/config", "routes/private/admin-config.tsx"),
    route("admin/email-templates", "routes/private/admin-email-templates.tsx"),
    route(
      "admin/email-templates/:slug",
      "routes/private/admin-email-templates.$slug.tsx",
    ),
    route("admin/servicos", "routes/private/admin.services.tsx"),

    // Compliance Routes (NOVA)
    route("compliance/dashboard", "routes/private/compliance-dashboard.tsx"),
    route("compliance/users", "routes/private/compliance-users.tsx"),
    route("compliance/users/:id", "routes/private/compliance-user-detail.tsx", [
      index("routes/private/compliance-user-detail-identidade.tsx"),
      route("endereco", "routes/private/compliance-user-detail-endereco.tsx"),
      route("kyc", "routes/private/compliance-user-detail-kyc.tsx"),
      route("startups", "routes/private/compliance-user-detail-startups.tsx"),
      route("campanhas", "routes/private/compliance-user-detail-campanhas.tsx"),
      route(
        "investimentos",
        "routes/private/compliance-user-detail-investimentos.tsx",
      ),
      route(
        "notas-selos",
        "routes/private/compliance-user-detail-notas-selos.tsx",
      ),
      route("auditoria", "routes/private/compliance-user-detail-auditoria.tsx"),
    ]),
    route("compliance/startups", "routes/private/compliance-startups.tsx"),
    route(
      "compliance/startups/:id",
      "routes/private/compliance-startup-detail.tsx",
    ),
    route("compliance/campaigns", "routes/private/compliance-campaigns.tsx"),
    route(
      "compliance/campaigns/:id",
      "routes/private/compliance-campaign-detail.tsx",
    ),
    route("compliance/seals", "routes/private/compliance-seals.tsx"),
    route(
      "compliance/change-requests",
      "routes/private/compliance-change-requests.tsx",
    ),
    route("compliance/repasses", "routes/private/compliance-repasses.tsx"),

    // Investor Routes
    route("investor/dashboard", "routes/private/investor-dashboard.tsx"),

    // Afiliação — painel do afiliado (investidor/fundador)
    // Home = catálogo de startups autorizadas para afiliação.
    route("affiliate", "routes/private/affiliate-panel.tsx"),
    // Carteira do afiliado (transações/pendências) — vive em /wallet/affiliate
    // (sob a wallet do investidor) para manter o dominio de carteiras junto.
    // NAO aparece no sidebar — acesso direto via card "Comissoes" do /wallet
    // para usuarios com `plano-afiliado` ativo.
    route("wallet/affiliate", "routes/private/affiliate-commissions.tsx"),

    // Financeiro Routes (NOVA)
    route("financeiro/dashboard", "routes/private/financeiro-dashboard.tsx"),
    route("financeiro/config", "routes/private/financeiro-config.tsx"),
    route("financeiro/assas", "routes/private/financeiro-assas.tsx"),
    route(
      "financeiro/transactions",
      "routes/private/financeiro-transactions.tsx",
    ),
    route(
      "financeiro/reconciliation",
      "routes/private/financeiro-reconciliation.tsx",
    ),
    route("financeiro/withdraws", "routes/private/financeiro-withdraws.tsx"),
    route("financeiro/plans", "routes/private/financeiro-plans.tsx"),
    route("financeiro/plans/:id", "routes/private/financeiro-plan-edit.tsx"),
    route(
      "financeiro/repasse/:repasseId",
      "routes/private/financeiro-repasse.tsx",
    ),
    route(
      "financeiro/investments",
      "routes/private/financeiro-investments.tsx",
    ),

    // User Routes (S09 + S10)
    route("user/coupons", "routes/private/user.coupons.tsx"),
    route("user/payments", "routes/private/user.payments.tsx"),
    route("user/statement", "routes/private/user.statement.tsx"),
    route("user/balance", "routes/private/user.balance.tsx"),
  ]),
] satisfies RouteConfig;
