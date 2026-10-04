/**
 * useApplyCoupon — Aplica cupom a um pagamento pendente
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApplyCouponInput, ApplyCouponResult } from "~/lib/api/coupons";
import { COUPON_ERRORS_CATALOG, type CouponErrorCode } from "~/lib/api/coupons";
import { couponQueryKeys, queryKeys } from "~/lib/queries";

type ApplyCouponMutationError = {
  code?: unknown;
  detalhe?: unknown;
  message?: unknown;
};

function getCouponErrorCode(
  error: ApplyCouponMutationError,
): CouponErrorCode | undefined {
  const nestedCode =
    typeof error.detalhe === "object" &&
    error.detalhe !== null &&
    "code" in error.detalhe
      ? (error.detalhe as { code?: unknown }).code
      : undefined;
  const candidate = typeof error.code === "string" ? error.code : nestedCode;

  return typeof candidate === "string" && candidate in COUPON_ERRORS_CATALOG
    ? (candidate as CouponErrorCode)
    : undefined;
}

async function applyCouponMutation(
  input: ApplyCouponInput,
): Promise<ApplyCouponResult> {
  const res = await fetch("/api/payment/apply-coupon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const response = await res.json().catch(() => ({ code: "cupom_inativo" }));
  if (!res.ok || response?.error) {
    throw response;
  }

  const usage = response?.data;
  return {
    success: true,
    discountAmount: Number(usage?.discountApplied ?? 0),
    newTotal: Number(usage?.finalAmount ?? 0),
    coupon: { code: input.couponCode, percent: usage?.percent ?? undefined },
    completion:
      usage?.completion?.type === "COUPON_100"
        ? {
            type: "COUPON_100",
            effectsPending: Boolean(usage.completion.effectsPending),
          }
        : undefined,
    payment: usage?.payment
      ? {
          id: Number(usage.payment.id),
          amount: Number(usage.payment.amount),
          status: usage.payment.status,
          paidAt: usage.payment.paidAt ?? null,
        }
      : undefined,
  };
}

export function useApplyCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyCouponMutation,
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(
          `Cupom ${data.coupon?.code} aplicado! Desconto de R$ ${data.discountAmount?.toFixed(2)}`,
          { richColors: true },
        );
        // Mantém as telas do checkout e da confirmação sincronizadas com o
        // pagamento canônico retornado pelo backend.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.payments.detail(variables.paymentId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.payments.status(variables.paymentId),
        });
        // O cupom altera o principal líquido → a simulação de parcelamento
        // precisa ser refeita. A query é keyada por paymentId+amount; aqui
        // invalidamos todas as variações daquele paymentId por segurança.
        void queryClient.invalidateQueries({
          queryKey: ["payment-installments", variables.paymentId],
        });
        void queryClient.invalidateQueries({
          queryKey: couponQueryKeys.available,
        });
      }
    },
    onError: (err: ApplyCouponMutationError) => {
      const code = getCouponErrorCode(err);
      const couponError = code ? COUPON_ERRORS_CATALOG[code] : undefined;
      const message =
        couponError?.message ??
        (typeof err.message === "string"
          ? err.message
          : "Não foi possível aplicar o cupom. Tente novamente.");
      toast.error(message, { richColors: true });
    },
  });
}
