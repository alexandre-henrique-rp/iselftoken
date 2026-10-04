import { dehydrate } from "@tanstack/react-query";
import {
  complianceDashboardSummaryQueryOptions,
  type ComplianceDashboardSummary,
} from "~/lib/queries";
import { createQueryClient } from "~/lib/query-client";
import { serverFetch } from "~/lib/server-fetch";

export async function loadComplianceDashboard(request: Request) {
  const response = await serverFetch(
    request,
    "/api/admin/compliance/dashboard",
  );
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw new Response(
      body?.message ?? "Não foi possível carregar o dashboard de Compliance.",
      { status: response.ok ? 502 : response.status },
    );
  }

  const summary = body?.data as ComplianceDashboardSummary | undefined;
  if (!summary?.kpis) {
    throw new Response("Resposta inválida do dashboard de Compliance.", {
      status: 502,
    });
  }

  const queryClient = createQueryClient();
  queryClient.setQueryData(
    complianceDashboardSummaryQueryOptions.queryKey,
    summary,
  );

  return { dehydratedState: dehydrate(queryClient) };
}
