import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { queryKeys } from "~/lib/queries";
import { useToast } from "~/context/ToastContext";

/**
 * Hook: solicita a Taxa de Compliance para a campanha do founder.
 *
 * Backend: POST /payment/compliance-fee (idempotente — retorna Payment
 * PENDING existente se já houver um em aberto). Após sucesso, redireciona
 * para /checkout/payment/:id (mesmo fluxo do save da aba de captação).
 */
export function useRequestComplianceFee() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<
    { id: number | string },
    Error,
    { campaignId: number; wantsFastDeploy?: boolean }
  >({
    mutationFn: async ({ campaignId, wantsFastDeploy }) => {
      const res = await fetch("/api/founder/compliance-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ campaignId, wantsFastDeploy: !!wantsFastDeploy }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        throw new Error(
          data?.message ?? `Falha ao solicitar taxa de compliance (${res.status})`,
        );
      }
      const payment = data?.data ?? data;
      if (!payment?.id) {
        throw new Error("Backend não retornou o payment criado.");
      }
      return payment as { id: number | string };
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.founder.paymentsAll });
      toast.showToast("Taxa de compliance criada! Redirecionando para checkout…", "success");
      navigate(`/checkout/payment/${payment.id}`);
    },
    onError: (err) => {
      toast.showToast(err.message, "error");
    },
  });
}

/**
 * Hook: solicita a Prorrogação da Reserva (TOKEN_RESERVATION_EXTENSION).
 *
 * Backend: POST /startup/:id/prorrogacao (cria CampaignExtension + Payment
 * TOKEN_RESERVATION_EXTENSION PENDING). Redireciona para checkout.
 *
 * @param startupId ID da startup que terá a captação prorrogada.
 */
export function useRequestExtension() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<
    { id: number | string },
    Error,
    { startupId: number; additionalAmount: number; periodDays?: number }
  >({
    mutationFn: async ({ startupId, additionalAmount, periodDays }) => {
      const res = await fetch(
        `/api/founder/startups/${startupId}/prorrogacao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            additionalAmount,
            periodDays: periodDays ?? 30,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        throw new Error(
          data?.message ?? `Falha ao solicitar prorrogação (${res.status})`,
        );
      }
      const payment = data?.data ?? data;
      if (!payment?.id) {
        throw new Error("Backend não retornou o payment criado.");
      }
      return payment as { id: number | string };
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.founder.paymentsAll });
      toast.showToast(
        "Prorrogação criada! Pague a reserva adicional para reativar a captação.",
        "success",
      );
      navigate(`/checkout/payment/${payment.id}`);
    },
    onError: (err) => {
      toast.showToast(err.message, "error");
    },
  });
}