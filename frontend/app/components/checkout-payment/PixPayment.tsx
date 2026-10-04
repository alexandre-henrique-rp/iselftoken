import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Loader2, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGeneratePixMutation } from "~/hooks/use-generate-pix-mutation";
import { paymentStatusQueryOptions } from "~/lib/queries";

interface PixCob {
  paymentId: number;
  txid: string;
  qrCodeBase64: string | null;
  copyPastePix: string | null;
  amount: number;
  expiresAt?: string;
  status: string;
}

interface PixPaymentProps {
  paymentId: number;
  initialCob?: PixCob | null;
  onStatusChange?: (status: string) => void;
  suppressCob?: boolean;
}

const TERMINAL_STATUSES = ["PAID", "CANCELED", "REFUNDED"];

/**
 * Normaliza o valor do QR Code para um `src` de <img> válido.
 * A EFI retorna `imagemQrcode` já como data URI completo
 * (`data:image/png;base64,...`); dados legados/mock podem vir como base64 puro.
 * Evita o bug de prefixo duplicado (`data:image/png;base64,data:image/...`).
 */
function toQrCodeSrc(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
}

export function PixPayment({
  paymentId,
  initialCob,
  onStatusChange,
  suppressCob = false,
}: PixPaymentProps) {
  const [cob, setCob] = useState<PixCob | null>(initialCob ?? null);
  const [copied, setCopied] = useState(false);
  const prevStatusRef = useRef<string | null>(cob?.status ?? null);

  const generateMutation = useGeneratePixMutation();

  useEffect(() => {
    setCob(initialCob ?? null);
    prevStatusRef.current = initialCob?.status ?? null;
  }, [initialCob?.txid, initialCob?.amount, initialCob?.status]);

  // Polling via TanStack Query usando paymentStatusQueryOptions (refetchInterval adaptativo).
  const { data: polledPayment } = useQuery({
    ...paymentStatusQueryOptions(paymentId),
    enabled: !!cob && !TERMINAL_STATUSES.includes(cob.status),
    refetchOnWindowFocus: true,
  });

  // Reage a mudanças de status vindas do polling
  useEffect(() => {
    if (!polledPayment?.status) return;
    if (polledPayment.status !== prevStatusRef.current) {
      prevStatusRef.current = polledPayment.status;
      setCob((prev) =>
        prev ? { ...prev, status: polledPayment.status } : prev,
      );
      onStatusChange?.(polledPayment.status);
    }
  }, [polledPayment, onStatusChange]);

  const generate = () => {
    if (generateMutation.isPending) return;
    generateMutation.mutate(
      { paymentId },
      { onSuccess: (data) => setCob(data) },
    );
  };

  const handleCopy = async () => {
    if (!cob?.copyPastePix) return;
    try {
      await navigator.clipboard.writeText(cob.copyPastePix);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  if (suppressCob) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/40 p-10 text-center space-y-4">
        <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
        <div>
          <h3 className="text-lg font-bold">Atualizando cobrança PIX</h3>
          <p className="text-sm text-muted-foreground">
            Cancelando o QR anterior e gerando uma nova cobrança com o desconto.
          </p>
        </div>
      </div>
    );
  }

  if (!cob) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center space-y-6">
        <QrCode className="w-12 h-12 mx-auto text-muted-foreground" />
        <div>
          <h3 className="text-lg font-bold mb-2">Pagar via PIX</h3>
          <p className="text-sm text-muted-foreground">
            Gere um QR Code com expiração de 24h. O plano é ativado
            automaticamente assim que recebermos a confirmação.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generateMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Gerando...
            </>
          ) : (
            "Gerar PIX"
          )}
        </button>
      </div>
    );
  }

  const amountFormatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cob.amount);

  return (
    <div className="rounded-2xl border-2 border-border p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Pague com PIX</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Valor:{" "}
            <span className="font-bold text-foreground">{amountFormatted}</span>
          </p>
        </div>
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          txid: {cob.txid.slice(0, 12)}…
        </span>
      </div>

      {cob.qrCodeBase64 ? (
        <div className="flex justify-center">
          <img
            src={toQrCodeSrc(cob.qrCodeBase64) ?? undefined}
            alt="QR Code PIX"
            className="w-64 h-64 rounded-xl bg-white p-4"
          />
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center">
          QR não disponível — use o código copia-e-cola abaixo.
        </div>
      )}

      {cob.copyPastePix && (
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Código copia-e-cola
          </label>
          <div className="flex gap-2">
            <code className="flex-1 px-4 py-3 rounded-xl bg-accent/30 text-xs font-mono break-all">
              {cob.copyPastePix}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 rounded-xl border-2 border-border hover:bg-accent/30"
              aria-label="Copiar código PIX"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Aguardando confirmação… esta página atualiza automaticamente.
      </p>
    </div>
  );
}
