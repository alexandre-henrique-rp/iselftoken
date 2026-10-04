/**
 * ErrorCard — Estado de erro do checkout
 *
 * Catálogo EFI com 3 variantes de severidade:
 * - critical (vermelho)
 * - retryable (warning + botão tentar novamente)
 * - default (info)
 */

import type { EfIErrorCode } from "~/lib/api/efi";
import { EFI_ERRORS_CATALOG } from "~/lib/api/efi";

interface ErrorCardProps {
  code?: EfIErrorCode;
  customMessage?: string;
  onRetry?: () => void;
  onFallbackPix?: () => void;
}

export function ErrorCard({ code, customMessage, onRetry, onFallbackPix }: ErrorCardProps) {
  const error = code ? EFI_ERRORS_CATALOG[code] : null;

  const title = error?.message || customMessage || "Erro ao processar pagamento";
  const variant = error?.variant || "default";
  const canRetry = error?.canRetry ?? false;

  const variantStyles = {
    critical: {
      container: "bg-danger/10 border-danger/30",
      icon: "text-danger",
      bg: "bg-danger/15",
    },
    retryable: {
      container: "bg-warning/10 border-warning/30",
      icon: "text-warning",
      bg: "bg-warning/15",
    },
    default: {
      container: "bg-surface-container border-outline/30",
      icon: "text-on-surface-variant",
      bg: "bg-surface-container-high",
    },
  };

  const styles = variantStyles[variant];

  const Icon = () => (
    <svg
      className={`w-8 h-8 ${styles.icon}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {variant === "critical" ? (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      ) : variant === "retryable" ? (
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
      ) : (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v4z" />
      )}
    </svg>
  );

  return (
    <div
      className={`flex flex-col gap-4 p-6 rounded-2xl ${styles.container}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${styles.bg}`}>
          <Icon />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-on-surface">
            {variant === "critical"
              ? "Erro crítico"
              : variant === "retryable"
                ? "Ops! Algo deu errado"
                : "Atenção"}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">{title}</p>
        </div>
      </div>

      {/* Código EFI (mono) */}
      {code && (
        <div className="bg-surface-dim rounded-lg p-3">
          <code className="text-xs font-mono text-on-surface-dim">
            Código EFI: {code}
          </code>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-col gap-2">
        {canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="btn-accent px-6 py-3 rounded-xl font-bold text-sm w-full"
          >
            Tentar novamente
          </button>
        )}

        {canRetry && onFallbackPix && (
          <button
            onClick={onFallbackPix}
            className="px-6 py-3 rounded-xl font-bold text-sm border border-outline text-on-surface hover:bg-surface-container transition-colors"
          >
            Pagar com PIX
          </button>
        )}

        {!canRetry && (
          <p className="text-xs text-on-surface-dim text-center">
            Entre em contato com o suporte se o problema persistir.
          </p>
        )}
      </div>
    </div>
  );
}
