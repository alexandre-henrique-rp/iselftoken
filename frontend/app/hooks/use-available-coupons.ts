/** Query de cupons ativos disponíveis para o usuário. */

import { queryOptions, useQuery } from "@tanstack/react-query";
import type { AvailableCoupon, HeroCoupon } from "~/lib/api/coupons";
import { couponQueryKeys } from "~/lib/queries";

interface CouponsEnvelope {
  data?: Array<
    Omit<AvailableCoupon, "isExhausted" | "isExpired"> & {
      maxUses?: number | null;
      usedCount?: number;
      confirmedCount?: number;
      reservedCount?: number;
    }
  >;
}

export function availableCouponsQueryOptions() {
  return queryOptions({
    queryKey: couponQueryKeys.available,
    queryFn: async (): Promise<{
      coupons: AvailableCoupon[];
      hero: HeroCoupon | null;
    }> => {
      const res = await fetch("/api/coupons/available");
      if (!res.ok) throw new Error("Falha ao carregar cupons");

      const envelope: CouponsEnvelope = await res.json();
      const coupons = (envelope.data ?? []).map((coupon) => {
        const confirmedCount = coupon.confirmedCount ?? coupon.usedCount ?? 0;
        const reservedCount = coupon.reservedCount ?? 0;
        return {
          id: coupon.id,
          code: coupon.code,
          percent: coupon.percent,
          validUntil: coupon.validUntil,
          isExhausted:
            (coupon.maxUses ?? null) !== null &&
            confirmedCount + reservedCount >= (coupon.maxUses ?? 0),
          isExpired: false,
        };
      });

      return { coupons, hero: coupons[0] ?? null };
    },
  });
}

export function useAvailableCoupons() {
  return useQuery(availableCouponsQueryOptions());
}
