import { useQuery } from "@tanstack/react-query";
import { authStatusQueryOptions } from "~/lib/queries";

export function useAuthStatus() {
  const q = useQuery(authStatusQueryOptions);
  return {
    isAuthenticated: q.data?.isAuthenticated ?? false,
    isAuthorized: q.data?.isAuthorized ?? false,
    isLoading: q.isLoading,
    error: q.error,
  };
}
