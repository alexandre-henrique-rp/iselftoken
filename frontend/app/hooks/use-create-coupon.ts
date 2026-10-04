/** Mutation para criar cupom na Central de Cupons. */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Coupon, CreateCouponInput } from "~/lib/api/coupons";
import { couponQueryKeys } from "~/lib/queries";

async function createCouponMutation(input: CreateCouponInput): Promise<Coupon> {
  const res = await fetch("/api/admin/coupons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const response = await res.json().catch(() => null);
  if (!res.ok || response?.error) {
    throw new Error(response?.message || "Erro ao criar cupom");
  }
  return response.data ?? response;
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCouponMutation,
    onSuccess: (data) => {
      toast.success(`Cupom ${data.code} criado com sucesso!`, {
        richColors: true,
      });
      queryClient.invalidateQueries({ queryKey: couponQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: couponQueryKeys.available });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao criar cupom", { richColors: true });
    },
  });
}
