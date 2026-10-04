/**
 * Hook: useTokenReserveMutation
 *
 * Inicia checkout de reserva de tokens para uma campanha de captação.
 * Endpoint: POST /api/payment/startup-checkout (BFF `payment.startup-checkout.ts`).
 *
 * Retorna um token opaco que o caller usa pra abrir `/payment/checkout/:token`.
 *
 * STATE-02D — extraido de `token-reservation.tsx`.
 */
import { useMutation } from "@tanstack/react-query";

export interface TokenReserveInput {
  campaignId: number;
  startupName: string;
  adjustedTargetAmount: number;
  estimatedTokenCount: number;
  tokenPrice: number;
  tokenReservationFee: number;
  fastTrackFee: number;
  wantsFastTrackReview: boolean;
  equityPercent: number;
  equityAmount: number;
  campaignDurationDays: number;
}

export interface TokenReserveResult {
  token: string;
  [key: string]: unknown;
}

export function useTokenReserveMutation() {
  return useMutation<TokenReserveResult, Error, TokenReserveInput>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/payment/startup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? `Não foi possível iniciar o checkout (${res.status})`,
        );
      }
      if (!body?.token) {
        throw new Error(
          `Resposta sem token de checkout — entre em contato com o suporte`,
        );
      }
      return body as TokenReserveResult;
    },
  });
}