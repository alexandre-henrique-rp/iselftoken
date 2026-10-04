import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "~/lib/queries";
import { useAuthStatus } from "./use-auth-status";

export function useUser() {
  const status = useAuthStatus();
  const q = useQuery({
    ...meQueryOptions,
    enabled: status.isAuthenticated && status.isAuthorized,
  });

  return {
    user: q.data ?? null,
    isAuthenticated: status.isAuthenticated,
    isAuthorized: status.isAuthorized,
    isLoading: status.isLoading || (status.isAuthorized && q.isLoading),
    error: status.error ?? q.error,
  };
}
