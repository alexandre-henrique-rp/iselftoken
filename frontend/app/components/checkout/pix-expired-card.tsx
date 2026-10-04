/**
 * PixExpiredCard — Estado PIX expirado
 */

interface PixExpiredCardProps {
  onRegenerate?: () => void;
  onPayWithCard?: () => void;
}

export function PixExpiredCard({ onRegenerate, onPayWithCard }: PixExpiredCardProps) {
  return (
    <div
      className="flex flex-col gap-6 p-6 rounded-2xl bg-warning/10 border border-warning/30"
      role="alert"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-warning"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-on-surface">QR Code PIX expirado</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            O prazo para pagamento expirou. Gere um novo QR Code.
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-2">
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="btn-accent px-6 py-3 rounded-xl font-bold text-sm w-full"
          >
            Gerar novo QR Code
          </button>
        )}
        {onPayWithCard && (
          <button
            onClick={onPayWithCard}
            className="px-6 py-3 rounded-xl font-bold text-sm border border-outline text-on-surface hover:bg-surface-container transition-colors"
          >
            Pagar com cartão
          </button>
        )}
      </div>
    </div>
  );
}
