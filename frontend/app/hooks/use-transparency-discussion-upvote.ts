/**
 * Hook: useToggleUpvote(discussionId)
 *
 * POST/DELETE /api/transparency/discussions/:id/upvote (toggle idempotente).
 *
 * Invalida lista (counter) + detalhe (estado viewerHasUpvoted).
 * Optimistic update do contador pra UI responsiva.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type {
  DiscussionListResponse,
  TransparencyDiscussion,
} from "~/types/transparency";

interface UpvoteResponse {
  upvotesCount: number;
  viewerHasUpvoted: boolean;
}

async function toggleUpvote(discussionId: string): Promise<UpvoteResponse> {
  const res = await fetch(
    `/api/transparency/discussions/${discussionId}/upvote`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Falha ao votar (${res.status})`);
  }
  return data?.data ?? { upvotesCount: 0, viewerHasUpvoted: false };
}

export function useToggleUpvote(discussionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => toggleUpvote(discussionId),
    onSuccess: (data) => {
      // Atualiza cache do detalhe (viewerHasUpvoted + upvotesCount)
      qc.setQueryData<TransparencyDiscussion | undefined>(
        ["transparency-discussion", discussionId],
        (prev) =>
          prev
            ? { ...prev, upvotesCount: data.upvotesCount, viewerHasUpvoted: data.viewerHasUpvoted }
            : prev,
      );
      // Invalida lista (contadores podem ter mudado)
      qc.invalidateQueries({ queryKey: queryKeys.transparency.allDiscussions });
    },
  });
}