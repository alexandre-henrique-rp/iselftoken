/**
 * Hooks TanStack Query para gerenciar alocação de recursos de uma campanha.
 *
 * GET /api/campaigns/:id/resources — busca alocações atuais.
 * PUT /api/campaigns/:id/resources — atualiza alocações.
 *
 * @param campaignId - ID numérico da campanha
 * @returns Query/mutation para alocações de recursos
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { ResourceAllocation } from "~/components/founder/round-resources-editor";

interface CampaignResourcesResponse {
  resourceAllocations: ResourceAllocation[];
}

/**
 * Busca as alocações de recursos de uma campanha específica.
 *
 * @param campaignId - ID da campanha
 * @returns Query com as alocações de recursos
 */
export function useCampaignResources(campaignId: number | null) {
  return useQuery<CampaignResourcesResponse>({
        queryKey: queryKeys.campaignResources(campaignId),
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/resources`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Erro ao buscar alocações de recursos");
      }
      return res.json();
    },
    enabled: !!campaignId,
  });
}

/**
 * Mutation para atualizar as alocações de recursos de uma campanha.
 * Invalida o cache de campaign-resources após sucesso.
 *
 * @param campaignId - ID da campanha
 * @returns Mutation para enviar alocações atualizadas
 */
export function useUpdateCampaignResources(campaignId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocations: ResourceAllocation[]) => {
      const res = await fetch(`/api/campaigns/${campaignId}/resources`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resourceAllocations: allocations }),
      });
      if (!res.ok) {
        throw new Error("Erro ao atualizar alocações de recursos");
      }
      return res.json() as Promise<CampaignResourcesResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
    queryKey: queryKeys.campaignResources(campaignId),
      });
    },
  });
}
