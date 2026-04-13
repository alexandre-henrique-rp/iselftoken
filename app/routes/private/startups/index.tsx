import { useEffect, useMemo, useState } from "react";
import { useLoaderData, useNavigation, useRevalidator } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types";
import {
  DashboardHeader,
  EmptyState,
  filterStartups,
  LoadingList,
  StartupFilters,
  StartupRow,
  type StartupFiltersState,
  type StartupItem,
} from "./components";

interface StartupsLoaderData {
  startups: StartupItem[];
  error: string | null;
}

function mapPlatformStatus(status?: string): StartupItem["status"] {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "approved" || normalized === "aprovada") return "approved";
  if (
    normalized === "analysis" ||
    normalized === "em_analise" ||
    normalized === "em análise"
  ) {
    return "analysis";
  }
  if (normalized === "rejected" || normalized === "rejeitada")
    return "rejected";

  return "draft";
}

function mapCampaignStatus(
  status?: string,
): NonNullable<StartupItem["campaign"]>["status"] {
  const normalized = (status ?? "").toLowerCase();

  if (
    normalized === "open" ||
    normalized === "aberto" ||
    normalized === "aberta"
  )
    return "open";
  if (normalized === "funded" || normalized === "financiada") return "funded";
  if (normalized === "closed" || normalized === "encerrada") return "closed";

  return "editing";
}

interface RawStartupPayload {
  id?: string | number;
  _id?: string;
  nome?: string;
  name?: string;
  segmento?: string;
  segment?: string;
  logo?: string;
  image?: string;
  status?: string;
  estagio?: string;
  stage?: string;
  totalTokens?: number;
  soldTokens?: number;
  tokensVendidos?: number;
  percentualVendido?: number;
  statusCampanha?: string;
  createdAt?: string;
  campaign?: {
    status?: string;
    raised?: number;
    goal?: number;
    percentage?: number;
    investors?: number;
    daysLeft?: number | null;
  } | null;
}

/**
 * @name loader
 * @description Busca startups do usuário via rota interna e normaliza o payload para a UI.
 */
export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const response = await fetch(`${baseUrl}/api/startups/list-my`, {
    method: "GET",
    headers: {
      Cookie: request.headers.get("cookie") ?? "",
    },
  });

  const payload = await response.json().catch(() => null);
  const rawList =
    payload?.data?.startups ??
    payload?.data ??
    payload?.startups ??
    payload ??
    [];

  const startups = Array.isArray(rawList)
    ? rawList.map(normalizeStartup).filter(Boolean)
    : [];

  if (!response.ok || payload?.error) {
    return Response.json(
      {
        startups: [],
        error: payload?.message ?? "Não foi possível carregar suas startups",
      },
      { status: response.status || 500 },
    );
  }

  return Response.json({ startups, error: null });
}

function normalizeStartup(raw: RawStartupPayload): StartupItem | null {
  const id = raw.id ?? raw._id;

  if (!id) {
    return null;
  }

  const soldTokens = Number(raw.soldTokens ?? raw.tokensVendidos ?? 0);
  const totalTokens = Number(raw.totalTokens ?? 0);
  const campaignData = raw.campaign ?? null;
  const campaignPercentage =
    raw.percentualVendido ??
    campaignData?.percentage ??
    (totalTokens > 0 ? Math.round((soldTokens / totalTokens) * 100) : 0);

  return {
    id: String(id),
    name: raw.name ?? raw.nome ?? "Startup sem nome",
    segment: raw.segment ?? raw.segmento ?? "Segmento não informado",
    logo: raw.logo ?? raw.image ?? "",
    status: mapPlatformStatus(raw.status),
    stage: raw.stage ?? raw.estagio ?? "Não informado",
    totalTokens,
    soldTokens,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    campaign:
      campaignData || raw.statusCampanha
        ? {
            status: mapCampaignStatus(
              campaignData?.status ?? raw.statusCampanha,
            ),
            raised: Number(campaignData?.raised ?? 0),
            goal: Number(campaignData?.goal ?? 0),
            percentage: Number(campaignPercentage),
            investors: Number(campaignData?.investors ?? 0),
            daysLeft:
              typeof campaignData?.daysLeft === "number"
                ? campaignData.daysLeft
                : null,
          }
        : null,
  };
}

/**
 * @name StartupsDashboardPage
 * @description Renderiza o dashboard de startups com filtros e listagem em cards horizontais.
 */
export default function StartupsDashboardPage() {
  const data = useLoaderData<StartupsLoaderData>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const [filters, setFilters] = useState<StartupFiltersState>({
    status: "all",
    campaign: "all",
    search: "",
  });
  const isLoading =
    navigation.state === "loading" || revalidator.state === "loading";
  const startups = data?.startups ?? [];
  const error = data?.error ?? null;

  const filteredStartups = useMemo(
    () => filterStartups(startups, filters, filters.search),
    [filters, startups],
  );

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error("Não foi possível carregar suas startups", {
      id: "startup-dashboard-error",
      description: error,
    });
  }, [error]);

  const hasSearchTerm = filters.search.trim().length > 0;

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-6 text-stone-50 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <DashboardHeader total={startups.length} />

        <StartupFilters
          filters={filters}
          onFiltersChange={setFilters}
          onSearchChange={(value) =>
            setFilters((prev) => ({ ...prev, search: value }))
          }
        />

        {isLoading ? <LoadingList /> : null}

        {!isLoading ? (
          <section className="space-y-4" aria-live="polite">
            {filteredStartups.length > 0 ? (
              filteredStartups.map((startup) => (
                <StartupRow key={startup.id} startup={startup} />
              ))
            ) : (
              <EmptyState
                isSearchResult={hasSearchTerm}
                searchTerm={filters.search}
                onClearSearch={() =>
                  setFilters((prev) => ({ ...prev, search: "" }))
                }
              />
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
