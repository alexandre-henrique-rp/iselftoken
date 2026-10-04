import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsUnreadCountQueryOptions, queryKeys } from "~/lib/queries";

const API_BASE =
  typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";

/**
 * Marca todas as notificações do usuário como lidas (bulk).
 *
 * Invalida `["notifications"]` e `["notifications-unread-count"]` para a UI
 * refletir o novo estado sem refetch adicional.
 */
export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/notifications/mark-all-as-read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`mark-all-as-read failed: ${res.status}`);
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
