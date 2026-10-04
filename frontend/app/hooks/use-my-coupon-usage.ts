/** Query do histórico pessoal de uso de cupons. */

import { queryOptions, useQuery } from "@tanstack/react-query";
import type { MyCouponUsage, PaginatedResponse } from "~/lib/api/coupons";
import { couponQueryKeys } from "~/lib/queries";

interface UsageEnvelope {
  data?: {
    usages?: MyCouponUsage[];
    total?: number;
    limit?: number;
    offset?: number;
  };
}

export function myCouponUsageQueryOptions(page = 1) {
  return queryOptions({
    queryKey: couponQueryKeys.myUsage(page),
    queryFn: async (): Promise<PaginatedResponse<MyCouponUsage>> => {
      const res = await fetch(`/api/user/coupons/usage?page=${page}`);
      if (!res.ok) throw new Error("Falha ao carregar histórico");

      const response: UsageEnvelope = await res.json();
      const payload = response.data ?? {};
      const data = payload.usages ?? [];
      const limit = payload.limit ?? 20;
      const total = payload.total ?? data.length;
      return {
        data,
        total,
        page:
          payload.offset === undefined
            ? page
            : Math.floor(payload.offset / limit) + 1,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    },
  });
}

export function useMyCouponUsage(page = 1) {
  return useQuery(myCouponUsageQueryOptions(page));
}
