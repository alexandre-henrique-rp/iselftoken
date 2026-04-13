import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/page/index/index.tsx"),
  route("login", "routes/public/auth/login/index.tsx"),
  route("cadastro", "routes/public/auth/cadastro/index.tsx"),
  route("payment/checkout/:token", "routes/public/payment/checkout/index.tsx"),
  route("startup/:id", "routes/page/startup/index.tsx"),
  route("auth/:token", "routes/public/auth/af2/index.tsx"),

  // rotas privadas
  layout("routes/layout/index.tsx", [
    route("home", "routes/private/home/index.tsx"),
    route("plans", "routes/private/plans/index.tsx"),
    route("perfil", "routes/private/perfil/index.tsx"),
    //startups
    route("startups/dashboard", "routes/private/startups/index.tsx"),
    route("startups/new", "routes/private/startups/new/index.tsx"),
    route("startups/campaigns", "routes/private/startups/campaigns/index.tsx"),
  ]),

  // rotas de API (resource routes)
  route("api/auth/login", "routes/api/auth/login.ts"),
  route("api/auth/register", "routes/api/auth/register.ts"),
  route("api/auth/logout", "routes/api/auth/logout.ts"),
  route("api/auth/token", "routes/api/auth/token.ts"),
  route("api/auth/check-af2", "routes/api/auth/check-af2.ts"),
  route("api/auth/verify-af2", "routes/api/auth/verify-af2.ts"),
  route("api/auth/new-token", "routes/api/auth/new-token.ts"),
  route("api/auth/refresh", "routes/api/auth/refresh.ts"),
  route("api/auth/new-code", "routes/api/auth/new-code.ts"),
  route("api/user/me", "routes/api/user/me.ts"),
  route("api/user/update", "routes/api/user/update.ts"),
  route("api/user/upload-doc", "routes/api/user/upload-doc.ts"),
  route("api/document/upload", "routes/api/document/upload.ts"),
  route("api/plans/findall", "routes/api/plans/findall.ts"),
  route("api/plans/subscription", "routes/api/plans/subscription.ts"),
  route("api/startups/list-my", "routes/api/startups/list-my.ts"),
  route("api/startups/post", "routes/api/startups/post.ts"),
  route("api/startups/update", "routes/api/startups/update.ts"),
  route("api/payment/transactions", "routes/api/payment/transactions.ts"),
  route(
    "api/payment/startup-checkout",
    "routes/api/payment/startup-checkout.ts",
  ),
  route("api/payment/validate", "routes/api/payment/validate.ts"),
  route("api/payment/card", "routes/api/payment/card.ts"),
  route("api/payment/pix", "routes/api/payment/pix.ts"),
  route("api/payment/pix/status", "routes/api/payment/pix/status.ts"),
  route("api/payment/cancel", "routes/api/payment/cancel.ts"),
  route("api/geral/paises", "routes/api/geral/paises.ts"),
  route("api/geral/estados/:pais", "routes/api/geral/estados.ts"),
  route("api/geral/cidade/:pais/:estado", "routes/api/geral/cidade.ts"),
  route("api/geral/cep/:cep", "routes/api/geral/cep.ts"),
  route("api/geral/cnpj/:cnpj", "routes/api/geral/cnpj.ts"),
] satisfies RouteConfig;
