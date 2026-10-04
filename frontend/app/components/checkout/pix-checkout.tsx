/**
 * PixCheckout — Componente QR Code PIX com countdown
 *
 * Estados: loading, pending, paid, expired
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { EfICheckoutSession } from "~/lib/api/efi";

interface PixCheckoutProps {
  checkoutData: EfICheckoutSession;
  onExpire?: () => void;
  onPaid?: () => void;
}

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculate = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      return diff;
    };

    setTimeLeft(calculate());

    const interval = setInterval(() => {
      const remaining = calculate();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeLeft;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function PixCheckout({ checkoutData, onExpire, onPaid }: PixCheckoutProps) {
  const [copied, setCopied] = useState(false);
  const timeLeft = useCountdown(checkoutData.expiresAt);

  useEffect(() => {
    if (timeLeft === 0) {
      onExpire?.();
    }
  }, [timeLeft, onExpire]);

  useEffect(() => {
    if (checkoutData.status === "PAID") {
      onPaid?.();
    }
  }, [checkoutData.status, onPaid]);

  const handleCopy = useCallback(async () => {
    if (!checkoutData.copyPastePix) return;
    try {
      await navigator.clipboard.writeText(checkoutData.copyPastePix);
      setCopied(true);
      toast.success("Código PIX copiado!", { richColors: true });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Falha ao copiar código", { richColors: true });
    }
  }, [checkoutData.copyPastePix]);

  const isExpired = timeLeft === 0;
  const isPaid = checkoutData.status === "PAID";

  return (
    <div className="flex flex-col gap-6" role="region" aria-label="Pagamento PIX">
      {/* Timer */}
      <div
        className="flex items-center justify-between"
        role="timer"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              isExpired || isPaid
                ? "text-on-surface-dim"
                : "text-warning"
            }`}
          >
            {isExpired
              ? "QR Code expirado"
              : isPaid
                ? "Pagamento confirmado"
                : "Tempo restante"}
          </span>
        </div>
        {!isExpired && !isPaid && (
          <span className="font-mono text-xl font-bold text-warning tabular-nums">
            {formatTime(timeLeft)}
          </span>
        )}
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        {checkoutData.qrCodeBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${checkoutData.qrCodeBase64}`}
            alt="QR Code PIX para pagamento"
            className="w-56 h-56 rounded-xl"
            width={224}
            height={224}
          />
        ) : (
          <div
            className="w-56 h-56 rounded-xl bg-surface-container flex items-center justify-center"
            aria-label="Carregando QR Code..."
          >
            <div className="w-48 h-48 skeleton rounded" />
          </div>
        )}
      </div>

      {/* Copia e cola */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="pix-copy"
          className="ds-form-label"
        >
          Código PIX (copia e cola)
        </label>
        <div className="flex gap-2">
          <textarea
            id="pix-copy"
            readOnly
            value={checkoutData.copyPastePix}
            className="flex-1 px-4 py-3 rounded-xl bg-surface-container text-on-surface text-sm font-mono resize-none h-20"
            aria-label="Código PIX para pagamento"
          />
          <button
            onClick={handleCopy}
            disabled={copied}
            className="btn-accent px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            aria-label={copied ? "Código copiado" : "Copiar código PIX"}
          >
            {copied ? (
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Instruções */}
      <ol className="flex flex-col gap-2 text-sm text-on-surface-variant" aria-label="Como pagar">
        <li className="flex gap-2">
          <span className="font-bold text-primary">1.</span>
          <span>Abra o app do seu banco</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">2.</span>
          <span>Escaneie o QR Code ou cole o código</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary">3.</span>
          <span>Confirme o pagamento de R$ {checkoutData.amount.toFixed(2)}</span>
        </li>
      </ol>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isPaid
              ? "pill-active"
              : isExpired
                ? "pill-expired"
                : "pill-pending"
          }`}
        >
          {isPaid ? (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Pago
            </>
          ) : isExpired ? (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
              Expirado
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" aria-hidden="true" />
              Aguardando pagamento
            </>
          )}
        </span>
      </div>
    </div>
  );
}
