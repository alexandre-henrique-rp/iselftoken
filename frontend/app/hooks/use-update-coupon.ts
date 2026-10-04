/** Mutation para atualizar dados de um cupom existente. */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Coupon } from "~/lib/api/coupons";
import { couponQueryKeys } from "~/lib/queries";

export interface UpdateCouponInput {
  id: number;
  code?: string;
  percent?: number;
  maxUses?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  description?: string | null;
}

async function updateCoupon(input: UpdateCouponInput): Promise<Coupon> {
  const { id, ...body } = input;
  const res = await fetch(`/api/admin/coupons/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await res.json().catch(() => null);
  if (!res.ok || response?.error) {
    throw new Error(response?.message || "Erro ao atualizar cupom");
  }
  return response.data ?? response;
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCoupon,
    onSuccess: (coupon) => {
      toast.success(`Cupom ${coupon.code} atualizado!`, { richColors: true });
      queryClient.invalidateQueries({ queryKey: couponQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: couponQueryKeys.available });
      queryClient.invalidateQueries({
        queryKey: couponQueryKeys.audit(coupon.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar cupom", {
        richColors: true,
      });
    },
  });
}
