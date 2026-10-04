/**
 * Hook: useStartupIdentityQuery(startupId)
 *
 * Carrega dados de identidade da startup (CNPJ, razaoSocial, nome fantasia, etc).
 * Endpoint: GET /api/startups/:id (BFF `startups.$id.ts`).
 *
 * STATE-02D — alimenta o componente `corporate-identity.tsx` no modo edição.
 */
import { useQuery } from "@tanstack/react-query";
import {
  startupIdentityQueryOptions,
  type StartupIdentity,
} from "~/lib/queries";

export function useStartupIdentityQuery(startupId: number | null) {
  return useQuery<StartupIdentity | null>(
    startupIdentityQueryOptions(startupId),
  );
}