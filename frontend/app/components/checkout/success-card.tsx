/**
 * SuccessCard — Recibo do pagamento confirmado
 */

import type { EfIPaymentStatus } from "~/lib/api/efi";

interface SuccessCardProps {
  paymentStatus: EfIPaymentStatus;
  onDownloadReceipt?: () => void;
  onViewOrder?: () => void;
}

export function SuccessCard({ paymentStatus, onDownloadReceipt, onViewOrder }: SuccessCardProps) {
  const { paymentId, txid, endToEndId, paidAt, amount } = paymentStatus;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="flex flex-col gap-6 p-6 rounded-2xl bg-success/10 border border-success/30"
      role="region"
      aria-label="Pagamento confirmado"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-success"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-on-surface">Pagamento confirmado!</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Sua transação foi processada com sucesso.
          </p>
        </div>
      </div>

      {/* Recibo */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-on-surface-dim uppercase tracking-wider">Payment ID</dt>
          <dd className="font-mono text-xs text-on-surface break-all">{paymentId}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-dim uppercase tracking-wider">txid</dt>
          <dd className="font-mono text-xs text-on-surface break-all">{txid || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-dim uppercase tracking-wider">EndToEndId</dt>
          <dd className="font-mono text-xs text-on-surface break-all">{endToEndId || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-dim uppercase tracking-wider">Pago em</dt>
          <dd className="font-mono text-xs text-on-surface">{formatDate(paidAt)}</dd>
        </div>
        <div className="col-span-2 border-t border-outline/20 pt-3 mt-1">
          <dt className="text-xs text-on-surface-dim uppercase tracking-wider">Valor pago</dt>
          <dd className="text-2xl font-bold text-success">
            R$ {amount.toFixed(2)}
          </dd>
        </div>
      </dl>

      {/* Ações */}
      <div className="flex flex-col gap-2">
        {onDownloadReceipt && (
          <button
            onClick={onDownloadReceipt}
            className="btn-accent px-6 py-3 rounded-xl font-bold text-sm w-full"
          >
            Baixar recibo (PDF)
          </button>
        )}
        {onViewOrder && (
          <button
            onClick={onViewOrder}
            className="px-6 py-3 rounded-xl font-bold text-sm border border-outline text-on-surface hover:bg-surface-container transition-colors"
          >
            Ver pedido
          </button>
        )}
      </div>
    </div>
  );
}
