import type {
  Coupon,
  CouponFilters,
  PaginatedResponse,
} from "~/lib/api/coupons";
import type { UserData } from "~/types/auth";
import { serverFetch } from "./server-fetch";

export type AuthStatus = {
  isAuthenticated: boolean;
  isAuthorized: boolean;
};

export const couponQueryKeys = {
  all: ["coupons"] as const,
  list: (filters: CouponFilters = {}) => ["coupons", filters] as const,
  available: ["available-coupons"] as const,
  usages: (couponId: number) => ["coupon-usages", couponId] as const,
  audit: (couponId: number) => ["coupon-audit", couponId] as const,
  myUsage: (page: number) => ["my-coupon-usage", page] as const,
};

/**
 * Catálogo centralizado de query keys (Fase 3 — Performance Tuning).
 *
 * Substitui strings mágicas espalhadas por hooks e rotas. Toda nova
 * queryKey deve ser registrada aqui. Mantém prefixos por domínio para
 * facilitar `invalidateQueries({ queryKey: queryKeys.admin.all })`.
 */
export const queryKeys = {
  compliance: {
    dashboardSummary: ["compliance-dashboard-summary"] as const,
    campaignDetail: (id: string | number) =>
      ["compliance-campaign-detail", id] as const,
  },
  payments: {
    all: ["payments"] as const,
    adminList: ["admin-payments"] as const,
    detail: (paymentId: number | string) =>
      ["payment-detail", paymentId] as const,
    status: (paymentId: number | string) =>
      ["payment-status", paymentId] as const,
    installments: (paymentId: number | string, amount: number | string) =>
      ["payment-installments", paymentId, String(amount)] as const,
  },
  installmentConfig: {
    all: ["installment-config"] as const,
    vigente: ["installment-config", "vigente"] as const,
    history: ["installment-config", "history"] as const,
  },
  auditLogs: (entity: string, entityId: string | number | null, limit: number) =>
    ["audit-logs", entity, String(entityId ?? ""), limit] as const,
  admin: {
    services: ["admin", "services"] as const,
    users: ["admin-users"] as const,
    emailTemplates: ["admin", "email-templates"] as const,
  },
  geral: {
    cep: (digits: string) => ["geral", "cep", digits] as const,
  },
  notifications: {
    all: ["notifications"] as const,
  },
  startup: {
    detail: (startupId: string | number) =>
      ["startup", String(startupId)] as const,
    all: ["startups"] as const,
    overview: ["dashboard-overview"] as const,
    reviewDecision: (startupId: string | number | null, phase: string) =>
      ["admin", "startup", String(startupId ?? ""), "review-decision", phase] as const,
  },
  termoAdesao: {
    status: (startupId: string | number | null | undefined) =>
      ["termo-adesao", "status", String(startupId ?? "")] as const,
  },
  adminEmailTemplates: {
    all: ["admin", "email-templates"] as const,
    detail: (slug: string) => ["admin", "email-templates", slug] as const,
  },
  adminFinanceiroTransactions: <T extends object>(filters: T) =>
    ["admin-financeiro-transactions", filters] as const,
  adminConfig: ["admin-config"] as const,
  adminAffiliate: ["admin-affiliate"] as const,
  complianceRepasses: ["compliance-repasses"] as const,
  complianceChangeRequests: ["compliance-change-requests"] as const,
  complianceStartupDetail: (id: string | number) =>
    ["compliance-startup-detail", id] as const,
  financeiroRepasse: (key: string) => ["financeiro-repasse", key] as const,
  campaignResources: (campaignId: string | number | null) =>
    ["campaign-resources", campaignId] as const,
  founderDashboard: ["founder-dashboard"] as const,
  startupDashboardMetrics: ["startup-dashboard-metrics"] as const,
  efi: {
    checkout: (paymentId: number | string, checkoutId: string) =>
      ["efi-checkout", paymentId, checkoutId] as const,
    status: (paymentId: number | string) => ["efi-status", paymentId] as const,
    allCheckout: ["efi-checkout"] as const,
    allStatus: ["efi-status"] as const,
  },
  documentRequests: {
    admin: (params: Record<string, unknown>) =>
      ["document-requests", "admin", params] as const,
    all: ["document-requests"] as const,
  },
  emailTemplate: (slug: string) => ["admin", "email-templates", slug] as const,
  transparency: {
    posts: <T extends object>(startupId: string | number | null, filters: T) =>
      ["transparency-posts", startupId, filters] as const,
    discussions: <T extends object>(startupId: string | number | null, filters?: T) =>
      ["transparency-discussions", startupId, filters] as const,
    discussion: (discussionId: string | number) =>
      ["transparency-discussion", discussionId] as const,
    featured: (startupId: string | number | null) =>
      ["transparency-featured", startupId] as const,
    allDiscussions: ["transparency-discussions"] as const,
  },
  repasse: {
    dashboard: ["repasse-dashboard"] as const,
    detail: (repasseId: number | string) =>
      ["financeiro-repasse", String(repasseId)] as const,
    byStartup: (startupKey: string) => ["repasse-dashboard", startupKey] as const,
  },
  founder: {
    servicesCatalog: ["founder", "services", "catalog"] as const,
    paymentsPending: ["founder", "payments", "pending"] as const,
    paymentsAll: ["founder", "payments", "all"] as const,
  },
  relatedStartups: ["related-startups"] as const,
  startupDetail: (id: string | number) => ["startup-detail", id] as const,
  adminStartupReviewDecision: (startupId: string | number | null | undefined, phase: string | number) =>
    ["admin", "startup", String(startupId ?? ""), "review-decision", phase] as const,
  startupDocuments: (startupId: string | number | null | undefined) =>
    ["startup-documents", String(startupId ?? "")] as const,
  verificacaoDocumento: (documentId: string | number | null | undefined) =>
    ["verificacao", "documento", String(documentId ?? "")] as const,
  founderChangeRequests: (startupId: string | number | null) =>
    ["founder-change-requests", startupId] as const,
  adminPlans: <T extends object>(params: T) => ["admin-plans", params] as const,
  adminPlanStats: (planId: number | string | undefined) => ["admin-plan-stats", planId] as const,
  complianceStartups: ["compliance-startups"] as const,
  adminStartups: ["admin-startups"] as const,
};

export function couponSearchParams(filters: CouponFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.percent && filters.percent !== "all") {
    params.set("percent", String(filters.percent));
  }
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return params;
}

export function normalizeCouponsResponse(
  payload: unknown,
  filters: CouponFilters = {},
): PaginatedResponse<Coupon> {
  const envelope = (payload ?? {}) as {
    data?:
      | Coupon[]
      | {
          items?: Coupon[];
          data?: Coupon[];
          total?: number;
          page?: number;
          pagina?: number;
          limit?: number;
          totalPages?: number;
        };
    items?: Coupon[];
    total?: number;
    page?: number;
    pagina?: number;
    limit?: number;
    totalPages?: number;
  };
  const nested = Array.isArray(envelope.data) ? null : envelope.data;
  const data = Array.isArray(envelope.data)
    ? envelope.data
    : (nested?.items ?? nested?.data ?? envelope.items ?? []);
  const limit = nested?.limit ?? envelope.limit ?? filters.limit ?? 20;
  const total = nested?.total ?? envelope.total ?? data.length;
  const page =
    nested?.page ??
    nested?.pagina ??
    envelope.page ??
    envelope.pagina ??
    filters.page ??
    1;

  return {
    data,
    total,
    page,
    limit,
    totalPages:
      nested?.totalPages ??
      envelope.totalPages ??
      Math.max(1, Math.ceil(total / limit)),
  };
}

export async function fetchCouponsServer(
  request: Request,
  filters: CouponFilters = {},
): Promise<PaginatedResponse<Coupon>> {
  const params = couponSearchParams(filters).toString();
  const response = await serverFetch(
    request,
    `/api/coupons${params ? `?${params}` : ""}`,
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || (payload as { error?: boolean } | null)?.error) {
    throw new Error("Não foi possível carregar os cupons.");
  }
  return normalizeCouponsResponse(payload, filters);
}

export function couponsQueryOptions(filters: CouponFilters = {}) {
  const params = couponSearchParams(filters).toString();
  return {
    queryKey: couponQueryKeys.list(filters),
    queryFn: async (): Promise<PaginatedResponse<Coupon>> => {
      const response = await fetch(`/api/coupons${params ? `?${params}` : ""}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.error) {
        throw new Error("Não foi possível carregar os cupons.");
      }
      return normalizeCouponsResponse(payload, filters);
    },
    staleTime: 30_000,
  };
}

// === Server-side (loaders) ===

export async function fetchAuthStatusServer(
  request: Request,
): Promise<AuthStatus> {
  const res = await serverFetch(request, "/api/auth/status");
  // P3.5 — Diferenciar 401 (esperado: sem sessao / 2FA pendente) de 5xx
  // (inesperado: backend fora / bug). 401 -> fallback defensivo false/false;
  // 5xx -> relança para errorBoundary do loader mostrar UI especifica.
  if (res.status === 401) {
    return { isAuthenticated: false, isAuthorized: false };
  }
  if (!res.ok) {
    throw new Error(`fetchAuthStatusServer: backend respondeu ${res.status}`);
  }
  return res.json() as Promise<AuthStatus>;
}

type MeResponse = {
  error?: boolean;
  message?: string;
  data?: UserData;
};

function getMeResponseData(payload: MeResponse): UserData {
  if (payload.error || !payload.data) {
    throw new Error(payload.message ?? "Não foi possível carregar o perfil.");
  }

  return payload.data;
}

export async function fetchMeServer(request: Request): Promise<UserData> {
  const res = await serverFetch(request, "/api/users/me");
  if (!res.ok) throw new Error(`fetchMe failed: ${res.status}`);
  const payload = (await res.json()) as MeResponse;
  return getMeResponseData(payload);
}

// === Client-side ===

export const authStatusQueryOptions = {
  queryKey: ["auth-status"] as const,
  queryFn: async (): Promise<AuthStatus> => {
    const res = await fetch("/api/auth/status", { credentials: "include" });
    // P3.5 — espelha o loader: 401 -> false/false; 5xx -> erro.
    if (res.status === 401) {
      return { isAuthenticated: false, isAuthorized: false };
    }
    if (!res.ok) throw new Error(`auth/status falhou: ${res.status}`);
    return res.json();
  },
  staleTime: 5 * 60_000,
};

export const meQueryOptions = {
  queryKey: ["me"] as const,
  queryFn: async (): Promise<UserData> => {
    const res = await fetch("/api/users/me", { credentials: "include" });
    if (!res.ok) throw new Error(`fetchMe failed: ${res.status}`);
    const payload = (await res.json()) as MeResponse;
    return getMeResponseData(payload);
  },
  // Sprint S34-c — fallback de 90s caso o WebSocket falhe (coneção offline,
  // edge offline-first, etc). Caminho primário é o `payment.confirmed`
  // WS event (latência < 2s). Defesa em profundidade.
  staleTime: 90 * 1000,
  gcTime: 10 * 60_000,
  // Sprint fix cache-stale pós-compra: se o WS `payment.confirmed`
  // falhar (reconexão, edge offline-first), voltar o foco da aba força
  // refetch imediato em vez de esperar o staleTime expirar (até 90s).
  refetchOnWindowFocus: true,
};

export type FundraisingConfig = {
  authFeePerToken: number;
  minCampaign: number;
  maxCampaign: number;
  equityMin: number;
  equityMax: number;
  tokenPrice: number;
  platformFee: number;
  complianceFee: number;
  fastTrackFee: number;
};

export const DEFAULT_FUNDRAISING_CONFIG: FundraisingConfig = {
  tokenPrice: 200,
  authFeePerToken: 1,
  equityMin: 5,
  equityMax: 20,
  minCampaign: 300_000,
  maxCampaign: 12_000_000,
  platformFee: 0,
  complianceFee: 0,
  fastTrackFee: 2_500,
};

export type FounderFundraisingConfig = Pick<
  FundraisingConfig,
  | "authFeePerToken"
  | "minCampaign"
  | "maxCampaign"
  | "equityMin"
  | "equityMax"
  | "tokenPrice"
  | "fastTrackFee"
>;

export const DEFAULT_FOUNDER_FUNDRAISING_CONFIG: FounderFundraisingConfig = {
  tokenPrice: 200,
  authFeePerToken: 1,
  equityMin: 5,
  equityMax: 20,
  minCampaign: 300_000,
  maxCampaign: 12_000_000,
  fastTrackFee: 2_500,
};

export const founderFundraisingConfigQueryOptions = {
  queryKey: ["founder-fundraising-config"] as const,
  queryFn: async (): Promise<FounderFundraisingConfig> => {
    const res = await fetch("/api/config/fundraising", {
      credentials: "include",
    });
    if (!res.ok)
      throw new Error(
        `Erro ao carregar configuração operacional: ${res.status}`,
      );
    const json = await res.json();
    return (json?.data ?? json) as FounderFundraisingConfig;
  },
  staleTime: 5 * 60_000,
  // Refetch automatico ao focar a janela — garante que admin que
  // alterou config no backend eh visto no wizard do founder (max 5min).
  refetchOnWindowFocus: true,
};

export const fundraisingConfigQueryOptions = {
  queryKey: ["admin-fundraising-config"] as const,
  queryFn: async (): Promise<FundraisingConfig> => {
    const res = await fetch("/api/admin/config/fundraising", {
      credentials: "include",
    });
    if (!res.ok)
      throw new Error(`Erro ao carregar configuração: ${res.status}`);
    const json = await res.json();
    return (json?.data ?? json) as FundraisingConfig;
  },
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: true,
};

export type Country = {
  id: number;
  name: string;
  native: string;
  iso2: string;
  iso3: string;
  emoji: string;
  currency: string;
  currencyName: string;
  currencySymbol: string;
  phonecode: string;
};

export const countriesQueryOptions = {
  queryKey: ["countries"] as const,
  queryFn: async (): Promise<Country[]> => {
    const res = await fetch("/api/country");
    if (!res.ok) throw new Error(`Countries fetch failed: ${res.status}`);
    const json = await res.json();
    return (json?.data ?? []) as Country[];
  },
  staleTime: Infinity,
};

export interface Category {
  id: number;
  slug: string;
  nome: string;
  ordem: number;
}

export const categoriesQueryOptions = {
  queryKey: ["categories"] as const,
  queryFn: async (): Promise<Category[]> => {
    const res = await fetch("/api/categories");
    if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
    const json = await res.json();
    return (json?.data ?? json) as Category[];
  },
  staleTime: Infinity,
  gcTime: Infinity,
  retry: 1,
};

export interface AreaAtuacao {
  id: number;
  slug: string;
  nome: string;
  categoryId: number;
}

export function areasByCategoryQueryOptions(categoryId: number | null) {
  return {
    queryKey: ["areas", categoryId] as const,
    queryFn: async (): Promise<AreaAtuacao[]> => {
      if (!categoryId) return [];
      const res = await fetch(`/api/categories/${categoryId}/areas`);
      if (!res.ok) throw new Error(`Areas fetch failed: ${res.status}`);
      const json = await res.json();
      return (json?.data ?? json) as AreaAtuacao[];
    },
    enabled: !!categoryId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  };
}

export type State = {
  id: number;
  name: string;
  iso2: string;
  country_id: number;
  country_code: string;
};

export function statesByCountryQueryOptions(countryId: number | null) {
  return {
    queryKey: ["states", countryId] as const,
    queryFn: async (): Promise<State[]> => {
      if (!countryId) return [];
      const res = await fetch(`/api/country?country=${countryId}`);
      if (!res.ok) throw new Error(`States fetch failed: ${res.status}`);
      const json = await res.json();
      return (json?.data ?? []) as State[];
    },
    enabled: !!countryId,
    staleTime: Infinity,
  };
}

export type City = {
  id: number;
  name: string;
  state_id: number;
  country_id: number;
};

export function citiesByStateQueryOptions(
  countryId: number | null,
  stateId: number | null,
) {
  return {
    queryKey: ["cities", countryId, stateId] as const,
    queryFn: async (): Promise<City[]> => {
      if (!countryId || !stateId) return [];
      const res = await fetch(
        `/api/country?country=${countryId}&states=${stateId}`,
      );
      if (!res.ok) throw new Error(`Cities fetch failed: ${res.status}`);
      const json = await res.json();
      return (json?.data ?? []) as City[];
    },
    enabled: !!countryId && !!stateId,
    staleTime: Infinity,
  };
}

export type NotificationRaw = {
  id: number;
  title: string;
  description: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsPage = {
  items: NotificationRaw[];
  totalPages: number;
};

/**
 * Filtros de notificação expostos na UI. Mapeiam para os `types` (CSV) do
 * backend. "all" = sem filtro.
 *
 * Sprint de Notificações — central (2026-10-04): estendido com `subscriptions`
 * (plan_purchased, plan_added) e `repasses` (repasse_*). Os filtros que
 * cobriam múltiplos tipos agora enviam CSV para o backend.
 */
export type NotificationFilter =
  | "all"
  | "investments"
  | "security"
  | "general"
  | "subscriptions"
  | "repasses";

/** Mapa filtro UI → lista de types do backend. */
const NOTIFICATION_FILTER_TO_TYPES: Record<NotificationFilter, string[] | null> = {
  all: null,
  investments: ["investment_confirmed", "token_purchased"],
  security: ["security", "kyc_approved", "kyc_resubmission_requested", "user_approved", "user_suspended"],
  general: ["general", "compliance_request"],
  subscriptions: ["plan_purchased", "plan_added"],
  repasses: [
    "repasse_request",
    "repasse_approved",
    "repasse_rejected",
    "repasse_paid",
  ],
};

export function notificationsPageQueryOptions(
  page: number,
  filter: NotificationFilter = "all",
) {
  return {
    // Prefixo ["notifications"] permite invalidacao por familia inteira.
    queryKey: ["notifications", filter, page] as const,
    queryFn: async (): Promise<NotificationsPage> => {
      const types = NOTIFICATION_FILTER_TO_TYPES[filter];
      const qs = new URLSearchParams({ page: String(page), limit: "20" });
      if (types && types.length > 0) {
        qs.set("types", types.join(","));
      }

      const res = await fetch(`/api/notifications?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Notifications fetch failed: ${res.status}`);
      const result = await res.json();
      return {
        items: (result?.data?.data ?? []) as NotificationRaw[],
        totalPages: result?.data?.pagination?.totalPages ?? 1,
      };
    },
    staleTime: 30_000,
  };
}

export const notificationsUnreadCountQueryOptions = {
  queryKey: ["notifications-unread-count"] as const,
  queryFn: async (): Promise<number> => {
    const res = await fetch(`/api/notifications/unread-count`, {
      credentials: "include",
    });
    if (!res.ok) return 0;
    const result = await res.json();
    return result?.data?.unreadCount ?? 0;
  },
  staleTime: 15_000,
  // Sem refetchInterval estático — o caller decide dinamicamente
  // (parar quando WS conectado; 60 s quando WS desconectado).
  // Ver `top-navbar.tsx` e `notifications.tsx`.
};

export type DashboardMetrics = {
  investor_count: number;
  amount_raised: number;
  days_remaining: number | null;
  total_campaigns: number;
  open_campaigns: number;
  /** Média de progresso (0-100) das campanhas OPEN do founder. */
  average_progress?: number;
};

export const startupsQueryOptions = {
  queryKey: ["startups"] as const,
  queryFn: async (): Promise<any> => {
    const res = await fetch("/api/startup", { credentials: "include" });
    if (!res.ok) throw new Error(`Startups fetch failed: ${res.status}`);
    return res.json();
  },
  staleTime: 60_000,
};

export const startupDashboardMetricsQueryOptions = {
  queryKey: ["startup-dashboard-metrics"] as const,
  queryFn: async (): Promise<{ data: DashboardMetrics }> => {
    const res = await fetch("/api/startup/dashboard/metrics", {
      credentials: "include",
    });
    if (!res.ok)
      throw new Error(`Startup dashboard metrics fetch failed: ${res.status}`);
    return res.json();
  },
  staleTime: 30_000,
};

// === Compliance (STATE-02C) ===

export interface ComplianceDashboardKpis {
  kyc_pending: number;
  startups_pending: number;
  approved_today: number;
}

export interface ComplianceRecentKycDecision {
  id: number;
  status: string;
  userName: string;
  userEmail: string;
  rejectionReason: string | null;
  updatedAt: string;
}

export interface CompliancePendingApproval {
  id: number;
  nome: string;
  slug: string;
  founderName: string;
  founderEmail: string;
  createdAt: string;
}

export interface ComplianceDashboardSummary {
  kpis: ComplianceDashboardKpis;
  recentKycDecisions: ComplianceRecentKycDecision[];
  pendingApprovals: CompliancePendingApproval[];
}

export const complianceDashboardSummaryQueryOptions = {
  queryKey: ["compliance-dashboard-summary"] as const,
  queryFn: async (): Promise<ComplianceDashboardSummary> => {
    const res = await fetch("/api/admin/compliance/dashboard", {
      credentials: "include",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error) {
      throw new Error(
        json?.message ?? `Dashboard compliance falhou: ${res.status}`,
      );
    }
    if (!json?.data?.kpis) {
      throw new Error("Resposta inválida do dashboard de Compliance");
    }
    return json.data as ComplianceDashboardSummary;
  },
  staleTime: 60_000,
};

export function complianceStartupDetailQueryOptions(
  startupId: number | string | undefined,
) {
  const id = typeof startupId === "string" ? Number(startupId) : startupId;
  return {
    queryKey: ["compliance-startup-detail", id] as const,
    queryFn: async () => {
      const res = await fetch(`/api/admin/compliance/startup/${id}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(
          json?.message ?? `Detalhe startup falhou: ${res.status}`,
        );
      }
      return (json?.data ?? null) as unknown;
    },
    enabled: typeof id === "number" && Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  };
}

export function complianceCampaignDetailQueryOptions(
  campaignId: number | string | undefined,
) {
  const id = typeof campaignId === "string" ? Number(campaignId) : campaignId;
  return {
    queryKey: ["compliance-campaign-detail", id] as const,
    queryFn: async () => {
      const res = await fetch(`/api/compliance/campaigns/${id}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(
          json?.message ?? `Detalhe campanha falhou: ${res.status}`,
        );
      }
      return (json?.data ?? null) as unknown;
    },
    enabled: typeof id === "number" && Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  };
}

// === Payment status (PIX/Cartão) — polling adaptativo ===

export type PaymentStatus = {
  id: number;
  status: string;
  amount: number;
  txid?: string | null;
  method?: string;
  purpose?: string;
  investmentId?: number | null;
  expiresAt?: string | null;
  effectsAppliedAt?: string | null;
};

export type InvestmentConfirmation = {
  investment: {
    id: number;
    amount: number;
    tokensQty: number;
    status: string;
    paidAt: string | null;
    effectsAppliedAt: string | null;
  };
  startup: { id: number; nome: string; slug: string };
  campaign: { id: number; title: string; tokenPrice: number };
  tokens: { total: number; ids: string[] };
};

const TERMINAL_PAYMENT_STATUSES = ["PAID", "CANCELED", "REFUNDED"];

/**
 * Query factory para `GET /api/payment/:paymentId` (status de pagamento).
 *
 * Polling inteligente via `refetchInterval`:
 *  - Status terminal (PAID/CANCELED/REFUNDED): desliga polling.
 *  - Demais status: poll a cada 4s.
 *
 * Usado por `PixPayment.tsx` e `CreditCardRedirect.tsx`.
 */
export function paymentStatusQueryOptions(paymentId: number) {
  return {
    queryKey: ["payment-status", paymentId] as const,
    queryFn: async (): Promise<PaymentStatus | null> => {
      if (!paymentId) return null;
      const res = await fetch(`/api/payment/${paymentId}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const body = await res.json();
      return (body?.data ?? body) as PaymentStatus;
    },
    refetchInterval: (query: {
      state: { data: PaymentStatus | null | undefined };
    }) => {
      const status = query.state.data?.status;
      return TERMINAL_PAYMENT_STATUSES.includes(status ?? "") ? false : 4000;
    },
    enabled: Boolean(paymentId),
    staleTime: 5_000,
  };
}

type PaymentDetail = import("./payment-presentation").PaymentSummary;

/**
 * Detalhe canônico do pagamento para telas autenticadas.
 *
 * Quando um pagamento já está confirmado, mas os efeitos de domínio ainda
 * estão pendentes, o polling permanece ativo até a conclusão. Isso evita
 * chamar a EFI novamente e mantém a tela de sucesso sincronizada com o
 * processamento idempotente do backend.
 */
export function paymentDetailQueryOptions(paymentId: number) {
  const enabled = Number.isSafeInteger(paymentId) && paymentId > 0;

  return {
    queryKey: ["payment-detail", paymentId] as const,
    queryFn: async (): Promise<PaymentDetail> => {
      if (!enabled) throw new Error("ID de pagamento inválido.");

      const response = await fetch(`/api/payment/${paymentId}`, {
        credentials: "include",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.error) {
        throw new Error(
          body?.message ?? "Não foi possível atualizar o pagamento.",
        );
      }

      return (body?.data ?? body) as PaymentDetail;
    },
    refetchInterval: (query: {
      state: { data: PaymentDetail | undefined };
    }) => {
      const payment = query.state.data;
      return payment?.status === "PAID" && !payment.effectsAppliedAt
        ? 2000
        : false;
    },
    enabled,
    staleTime: 5_000,
  };
}

export function investmentConfirmationQueryOptions(investmentId: number) {
  return {
    queryKey: ["investment-confirmation", investmentId] as const,
    queryFn: async (): Promise<InvestmentConfirmation | null> => {
      const res = await fetch(`/api/investments/${investmentId}/confirmation`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const body = await res.json();
      return (body?.data ?? body) as InvestmentConfirmation;
    },
    enabled: Boolean(investmentId),
    staleTime: 30_000,
  };
}

// === Admin (STATE-02B) ===

export type AdminStartup = {
  id: number;
  nome: string;
  status: string;
  segmento?: string | null;
  area_atuacao?: string | null;
  estagio?: string | null;
  score?: number | null;
  createdAt: string;
  founder?: { nome?: string; email?: string } | null;
  logo?: { url?: string | null } | string | null;
  seals?: Array<{ id: number; slug: string; name: string }>;
  [key: string]: unknown;
};

export type AdminSealCatalogItem = {
  id: number;
  slug: string;
  name: string;
  category: string;
  description?: string;
  imagePath?: string;
  active?: boolean;
};

export type AdminStartupSeal = AdminSealCatalogItem & {
  issuedAt?: string;
  issuedBy?: { id: number; nome: string } | null;
};

export type AdminSealsResponse = { data: AdminSealCatalogItem[] };
export type AdminStartupSealsResponse = { data: AdminStartupSeal[] };

export const adminSealsQueryOptions = {
  queryKey: ["admin-seals"] as const,
  queryFn: async (): Promise<AdminSealsResponse> => {
    const res = await fetch("/api/admin/seals", { credentials: "include" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.error) {
      throw new Error(body?.message ?? "Falha ao carregar o catálogo de selos");
    }
    return { data: (body?.data ?? []) as AdminSealCatalogItem[] };
  },
  staleTime: 5 * 60_000,
};

export function adminStartupSealsQueryOptions(
  startupId: number | string | null,
) {
  return {
    queryKey: ["admin-startup-seals", String(startupId ?? "")] as const,
    queryFn: async (): Promise<AdminStartupSealsResponse> => {
      const res = await fetch(
        `/api/admin/seals/startup/${encodeURIComponent(String(startupId))}`,
        { credentials: "include" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? "Falha ao carregar os selos da startup",
        );
      }
      return { data: (body?.data ?? []) as AdminStartupSeal[] };
    },
    enabled: startupId !== null,
    staleTime: 30_000,
  };
}

export type AdminStartupsPage = {
  data: AdminStartup[];
  total: number;
  pagina: number;
};

// ─── S2: Gates de pagamento por fase (Fase 1/2/3) ──────────────────────────

/**
 * Um item individual dentro de um comprovante de fase. S18.6 — um
 * checkout consolidado (ex.: COMPLIANCE_FEE + FAST_DEPLOY) gera 2
 * Payments irmãos; ambos precisam aparecer no comprovante.
 */
export interface PhasePayment {
  purpose: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  /** Valor cheio antes de desconto (R$). Null quando não há cobrança. */
  originalAmount: number | null;
  /** Desconto aplicado (cupom) em R$. 0 quando não há desconto. */
  discountAmount: number | null;
  /** Valor efetivamente pago (R$) = originalAmount - discountAmount. */
  paidAmount: number | null;
}

export interface PhaseGate {
  unlocked: boolean;
  reason: string | null;
  gate: string;
  exists: boolean;
  paid: boolean;
  paidAt: string | null;
  createdAt: string | null;
  status: string | null;
  /** Última decisão de aprovação administrativa da fase. */
  reviewStatus?: "APPROVED" | "REJECTED" | null;
  /** Valor cheio antes de desconto (R$) — espelha o primary (COMPLIANCE_FEE).
   *  Mantido para compat com consumers que ainda não migraram. Use
   *  `payments[]` para o breakdown completo do checkout consolidado. */
  originalAmount?: number | null;
  /** Desconto aplicado (cupom) em R$ — espelha o primary. */
  discountAmount?: number | null;
  /** Valor efetivamente pago (R$) = originalAmount - discountAmount — primary. */
  paidAmount?: number | null;
  /** S18.6 — array com todos os Payments do checkout consolidado da fase
   *  (ex.: [COMPLIANCE_FEE, FAST_DEPLOY]). Vazio quando não há cobrança. */
  payments?: PhasePayment[];
}

export interface AdminStartupPaymentStatus {
  startupId: number;
  phases: { 1: PhaseGate; 2: PhaseGate; 3: PhaseGate };
}

export function adminStartupPaymentStatusQueryOptions(
  startupId: number | string | null,
) {
  return {
    queryKey: ["admin-startup-payment-status", String(startupId ?? "")] as const,
    queryFn: async (): Promise<AdminStartupPaymentStatus> => {
      const res = await fetch(
        `/api/admin/startups/${encodeURIComponent(String(startupId))}/payment-status`,
        { credentials: "include" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? "Falha ao carregar status de pagamento por fase",
        );
      }
      return body.data as AdminStartupPaymentStatus;
    },
    enabled: startupId !== null,
    staleTime: 30_000,
  };
}

export function adminStartupsQueryOptions(params: {
  page?: number;
  search?: string;
  status?: string;
  segmento?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.segmento) qs.set("segmento", params.segmento);
  const enabled = !params.search || params.search.length > 2;
  return {
    queryKey: ["admin-startups", params] as const,
    queryFn: async (): Promise<AdminStartupsPage> => {
      const res = await fetch(`/api/admin/startups?${qs.toString()}`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? `Falha ao listar startups (${res.status})`,
        );
      }
      const statusMap: Record<string, string> = {
        APPROVED: "aprovada",
        PENDING: "em_analise",
        REJECTED: "rejeitada",
      };
      const data = ((body?.data ?? []) as AdminStartup[]).map((startup) => {
        const normalized = { ...startup };
        if (
          normalized.segmento === undefined &&
          normalized.area_atuacao !== undefined
        ) {
          normalized.segmento = normalized.area_atuacao;
        }
        if (normalized.status && statusMap[normalized.status]) {
          normalized.status = statusMap[normalized.status];
        }
        return normalized;
      });
      return {
        data,
        total: body?.total ?? 0,
        pagina: body?.pagina ?? Number(params.page ?? 1),
      };
    },
    staleTime: enabled && params.search ? 30_000 : 30_000,
    enabled,
  };
}

export type AdminDashboardKpis = {
  gmv: number;
  /** GMV do dia (CONFIRMED + createdAt >= startOfToday UTC). */
  gmvToday: number;
  /** GMV de ontem (CONFIRMED + createdAt entre startOfYesterday e startOfToday UTC). */
  gmvYesterday: number;
  /** Delta percentual de hoje vs ontem. Null quando ontem = 0 (sem baseline). */
  gmvDeltaPct: number | null;
  totalRedeemed: number;
  tokensGenerated: number;
  tokensSold: number;
  activeInvestors: number;
  totalUsers: number;
  totalStartups: number;
  activeCampaigns: number;
  /** Soma dos amounts de Withdrawal com status REQUESTED ou PROCESSING. */
  pendingRedemptionsAmount: number;
  /** Quantidade total da fila, sem o limite de 20 itens retornados. */
  pendingRedemptionsCount: number;
  /** Média arredondada do progresso (%) das campanhas OPEN. */
  activeCampaignsAvgProgress: number;
  /** Quantidade de KYCProfile com status PENDING ou UNDER_REVIEW. */
  kycPendingCount: number;
  /** Horas desde o KYCProfile pendente mais antigo (0 quando vazio). */
  kycOldestAgeHours: number;
  // === Montador de Ordens e Pagamentos ===
  /** Pagamentos com status PAID e paidAt >= startOfToday (UTC). */
  paymentsPaidToday: number;
  /** Soma dos amounts de paymentsPaidToday. */
  paymentsPaidTodayAmount: number;
  /** Pagamentos com status PENDING (QR emitido aguardando liquidação). */
  paymentsPendingCount: number;
  /** Soma dos amounts de paymentsPendingCount. */
  paymentsPendingAmount: number;
  /** Pagamentos com status EXPIRED (QR vencido, requer ação). */
  paymentsExpiredCount: number;
  // === Split financeiro (admin-only) ===
  /** Σ startupRepasseAmount de Investments CONFIRMED (devido às startups). */
  startupRepasseTotal: number;
  /** Σ platformSpreadAmount de Investments CONFIRMED (markup venda-base). */
  platformSpreadTotal: number;
  /** Σ platformFeeAmount de Investments CONFIRMED (taxa cobrada no checkout). */
  platformFeeTotal: number;
  /** Σ platformRevenueAmount de Investments CONFIRMED (spread + taxa). */
  platformRevenueTotal: number;
};

/** Série mensal emparelhada (repasse × lucro) para o dashboard. */
export type AdminSplitMonthlySeries = {
  labels: string[];
  repasse: number[];
  lucro: number[];
};

export type AdminPendingRedemption = {
  id: number;
  startupNome: string;
  setor: string | null;
  amount: number;
  status: string;
  createdAt: string;
};

export type AdminActiveCampaign = {
  id: number;
  title: string;
  startupNome: string;
  progress: number;
};

export type AdminDashboardSummary = {
  kpis: AdminDashboardKpis;
  gmvMonthly: { labels: string[]; data: number[] };
  splitMonthly: AdminSplitMonthlySeries;
  userGrowth: { labels: string[]; data: number[] };
  startupsMonthly: { labels: string[]; data: number[] };
  pendingRedemptions: AdminPendingRedemption[];
  activeCampaigns: AdminActiveCampaign[];
};

export const adminDashboardSummaryQueryOptions = {
  queryKey: ["admin-dashboard-summary"] as const,
  queryFn: async (): Promise<AdminDashboardSummary> => {
    const res = await fetch("/api/admin/dashboard", { credentials: "include" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.error) {
      throw new Error(
        body?.message ?? `Falha ao carregar dashboard (${res.status})`,
      );
    }
    const data = body?.data ?? {};
    return data as AdminDashboardSummary;
  },
  staleTime: 60_000,
};

export type AdminKycUser = {
  id: number;
  publicId?: string | null;
  nome?: string;
  email?: string;
  tipo_documento?: string | null;
  kycStatus?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type AdminKycList = {
  users: AdminKycUser[];
  total: number;
  pagina: number;
};

export function adminKycQueueQueryOptions(params: {
  page?: number;
  search?: string;
  kycStatus?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.search) qs.set("search", params.search);
  if (params.kycStatus) qs.set("kycStatus", params.kycStatus);
  const enabled = !params.search || params.search.length > 2;
  return {
    queryKey: ["admin-kyc", params] as const,
    queryFn: async (): Promise<AdminKycList> => {
      const res = await fetch(`/api/admin/kyc?${qs.toString()}`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? `Falha ao listar KYC (${res.status})`);
      }
      return {
        users: (body?.data ?? []) as AdminKycUser[],
        total: body?.total ?? 0,
        pagina: body?.pagina ?? Number(params.page ?? 1),
      };
    },
    staleTime: 30_000,
    enabled,
  };
}

/** Status de conta de um usuário (vindo de /admin/users). */
export type AdminUserStatus = "active" | "suspended";

export type AdminUser = {
  id: number;
  publicId?: string;
  email: string;
  nome: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  tipo_documento?: string | null;
  reg_documento?: string | null;
  avatar?: {
    id: number;
    url_web?: string | null;
    url_sm?: string | null;
    status: string | null;
  } | null;
  subscriptions?: Array<{
    id: number;
    status: string;
    plan: { nome: string; slug: string };
  }>;
};

export type AdminUsersList = {
  data: AdminUser[];
  total: number;
  pagina: number;
};

export type AdminUsersQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminUserStatus;
  createdFrom?: string;
  role?: string;
  kycStatus?: string;
};

export function adminUsersQueryOptions(params: AdminUsersQueryParams) {
  const qs = new URLSearchParams();
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  if (params.limit && params.limit !== 25)
    qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.createdFrom) qs.set("createdFrom", params.createdFrom);
  if (params.role) qs.set("role", params.role);
  if (params.kycStatus) qs.set("kycStatus", params.kycStatus);
  const queryString = qs.toString();
  return {
    queryKey: ["admin-users", params] as const,
    queryFn: async (): Promise<AdminUsersList> => {
      const res = await fetch(
        queryString ? `/api/admin/users?${queryString}` : "/api/admin/users",
        {
          credentials: "include",
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? `Falha ao listar usuários (${res.status})`,
        );
      }
      return {
        data: (body?.data ?? []) as AdminUser[],
        total: body?.total ?? 0,
        pagina: body?.pagina ?? Number(params.page ?? 1),
      };
    },
    staleTime: 30_000,
  };
}

export type AdminConfigParam = {
  key: string;
  label: string;
  group: string;
  unit: "FRACTION" | "PERCENT" | "BRL" | "INT" | "BOOL";
  default: number;
  help?: string;
  currentValue: number;
  currentEffectiveFrom: string | null;
  scheduled: {
    id: number;
    value: number;
    effectiveFrom: string;
    note: string | null;
    createdAt: string;
  } | null;
  history: Array<{
    id: number;
    value: number;
    effectiveFrom: string;
    note: string | null;
    createdAt: string;
  }>;
};

export type AdminTaxonomyArea = {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
};

export type AdminTaxonomyCategory = AdminTaxonomyArea & {
  areas: AdminTaxonomyArea[];
};

export const adminTaxonomyQueryOptions = {
  queryKey: ["admin-taxonomy"] as const,
  queryFn: async (): Promise<AdminTaxonomyCategory[]> => {
    const res = await fetch("/api/admin/config/categories", {
      credentials: "include",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.error) {
      throw new Error(body?.message ?? "Falha ao carregar categorias");
    }
    return (body?.data ?? []) as AdminTaxonomyCategory[];
  },
  staleTime: 60_000,
};

export const adminConfigQueryOptions = {
  queryKey: ["admin-config"] as const,
  queryFn: async (): Promise<AdminConfigParam[]> => {
    const res = await fetch("/api/admin/config/parameters", {
      credentials: "include",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.error) {
      throw new Error(
        body?.message ?? `Falha ao carregar configurações (${res.status})`,
      );
    }
    return (body?.data ?? []) as AdminConfigParam[];
  },
  staleTime: 60_000,
};

export type AdminAffiliateProgram = {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  affiliateCommissionPct: string | number;
  platformCommissionPct: string | number;
  maxAffiliates: number | null;
  startup: { id: number; nome: string; area_atuacao: string | null };
  _count: { affiliations: number };
};

export type AdminAffiliateAffiliation = {
  id: number;
  status:
    | "PENDING_FOUNDER"
    | "PENDING_ADMIN"
    | "ACTIVE"
    | "REJECTED"
    | "SUSPENDED";
  code: string;
  tokensAllocated: number | null;
  purchaseLinkUrl: string | null;
  rejectionReason: string | null;
  user: { id: number; nome: string; email: string };
  program: {
    id: number;
    affiliateCommissionPct: string | number;
    startup: { id: number; nome: string };
  };
};

export type AdminAffiliateData = {
  programs: AdminAffiliateProgram[];
  affiliations: AdminAffiliateAffiliation[];
};

export const adminAffiliateQueryOptions = {
  queryKey: ["admin-affiliate"] as const,
  queryFn: async (): Promise<AdminAffiliateData> => {
    const [programsRes, affiliationsRes] = await Promise.all([
      fetch("/api/admin/affiliate/programs", { credentials: "include" }),
      fetch("/api/admin/affiliate/affiliations", { credentials: "include" }),
    ]);
    for (const r of [programsRes, affiliationsRes]) {
      const body = await r.json().catch(() => ({}));
      if (!r.ok || body?.error) {
        throw new Error(
          body?.message ?? `Falha ao carregar afiliações (${r.status})`,
        );
      }
    }
    const [programsJson, affiliationsJson] = await Promise.all([
      programsRes.json(),
      affiliationsRes.json(),
    ]);
    return {
      programs: (programsJson?.data ?? []) as AdminAffiliateProgram[],
      affiliations: (affiliationsJson?.data ??
        []) as AdminAffiliateAffiliation[],
    };
  },
  staleTime: 30_000,
};

// === Founder startup docs/identity (STATE-02D) ===

export type StartupDocumentRow = {
  id: number;
  categoria: string;
  nome: string;
  mimetype: string;
  sizeBytes: number;
  reviewStatus?: string;
  reviewNote?: string | null;
  createdAt: string;
};

export type StartupComplianceStatus = {
  required: number;
  present: number;
  missing: string[];
};

export type StartupDocumentNARow = {
  id: number;
  categoria: string;
  justificativa: string;
  reviewStatus?: string;
  reviewNote?: string | null;
};

/// Banner vermelho inline na categoria correspondente. Some automaticamente
/// quando o founder faz upload de um novo doc nessa categoria (resolvedAt setado).
export type StartupDocumentRejectionRow = {
  id: number;
  categoria: string;
  documentName: string;
  reason: string;
  rejectedAt: string;
};

export type StartupDocumentsPayload = {
  documents: StartupDocumentRow[];
  naoSeAplica: StartupDocumentNARow[];
  /// Rejeições em aberto (ver `BackendNode` startupDocumentRejection table).
  rejections?: StartupDocumentRejectionRow[];
  compliance: StartupComplianceStatus | null;
};

export function startupDocumentsQueryOptions(startupId: number | null) {
  return {
    queryKey: ["startup-documents", startupId] as const,
    queryFn: async (): Promise<StartupDocumentsPayload> => {
      if (!startupId)
        return {
          documents: [],
          naoSeAplica: [],
          rejections: [],
          compliance: null,
        };
      const res = await fetch(`/api/startup/${startupId}/documents`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? `Falha ao carregar documentos (${res.status})`,
        );
      }
      const data = body?.data ?? body ?? {};
      return {
        documents: (data.documents ?? []) as StartupDocumentRow[],
        naoSeAplica: (data.naoSeAplica ?? []) as StartupDocumentNARow[],
        rejections: (data.rejections ?? []) as StartupDocumentRejectionRow[],
        compliance: (data.compliance ?? null) as StartupComplianceStatus | null,
      };
    },
    enabled: typeof startupId === "number" && startupId > 0,
    staleTime: 30_000,
  };
}

export type StartupIdentity = {
  id: number;
  nome?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  cnpj?: string | null;
  anoFundacao?: number | null;
  estagio?: string | null;
  areaAtuacao?: string | null;
  paisIso3?: string | null;
};

export function startupIdentityQueryOptions(startupId: number | null) {
  return {
    queryKey: ["startup-identity", startupId] as const,
    queryFn: async (): Promise<StartupIdentity | null> => {
      if (!startupId) return null;
      const res = await fetch(`/api/startups/${startupId}`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? `Falha ao carregar identidade (${res.status})`,
        );
      }
      const data = body?.data ?? body ?? {};
      return {
        id: data.id ?? startupId,
        nome: data.nome ?? null,
        nomeFantasia: data.nomeFantasia ?? null,
        razaoSocial: data.razaoSocial ?? null,
        cnpj: data.cnpj ?? null,
        anoFundacao: data.anoFundacao ?? null,
        estagio: data.estagio ?? null,
        areaAtuacao: data.areaAtuacao ?? null,
        paisIso3: data.paisIso3 ?? null,
      };
    },
    enabled: typeof startupId === "number" && startupId > 0,
    staleTime: 5 * 60_000,
  };
}

// === Misc (STATE-02E) ===

export type InvestorDashboardInvestment = {
  id: number;
  campaignTitle: string;
  /** Subtotal de tokens (qty × preço de venda) — base de ROI. */
  amount: number;
  /** Total efetivamente pago (subtotal + taxa da plataforma). */
  totalCharged?: number;
  /** Taxa da plataforma cobrada. Null em investimentos legados. */
  platformFeeAmount?: number | null;
  tokensQty: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  paymentStatus: string;
  createdAt: string;
  currentValue: number | null;
};

export type InvestorDashboardData = {
  total: number;
  investments: InvestorDashboardInvestment[];
};

export const investorDashboardQueryOptions = {
  queryKey: ["investor-dashboard"] as const,
  queryFn: async (): Promise<InvestorDashboardData> => {
    const res = await fetch("/api/investments", { credentials: "include" });
    if (!res.ok) {
      return { total: 0, investments: [] };
    }
    const result = await res.json();
    return result.data || { total: 0, investments: [] };
  },
  staleTime: 30_000,
};

export interface InvestedStartup {
  startupId: number;
  nome: string;
  logo: string | null;
  segmento: string | null;
  campaignStatus: string;
  aportes: number;
  totalInvestido: number;
  totalTokens: number;
  currentValue: number | null;
}

export interface InvestedStartupsResponse {
  startups: InvestedStartup[];
  totalStartups: number;
  totalInvestido: number;
  currentValueTotal: number;
}

export const investedStartupsQueryOptions = {
  queryKey: ["invested-startups"] as const,
  queryFn: async (): Promise<InvestedStartupsResponse> => {
    const res = await fetch("/api/investments/my-startups", {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  staleTime: 30_000,
};

export type FounderInvestor = {
  id: number;
  nome: string;
  email: string;
  totalInvestido: number;
  totalTokens: number;
  aportes: number;
  primeiroAporte: string;
  ultimoAporte: string;
  startups: string[];
};

export type FounderInvestorsData = {
  investidores: FounderInvestor[];
  totalInvestidores: number;
  totalCaptado: number;
  escopo: string | null;
};

export function founderInvestorsQueryOptions(startupId: string | null) {
  return {
    queryKey: ["founder-investors", startupId] as const,
    queryFn: async (): Promise<FounderInvestorsData> => {
      // Sem startupId: backend exige filtro para evitar expor TODOS os
      // investidores do founder. Caller precisa navegar com ?startupId=...
      if (!startupId) {
        throw new Error("Selecione uma startup para ver os investidores.");
      }
      const res = await fetch(
        `/api/startup/${encodeURIComponent(startupId)}/investors`,
        {
          credentials: "include",
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(
          json?.message ?? "Não foi possível carregar os investidores.",
        );
      }
      return json.data as FounderInvestorsData;
    },
    staleTime: 30_000,
  };
}

export type AffiliateCandidatura = {
  id: number;
  status:
    | "PENDING_FOUNDER"
    | "PENDING_ADMIN"
    | "ACTIVE"
    | "REJECTED"
    | "SUSPENDED";
  code: string;
  tokensAllocated: number | null;
  appliedAt: string;
  rejectionReason: string | null;
  user: { id: number; nome: string; email: string; role: string };
  startup: { id: number; nome: string };
  comissaoPct: string | number;
  tokensAvailable: number;
};

export const affiliateTriagemQueryOptions = {
  queryKey: ["founder-affiliate-triagem"] as const,
  queryFn: async (): Promise<AffiliateCandidatura[]> => {
    const res = await fetch("/api/founder/affiliate/affiliations", {
      credentials: "include",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error) {
      throw new Error(
        json?.message ?? "Não foi possível carregar as candidaturas.",
      );
    }
    return (json.data ?? []) as AffiliateCandidatura[];
  },
  staleTime: 30_000,
};

// ─── S4: Gestão de Payouts (/admin/payouts) ────────────────────────────────
export interface PayoutAwaitingDecision {
  campaignId: number;
  campaignName: string;
  startupId: number | null;
  startupName: string | null;
  targetAmount: number | string;
  amountRaised: number;
  tokensSold: number;
  totalTokens: number;
  deadline: string | null;
}

export interface PayoutInstallmentRequest {
  id: number;
  installmentId: number;
  status: string;
  valorSolicitado: number | string;
  submittedAt: string;
  startupId: number | null;
  startupName: string | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
  hasReport: boolean;
  hasComprovante: boolean;
  /**
   * Detalhes do relatório mensal (FIN-11) preenchido pelo founder ao
   * solicitar a parcela. Permite abrir modal de revisão sem round-trip
   * extra ao backend. `observacao` é o campo de justificativa livre que
   * o founder preenche no form de solicitação; `usoRecurso` e
   * `mensagemInvestidores` são preenchidos em outro fluxo (PRD §8.2).
   * O badge `hasReport` no card do admin considera qualquer um dos três.
   */
  usoRecurso: string | null;
  observacao: string | null;
  mensagemInvestidores: string | null;
  /** Mapa `{ marketing: 30, pessoal: 20, ... }` em percentual (0-100). */
  allocationPercents: Record<string, number>;
  /** Mapa `{ marketing: "R$ 1.000,00", ... }` em reais. Pode ser null. */
  allocationValues: Record<string, string> | null;
  /** Snapshot dos dados bancários no momento da criação da solicitacao. */
  bankInfoSnapshot: {
    banco: string;
    agencia: string;
    conta: string;
    tipoConta: string;
  } | null;
  scheduledDate: string | null;
  valorParcela: number | string | null;
}

export interface PayoutScheduledInstallment {
  id: number;
  numero: number;
  valor: number | string;
  scheduledDate: string | null;
  paidAt: string | null;
  status: string;
  repasseId: number;
  campaignId: number;
  campaignName: string;
  startupId: number;
  startupName: string;
  totalInstallments: number;
}

export interface AdminPayouts {
  awaitingDecision: PayoutAwaitingDecision[];
  installmentRequests: PayoutInstallmentRequest[];
  awaitingRequest: PayoutAwaitingRequest[];
  scheduledInstallments?: PayoutScheduledInstallment[];
  scheduledInstallmentsPagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Repasse configurado, aguardando o founder solicitar a parcela. */
export interface PayoutAwaitingRequest {
  repasseId: number;
  campaignId: number | null;
  startupId: number | null;
  startupName: string | null;
  numeroParcelas: number;
  valorParcela: number;
  proximaParcela: number | null;
}

export function adminPayoutsQueryOptions(page = 1) {
  return {
    queryKey: ["admin-payouts", page] as const,
    queryFn: async (): Promise<AdminPayouts> => {
      const res = await fetch(`/api/admin/payouts?page=${page}`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? "Falha ao carregar payouts");
      }
      return body.data as AdminPayouts;
    },
    staleTime: 30_000,
  };
}

// ===========================================================================
// S3-T01 — Founder marketplace info (score + breakdown + pin)
// ===========================================================================

import type { MarketplacePositionData } from "~/types/marketplace-position";

export function founderMarketplaceInfoQueryOptions(startupId: string | null) {
  return {
    queryKey: ["founder-marketplace-info", startupId] as const,
    queryFn: async (): Promise<MarketplacePositionData> => {
      if (!startupId) {
        throw new Error(
          "Selecione uma startup para ver a posicao no marketplace.",
        );
      }
      const res = await fetch(
        `/api/founder/startups/${encodeURIComponent(startupId)}/marketplace-info`,
        {
          credentials: "include",
        },
      );
      const body = (await res.json().catch(() => null)) as
        | { error?: boolean; data?: MarketplacePositionData; message?: string }
        | null;
      if (!res.ok || body?.error || !body?.data) {
        throw new Error(
          body?.message ?? "Nao foi possivel carregar a posicao no marketplace.",
        );
      }
      return body.data;
    },
    staleTime: 60_000,
    enabled: Boolean(startupId),
  };
}

// ===========================================================================
// S4-T03 — Admin marketplace pinned list
// ===========================================================================

import type { AdminPinnedStartup } from "~/types/admin-marketplace";

export function adminMarketplacePinnedQueryOptions() {
  return {
    queryKey: ["admin-marketplace-pinned"] as const,
    queryFn: async (): Promise<AdminPinnedStartup[]> => {
      const res = await fetch("/api/admin/marketplace/pinned", {
        credentials: "include",
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: boolean; data?: AdminPinnedStartup[]; message?: string }
        | null;
      if (!res.ok || body?.error || !body?.data) {
        throw new Error(body?.message ?? "Falha ao carregar pinos");
      }
      return body.data;
    },
    staleTime: 30_000,
  };
}

// ===========================================================================
// S18.6 — Admin Financeiro Split (repasse × lucro plataforma)
// ===========================================================================

/** Linha da listagem em /admin/financeiro/split (1 campanha). */
export type FinanceiroSplitRow = {
  campaignId: number;
  startupId: number;
  startupNome: string;
  startupSlug: string;
  campaignTitle: string;
  status: "OPEN" | "CLOSED" | "FUNDED" | "PAID_OUT" | "DRAFT" | "PAUSED";
  targetAmount: number;
  amountRaised: number;
  startupRepasseTotal: number;
  platformSpreadTotal: number;
  platformFeeTotal: number;
  platformRevenueTotal: number;
  affiliateCommissionTotal: number;
  investorsCount: number;
  deadline: string | null;
  closedAt: string | null;
};

/** Breakdown agregado da página atual (somatórios dos filtros aplicados). */
export type FinanceiroSplitTotals = {
  amountRaised: number;
  startupRepasseTotal: number;
  platformSpreadTotal: number;
  platformFeeTotal: number;
  platformRevenueTotal: number;
  affiliateCommissionTotal: number;
};

/** Resposta de GET /api/admin/financeiro/split. */
export type FinanceiroSplitList = {
  data: FinanceiroSplitRow[];
  totals: FinanceiroSplitTotals;
  pagina: number;
  pageSize: number;
  total: number;
};

/** Filtros aceitos pela listagem. */
export type FinanceiroSplitFilters = {
  from?: string;
  to?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

/** Investment individual no detalhe de uma campanha. */
export type FinanceiroSplitInvestment = {
  id: number;
  userPublicId: string;
  userNome: string;
  tokensQty: number;
  tokenBasePrice: number | null;
  tokenSellPrice: number | null;
  tokenSubtotal: number;
  platformFeePct: number | null;
  platformFeeAmount: number;
  startupRepasseAmount: number;
  platformSpreadAmount: number;
  platformRevenueAmount: number;
  affiliateCommissionAmount: number;
  totalCharged: number;
  paidAt: string | null;
  allocatedAt: string | null;
  method: "PIX" | "CREDIT_CARD" | "WALLET" | null;
};

/** Resposta de GET /api/admin/financeiro/split/:campaignId. */
export type FinanceiroSplitDetail = {
  campaign: {
    id: number;
    title: string;
    status: string;
    targetAmount: number;
    tokenBaseValue: number | null;
    tokenSellPrice: number | null;
    totalTokens: number;
    tokensSold: number;
    deadline: string | null;
    closedAt: string | null;
    startup: {
      id: number;
      nome: string;
      slug: string;
      cnpj: string | null;
    };
  };
  breakdown: FinanceiroSplitTotals & { investorsCount: number };
  investments: FinanceiroSplitInvestment[];
};

/**
 * Query options para listagem paginada.
 * Cobertura ampla de filtros com debounce no componente via state local.
 */
export function financeiroSplitQueryOptions(filters: FinanceiroSplitFilters) {
  const qs = new URLSearchParams();
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (filters.status) qs.set("status", filters.status);
  if (filters.search) qs.set("search", filters.search);
  if (filters.page) qs.set("page", String(filters.page));
  if (filters.pageSize) qs.set("pageSize", String(filters.pageSize));

  return {
    queryKey: ["admin-financeiro-split", filters] as const,
    queryFn: async (): Promise<FinanceiroSplitList> => {
      const res = await fetch(
        `/api/admin/financeiro/split?${qs.toString()}`,
        { credentials: "include" },
      );
      const body = (await res.json().catch(() => null)) as
        | {
            error?: boolean;
            data?: FinanceiroSplitList;
            message?: string;
          }
        | null;
      if (!res.ok || body?.error || !body?.data) {
        throw new Error(
          body?.message ?? "Falha ao carregar split financeiro",
        );
      }
      return body.data;
    },
    staleTime: 60_000,
  };
}

export function financeiroSplitDetailQueryOptions(campaignId: number) {
  return {
    queryKey: ["admin-financeiro-split-detail", campaignId] as const,
    queryFn: async (): Promise<FinanceiroSplitDetail> => {
      const res = await fetch(`/api/admin/financeiro/split/${campaignId}`, {
        credentials: "include",
      });
      const body = (await res.json().catch(() => null)) as
        | {
            error?: boolean;
            data?: FinanceiroSplitDetail;
            message?: string;
          }
        | null;
      if (!res.ok || body?.error || !body?.data) {
        throw new Error(body?.message ?? "Falha ao carregar detalhe");
      }
      return body.data;
    },
    staleTime: 60_000,
    enabled: Boolean(campaignId),
  };
}
