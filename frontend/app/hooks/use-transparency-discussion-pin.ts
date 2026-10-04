/**
 * Hook: useTogglePin(discussionId, startupId)
 *
 * POST/DELETE /api/transparency/discussions/:id/pin
 * Apenas founder/admin (gate backend).
 *
 * Invalida feed (sticky badge) + detalhe (isPinned).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type { TransparencyDiscussion } from "~/types/transparency";

interface PinResponse {
  isPinned: boolean;
  pinnedAt: string | null;
}

async function togglePin(
  discussionId: string,
  action: "pin" | "unpin",
): Promise<PinResponse> {
  const method = action === "pin" ? "POST" : "DELETE";
  const res = await fetch(
    `/api/transparency/discussions/${discussionId}/pin`,
    {
      method,
      credentials: "include",
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Falha ao fixar (${res.status})`);
  }
  return data?.data ?? { isPinned: false, pinnedAt: null };
}

export function useTogglePin(
  discussionId: string,
  startupId: number,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: "pin" | "unpin") => togglePin(discussionId, action),
    onSuccess: (data) => {
      qc.setQueryData<TransparencyDiscussion | undefined>(
        ["transparency-discussion", discussionId],
        (prev) => (prev ? { ...prev, ...data } : prev),
      );
      // Pin afeta sticky badge do feed - invalida lista
      qc.invalidateQueries({
        queryKey: queryKeys.transparency.discussions(startupId),
      });
    },
  });
}