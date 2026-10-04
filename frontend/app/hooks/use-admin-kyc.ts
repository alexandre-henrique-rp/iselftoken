import { useQuery } from "@tanstack/react-query";
import {
  adminKycQueueQueryOptions,
  type AdminKycList,
} from "~/lib/queries";

export interface UseAdminKycParams {
  page?: number;
  search?: string;
  kycStatus?: string;
}

/**
 * Hook: useAdminKycQueueQuery
 *
 * Lista paginada de perfis KYC para a fila /admin/kyc.
 * staleTime 30s; desabilita busca com <3 chars.
 */
export function useAdminKycQueueQuery(params: UseAdminKycParams = {}) {
  return useQuery(adminKycQueueQueryOptions(params)) as ReturnType<
    typeof useQuery<AdminKycList>
  >;
}
