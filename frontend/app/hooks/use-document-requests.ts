import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { DocumentRequestItem } from "~/lib/document-request-types";

async function fetchDocumentRequests(
  params: { startupId?: number; status?: string } = {},
): Promise<DocumentRequestItem[]> {
  const qs = new URLSearchParams();
  if (params.startupId) qs.set("startupId", String(params.startupId));
  if (params.status) qs.set("status", params.status);
  const res = await fetch(`/api/admin/document-requests${qs ? `?${qs}` : ""}`);
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  return (json?.data ?? []) as DocumentRequestItem[];
}

export function useDocumentRequestsQuery(params: { startupId?: number; status?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.documentRequests.admin(params),
    queryFn: () => fetchDocumentRequests(params),
    staleTime: 30_000,
  });
}

export function useCreateDocumentRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startupId: number; type: string; description: string; deadline?: string | null }) => {
      const res = await fetch("/api/admin/document-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) throw new Error(json?.message ?? "Erro ao criar solicitação");
      return json.data as DocumentRequestItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documentRequests.all });
    },
  });
}

export function useCancelDocumentRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/document-requests/${id}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) throw new Error(json?.message ?? "Erro ao cancelar");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documentRequests.all });
    },
  });
}
