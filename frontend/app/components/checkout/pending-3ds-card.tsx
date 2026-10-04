/**
 * Pending3DSCard — Estado intermediário de autenticação 3DS
 *
 * Countdown 30s + link para authenticationUrl
 */

import { useState, useEffect } from "react";

interface Pending3DSCardProps {
  authenticationUrl: string;
  onTimeout?: () => void;
  onContinueManually?: () => void;
}

const COUNTDOWN_SECONDS = 30;

export function Pending3DSCard({
  authenticationUrl,
  onTimeout,
  onContinueManually,
}: Pending3DSCardProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeout]);

  return (
    <div
      className="flex flex-col gap-6 p-6 rounded-2xl bg-surface-container border border-outline/30"
      role="alertdialog"
      aria-labelledby="pending3ds-title"
      aria-describedby="pending3ds-desc"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center animate-pulse">
          <svg
            className="w-8 h-8 text-warning"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
          </svg>
        </div>
        <div>
          <h3 id="pending3ds-title" className="text-xl font-bold text-on-surface">
            Autenticação em andamento
          </h3>
          <p id="pending3ds-desc" className="text-sm text-on-surface-variant mt-1">
            Confirme a autenticação no app do seu banco e retorne para esta tela.
          </p>
        </div>
      </div>

      {/* Countdown */}
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-4xl font-bold text-warning tabular-nums">
          {countdown}s
        </span>
        <p className="text-xs text-on-surface-dim">
          Aguarde ou autentique-se agora
        </p>
      </div>

      {/* Countdown bar */}
      <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
        <div
          className="h-full bg-warning transition-all duration-1000 ease-linear"
          style={{ width: `${(countdown / COUNTDOWN_SECONDS) * 100}%` }}
          role="progressbar"
          aria-valuenow={countdown}
          aria-valuemin={0}
          aria-valuemax={COUNTDOWN_SECONDS}
        />
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-2">
        <a
          href={authenticationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent px-6 py-3 rounded-xl font-bold text-sm w-full text-center block"
          aria-label="Autenticar agora no banco (abre nova aba)"
        >
          Continuar autenticação
          <svg
            className="inline w-4 h-4 ml-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        {onContinueManually && (
          <button
            onClick={onContinueManually}
            className="px-6 py-3 rounded-xl font-bold text-sm border border-outline text-on-surface hover:bg-surface-container transition-colors"
          >
            Já autenticado — continuar
          </button>
        )}
      </div>

      {/* Info */}
      <p className="text-xs text-on-surface-dim text-center">
        Você será redirecionado para o ambiente seguro do seu banco.
      </p>
    </div>
  );
}
