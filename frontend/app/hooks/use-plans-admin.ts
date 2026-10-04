import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { PlanItem, PlanStats } from "~/lib/plan-types";

async function fetchAdminPlans(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ data: PlanItem[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  const res = await fetch(`/api/admin/plans${qs ? `?${qs}` : ""}`);
  if (!res.ok) return { data: [], total: 0 };
  const json = await res.json().catch(() => null);
  return {
    data: (json?.data ?? []) as PlanItem[],
    total: json?.total ?? 0,
  };
}

export function useAdminPlansQuery(params: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.adminPlans(params),
    queryFn: () => fetchAdminPlans(params),
    staleTime: 30_000,
  });
}

export function useAdminPlanStatsQuery(planId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.adminPlanStats(planId),
    queryFn: async (): Promise<PlanStats | null> => {
      if (!planId) return null;
      const res = await fetch(`/api/admin/plans/${planId}/stats`);
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      return (json?.data ?? null) as PlanStats | null;
    },
    enabled: Boolean(planId),
    staleTime: 60_000,
  });
}

export interface PlanPayload {
  nome: string;
  slug: string;
  descricao?: string;
  preco: number;
  periodoMeses: number;
  periodo: string;
  icon?: string;
  beneficios?: string[];
  visivel: boolean;
  isActive: boolean;
  recomendado: boolean;
  textoBotao?: string;
}

export function useCreatePlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanPayload) => {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) throw new Error(json?.message ?? "Erro ao criar plano");
      return json.data as PlanItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminPlans({}) }),
  });
}

export function useUpdatePlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<PlanPayload> & { id: number }) => {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) throw new Error(json?.message ?? "Erro ao atualizar plano");
      return json.data as PlanItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminPlans({}) }),
  });
}

export function useDeletePlanMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) throw new Error(json?.message ?? "Erro ao desativar plano");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminPlans({}) }),
  });
}
