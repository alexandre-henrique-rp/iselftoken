import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { RepasseDashboardData } from "~/types/repasse";

/**
 * Hook que busca o dashboard consolidado do Repasse para o fundador.
 *
 * GET /api/founder/startups/:id/repasse/dashboard
 *
 * Polling inteligente de 60s apenas quando ha solicitacao ativa
 * (`currentInstallment.status === "REQUESTED"`). Caso contrario,
 * polling desativado para evitar requests desnecessarios.
 */
export function useRepasseDashboard(startupId: string | number | null | undefined) {
  return useQuery<RepasseDashboardData>({
    queryKey: queryKeys.repasse.byStartup(String(startupId ?? "")),
    queryFn: async () => {
      if (!startupId) throw new Error("startupId obrigatorio");
      const res = await fetch(
        `/api/founder/startups/${startupId}/repasse/dashboard`,
        { credentials: "include" },
      );
      const body = await res.json().catch(() => ({ error: true }));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? `Erro ${res.status} ao buscar dashboard`);
      }
      return (body?.data ?? body) as RepasseDashboardData;
    },
    enabled: Boolean(startupId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.currentInstallment?.status === "REQUESTED" ? 60_000 : false;
    },
  });
}
