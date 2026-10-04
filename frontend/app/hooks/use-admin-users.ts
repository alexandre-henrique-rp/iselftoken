import { useQuery } from "@tanstack/react-query";
import {
  adminUsersQueryOptions,
  type AdminUsersList,
  type AdminUsersQueryParams,
} from "~/lib/queries";

export type UseAdminUsersParams = AdminUsersQueryParams;

/**
 * Hook: useAdminUsersQuery
 *
 * Lista paginada de usuários para /admin/users.
 * staleTime 30s.
 */
export function useAdminUsersQuery(params: UseAdminUsersParams = {}) {
  return useQuery(adminUsersQueryOptions(params)) as ReturnType<
    typeof useQuery<AdminUsersList>
  >;
}
