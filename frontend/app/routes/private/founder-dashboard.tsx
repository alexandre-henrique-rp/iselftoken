import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";
import { FounderDashboardView } from "~/components/founder/founder-dashboard-view";
import { useBlockedRoundToast } from "~/hooks/use-blocked-round-toast";
import { useFounderDashboardState } from "~/hooks/use-founder-dashboard-state";
import { createQueryClient } from "~/lib/query-client";
import {
  startupDashboardMetricsQueryOptions,
  startupsQueryOptions,
  type DashboardMetrics,
} from "~/lib/queries";
import { serverFetch } from "~/lib/server-fetch";
import type { Route } from "./+types/founder-dashboard";

export async function loader({ request }: Route.LoaderArgs) {
  const queryClient = createQueryClient();

  const startupsRes = await serverFetch(request, "/api/startup");

  if (!startupsRes.ok) {
    throw new Response("Erro ao carregar startups", {
      status: startupsRes.status,
    });
  }

  const startups = await startupsRes.json();
  // O endpoint /startup já retorna o summary calculado pelo backend junto
  // com a lista. Reutilizar esses dados evita uma segunda chamada a
  // /startup/dashboard/metrics e elimina consultas duplicadas no SSR.
  const summary = startups?.summary;
  const metrics: DashboardMetrics = summary
    ? {
        investor_count: summary.investidoresUnicos ?? 0,
        amount_raised: summary.captado30d?.valor ?? 0,
        days_remaining: summary.restantes?.diasAteProximoFechamento ?? null,
        total_campaigns: summary.campanhas?.total ?? 0,
        open_campaigns: summary.campanhas?.abertas ?? 0,
        average_progress: summary.progressoMedio ?? 0,
      }
    : {
        investor_count: 0,
        amount_raised: 0,
        days_remaining: null,
        total_campaigns: 0,
        open_campaigns: 0,
        average_progress: 0,
      };

  queryClient.setQueryData(startupsQueryOptions.queryKey, startups);
  queryClient.setQueryData(
    startupDashboardMetricsQueryOptions.queryKey,
    { data: metrics },
  );

  return { dehydratedState: dehydrate(queryClient) };
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Minhas Startups | iSelfToken" },
    {
      name: "description",
      content: "Gerencie suas startups e rodadas de investimento na iSelfToken.",
    },
  ];
}

export default function FounderDashboard({ loaderData }: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <FounderDashboardScreen />
    </HydrationBoundary>
  );
}

function FounderDashboardScreen() {
  const [searchParams, setSearchParams] = useSearchParams();

  useBlockedRoundToast(searchParams, setSearchParams);

  const dash = useFounderDashboardState();

  return (
    <div className="relative">
      <DashboardBackgroundWatermark />
      <FounderDashboardView
        metrics={dash.metrics}
        counts={dash.counts}
        isInitialLoading={dash.isInitialLoading}
        hasError={dash.hasError}
        hasAny={dash.hasAny}
        hasMatch={dash.hasMatch}
        state={dash.state}
        visible={dash.visible}
        page={dash.page}
        totalPages={dash.totalPages}
        onRetry={dash.refetch}
        onClearFilters={() =>
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete("status");
              next.delete("q");
              next.delete("page");
              return next;
            },
            { replace: true },
          )
        }
      />
    </div>
  );
}
