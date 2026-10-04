/** Query do histórico de aplicações de um cupom. */

import { useQuery } from "@tanstack/react-query";
import type { CouponUsage, CouponUsageHistory } from "~/lib/api/coupons";
import { couponQueryKeys } from "~/lib/queries";

interface UsageEnvelope {
  data?: {
    data?: CouponUsage[];
    total?: number;
    historicalTotal?: number;
    confirmedCount?: number;
    reservedCount?: number;
    availableCount?: number | null;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export function couponUsagesQueryOptions(couponId: number) {
  return {
    queryKey: couponQueryKeys.usages(couponId),
    queryFn: async (): Promise<CouponUsageHistory> => {
      const response = await fetch(`/api/admin/coupons/${couponId}/usages`);
      const payload = (await response
        .json()
        .catch(() => null)) as UsageEnvelope | null;
      if (!response.ok || !payload?.data) {
        throw new Error("Não foi possível carregar o histórico de uso.");
      }

      const data = payload.data.data ?? [];
      const total = payload.data.total ?? data.length;
      const limit = payload.data.limit ?? 20;
      return {
        data,
        total,
        historicalTotal: payload.data.historicalTotal ?? total,
        confirmedCount: payload.data.confirmedCount ?? 0,
        reservedCount: payload.data.reservedCount ?? 0,
        availableCount: payload.data.availableCount ?? null,
        page: payload.data.page ?? 1,
        limit,
        totalPages:
          payload.data.totalPages ?? Math.max(1, Math.ceil(total / limit)),
      };
    },
    staleTime: 30_000,
  };
}

export function useCouponUsages(couponId: number, enabled = true) {
  return useQuery({
    ...couponUsagesQueryOptions(couponId),
    enabled,
    refetchInterval: enabled ? 15_000 : false,
  });
}
