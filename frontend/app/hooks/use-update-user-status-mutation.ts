import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUsersQueryOptions, queryKeys } from "~/lib/queries";

interface UpdateUserStatusInput {
  userId: number;
  isActive: boolean;
}

/**
 * Hook: useUpdateUserStatusMutation
 *
 * Ativa ou suspende um usuário via BFF `PUT /api/admin/users/:id/status`.
 * Invalida `["admin-users"]` em `onSuccess` para recarregar a lista.
 *
 * @example
 *   const { mutate, isPending } = useUpdateUserStatusMutation();
 *   mutate({ userId: 1, isActive: false });
 */
export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUserStatusInput) => {
      const res = await fetch(`/api/admin/users/${input.userId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: input.isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message ?? `Erro ao atualizar status (${res.status})`,
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
    },
  });
}
