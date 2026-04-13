import { Copy, Loader2, QrCode } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CheckoutCard } from "./checkout-card";

type PixPaymentProps = {
  pixCode: string;
  expiresIn: string;
  statusLabel: string;
  isProcessing: boolean;
  onCopy: () => void;
  onConfirm: () => void;
};

/**
 * @name PixPayment
 * @description Exibe o QR Code e código PIX com status.
 *
 * @param {PixPaymentProps} props - Propriedades do componente.
 * @returns {JSX.Element} Bloco de pagamento PIX.
 */
export function PixPayment({
  pixCode,
  expiresIn,
  statusLabel,
  isProcessing,
  onCopy,
  onConfirm,
}: PixPaymentProps) {
  return (
    <CheckoutCard className="text-center py-10">
      <h3 className="mb-2 text-lg font-bold text-stone-50">Pagamento via PIX</h3>
      <p className="mb-8 text-sm text-stone-400">
        Escaneie o código abaixo ou copie a chave para pagar.
      </p>

      <div className="mx-auto mb-8 flex h-64 w-64 items-center justify-center rounded-xl bg-white p-4">
        <QrCode className="h-32 w-32 text-stone-800" />
      </div>

      <div className="mx-auto mb-6 max-w-md">
        <div className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-950 p-3">
          <code className="flex-1 truncate text-xs text-stone-300">
            {pixCode}
          </code>
          <button
            type="button"
            onClick={onCopy}
            className="p-1 text-blue-400 transition-colors hover:text-blue-300"
          >
            <Copy className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mb-8 text-xs text-stone-500">
        Expira em: <span className="text-stone-200">{expiresIn}</span>
      </div>

      <div className="mb-8 text-sm text-yellow-400">Status: {statusLabel}</div>

      <Button
        type="button"
        variant="secondary"
        className="w-full max-w-xs"
        onClick={onConfirm}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
          </span>
        ) : (
          "Já realizei o pagamento"
        )}
      </Button>
    </CheckoutCard>
  );
}
