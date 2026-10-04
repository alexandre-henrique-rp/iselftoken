/** Mutation para ativar ou desativar cupom na Central de Cupons. */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Coupon } from "~/lib/api/coupons";
import { couponQueryKeys } from "~/lib/queries";

async function toggleCouponStatusMutation(
  id: number,
  active: boolean,
): Promise<Coupon> {
  const res = await fetch(`/api/admin/coupons/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });

  const response = await res.json().catch(() => null);
  if (!res.ok || response?.error) {
    throw new Error(response?.message || "Erro ao atualizar cupom");
  }
  return response.data ?? response;
}

export function useToggleCouponStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      toggleCouponStatusMutation(id, active),
    onSuccess: (data) => {
      const action = data.active ? "ativado" : "desativado";
      toast.success(`Cupom ${data.code} ${action}!`, { richColors: true });
      queryClient.invalidateQueries({ queryKey: couponQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: couponQueryKeys.available });
      if (data.id) {
        queryClient.invalidateQueries({
          queryKey: couponQueryKeys.audit(data.id),
        });
        queryClient.invalidateQueries({
          queryKey: couponQueryKeys.usages(data.id),
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao atualizar cupom", {
        richColors: true,
      });
    },
  });
}
