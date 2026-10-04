import type { SetURLSearchParams } from "react-router";
import { formatBRLCompact, formatBRLCompactWithCents } from "~/lib/currency-format";
import type { FounderStartup } from "~/types/founder-startup";
import type { Startup } from "./startup-card";

export const PAGE_SIZE = 12;

export type PlatformStatusFilter = "all" | "approved" | "analyzing";
export type CampaignStatusFilter =
  | "all"
  | "draft"
  | "analysis"
  | "open"
  | "paused"
  | "closed"
  | "funded"
  | "paid_out";
export type DashboardView = "list" | "grid" | "kanban";

export const CAMPAIGN_STATUS_LABELS: Record<Exclude<CampaignStatusFilter, "all">, string> = {
  draft: "Rascunho",
  analysis: "Em análise",
  open: "Aberta",
  paused: "Pausada",
  closed: "Encerrada",
  funded: "Financiada",
  paid_out: "Paga",
};

export interface DashboardSearchState {
  platformStatus: PlatformStatusFilter;
  campaignStatus: CampaignStatusFilter;
  q: string;
  view: DashboardView;
  page: number;
}

const PLATFORM_STATUS_VALUES: ReadonlyArray<PlatformStatusFilter> = [
  "all",
  "approved",
  "analyzing",
];
const CAMPAIGN_STATUS_VALUES: ReadonlyArray<CampaignStatusFilter> = [
  "all",
  "draft",
  "analysis",
  "open",
  "paused",
  "closed",
  "funded",
  "paid_out",
];
const VIEW_VALUES: ReadonlyArray<DashboardView> = ["list", "grid", "kanban"];

function isPlatformStatus(v: string | null): v is PlatformStatusFilter {
  return v !== null && (PLATFORM_STATUS_VALUES as ReadonlyArray<string>).includes(v);
}

function isCampaignStatus(v: string | null): v is CampaignStatusFilter {
  return v !== null && (CAMPAIGN_STATUS_VALUES as ReadonlyArray<string>).includes(v);
}

function isView(v: string | null): v is DashboardView {
  return v !== null && (VIEW_VALUES as ReadonlyArray<string>).includes(v);
}

export function parseSearchState(sp: URLSearchParams): DashboardSearchState {
  const rawPlatformStatus = sp.get("status");
  const rawCampaignStatus = sp.get("campaignStatus");
  const rawView = sp.get("view");
  const rawPage = Number.parseInt(sp.get("page") ?? "1", 10);
  return {
    platformStatus: isPlatformStatus(rawPlatformStatus) ? rawPlatformStatus : "all",
    campaignStatus: isCampaignStatus(rawCampaignStatus) ? rawCampaignStatus : "all",
    q: (sp.get("q") ?? "").trim(),
    view: isView(rawView) ? rawView : "list",
    page: Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
}

export interface UpdateOptions {
  resetPage?: boolean;
  replace?: boolean;
}

export function updateSearch(
  setSearchParams: SetURLSearchParams,
  patch: Partial<Record<"status" | "campaignStatus" | "q" | "view" | "page", string>>,
  opts: UpdateOptions = {}
): void {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "" || value === null) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (opts.resetPage) {
        next.delete("page");
      }
      return next;
    },
    { replace: opts.replace ?? false }
  );
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchPlatformStatus(filter: PlatformStatusFilter) {
  return (startup: Startup): boolean => {
    if (filter === "all") return true;
    return startup.platformStatus === filter;
  };
}

export function matchCampaignStatus(filter: CampaignStatusFilter) {
  return (startup: Startup): boolean => {
    if (filter === "all") return true;
    return startup.campaignStatus === filter;
  };
}

export function matchQuery(q: string) {
  const needle = normalize(q);
  if (needle.length === 0) return (_s: Startup) => true;
  return (s: Startup): boolean =>
    normalize(s.name).includes(needle) ||
    normalize(s.category ?? s.segment).includes(needle);
}

export function applyFilters(
  startups: ReadonlyArray<Startup>,
  state: DashboardSearchState
): Startup[] {
  return startups
    .filter(matchPlatformStatus(state.platformStatus))
    .filter(matchCampaignStatus(state.campaignStatus))
    .filter(matchQuery(state.q));
}

export interface DashboardCounts {
  total: number;
  approved: number;
  analyzing: number;
  campaigns: Record<Exclude<CampaignStatusFilter, "all">, number>;
}

export function deriveCounts(startups: ReadonlyArray<Startup>): DashboardCounts {
  const campaigns = Object.fromEntries(
    Object.keys(CAMPAIGN_STATUS_LABELS).map((status) => [status, 0]),
  ) as DashboardCounts["campaigns"];
  let approved = 0;
  let analyzing = 0;
  for (const startup of startups) {
    if (startup.platformStatus === "approved") approved++;
    else if (startup.platformStatus === "analyzing") analyzing++;
    if (startup.campaignStatus in campaigns) {
      campaigns[startup.campaignStatus as Exclude<CampaignStatusFilter, "all">]++;
    }
  }
  return { total: startups.length, approved, analyzing, campaigns };
}

/**
 * Mapeia o payload do backend (FounderStartup) para o shape `Startup`
 * consumido pelos componentes de card / list / grid / kanban.
 *
 * Centralizado aqui para que o loader SSR e o componente cliente
 * (após hidratação) cheguem ao mesmo shape sem duplicar mapeamento.
 *
 * **Unidades**: `valorCaptado` e `valorMeta` chegam do backend já em **REAIS**
 * (Decimal → Number sem divisão por 100). `formatBRLCompact` espera reais.
 *
 * **Progresso**: derivado quando há meta conhecida. Cap em 100% (display) para
 * FUNDED/PAID_OUT onde o backend pode reportar captado ≥ meta.
 */
export function mapApiToStartup(apiStartup: FounderStartup): Startup {
  const statusMap: Record<string, "approved" | "analyzing"> = {
    aprovada: "approved",
    em_analise: "analyzing",
    rejeitada: "analyzing",
  };

  const campaignStatusMap: Record<
    string,
    | "draft"
    | "analysis"
    | "open"
    | "paused"
    | "closed"
    | "funded"
    | "paid_out"
  > = {
    edicao: "draft",
    em_analise: "analysis",
    aberto: "open",
    pausado: "paused",
    encerrado: "closed",
    financiado: "funded",
    reprovado: "closed",
    pago: "paid_out",
  };

  const raisedReais = apiStartup.valorCaptado ?? 0;
  const goalReais = apiStartup.valorMeta ?? null;
  const progressPct =
    goalReais != null && goalReais > 0
      ? Math.min(100, Math.round((raisedReais / goalReais) * 100))
      : null;

  return {
    id: apiStartup.id,
    slug: apiStartup.slug,
    name: apiStartup.nome,
    segment: apiStartup.segmento || "Sem segmento",
    category: apiStartup.categoria ?? apiStartup.segmento ?? "Sem categoria",
    stage: apiStartup.estagio?.toLowerCase() ?? null,
    logo: apiStartup.logo || null,
    bandeira: apiStartup.bandeira ?? null,
    platformStatus: statusMap[apiStartup.status] || "analyzing",
    phase3Rejected: apiStartup.phase3Rejected === true,
    campaignStatus: campaignStatusMap[apiStartup.statusCampanha] || "draft",
    // S18.6 — ID da campanha ativa (mais recente) para o link direto do
    // Financeiro sem passar pelo redirect legacy. Backend retorna em
    // `campaigns: [{id, status}]` (enrichment.service.ts).
    campaignId: (apiStartup.campaigns ?? [])[0]?.id ?? null,
    repasseConfigurado: apiStartup.repasseConfigurado === true,
    // S18.6 — exibe os centavos para o founder ver o valor exato do
    // pagamento (ex.: R$ 500.000,00 em vez de R$ 500.000). Demais KPIs
    // continuam com `formatBRLCompact` para preservar layout enxuto.
    raised: formatBRLCompactWithCents(raisedReais),
    goal: goalReais != null ? formatBRLCompactWithCents(goalReais) : "—",
    raisedAmount: raisedReais,
    goalAmount: goalReais,
    progressPct,
    roundStatus: apiStartup.roundStatus,
  };
}
