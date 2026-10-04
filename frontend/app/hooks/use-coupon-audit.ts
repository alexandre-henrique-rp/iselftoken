/** Query da trilha de auditoria administrativa de um cupom. */

import { useQuery } from "@tanstack/react-query";
import type { CouponAuditEntry, PaginatedResponse } from "~/lib/api/coupons";
import { couponQueryKeys } from "~/lib/queries";

interface AuditEnvelope {
  data?: {
    data?: CouponAuditEntry[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export function couponAuditQueryOptions(couponId: number) {
  return {
    queryKey: couponQueryKeys.audit(couponId),
    queryFn: async (): Promise<PaginatedResponse<CouponAuditEntry>> => {
      const response = await fetch(`/api/admin/coupons/${couponId}/audit`);
      const payload = (await response
        .json()
        .catch(() => null)) as AuditEnvelope | null;
      if (!response.ok || !payload?.data) {
        throw new Error("Não foi possível carregar a auditoria do cupom.");
      }

      const data = payload.data.data ?? [];
      const total = payload.data.total ?? data.length;
      const limit = payload.data.limit ?? 20;
      return {
        data,
        total,
        page: payload.data.page ?? 1,
        limit,
        totalPages:
          payload.data.totalPages ?? Math.max(1, Math.ceil(total / limit)),
      };
    },
    staleTime: 30_000,
  };
}

export function useCouponAudit(couponId: number, enabled = true) {
  return useQuery({
    ...couponAuditQueryOptions(couponId),
    enabled,
    refetchInterval: enabled ? 15_000 : false,
  });
}
