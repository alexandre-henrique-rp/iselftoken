import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface PixCob {
  paymentId: number;
  txid: string;
  qrCodeBase64: string | null;
  copyPastePix: string | null;
  amount: number;
  expiresAt?: string;
  status: string;
}

/**
 * Mutation para gerar cobranca PIX.
 *
 * POST /api/payment/:paymentId/pix
 *
 * Retorna os dados da cobranca (QR Code, copia-e-cola, txid).
 */
export function useGeneratePixMutation() {
  return useMutation<PixCob, Error, { paymentId: number }>({
    mutationFn: async ({ paymentId }) => {
      const res = await fetch(`/api/payment/${paymentId}/pix`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({ error: true }));
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? "Nao foi possivel gerar o PIX.");
      }
      return (body?.data ?? body) as PixCob;
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao gerar PIX. Tente novamente.");
    },
  });
}
