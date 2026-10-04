import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsUnreadCountQueryOptions, queryKeys } from "~/lib/queries";

const API_BASE =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";

/**
 * Marca uma notificação específica como lida.
 *
 * Invalida `["notifications"]` (família inteira — página visível atualiza)
 * e `["notifications-unread-count"]` (badge no TopNavbar atualiza).
 */
export function useMarkAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/notifications/${id}/mark-as-read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`mark-as-read failed: ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({
        queryKey: notificationsUnreadCountQueryOptions.queryKey,
      });
    },
  });
}
