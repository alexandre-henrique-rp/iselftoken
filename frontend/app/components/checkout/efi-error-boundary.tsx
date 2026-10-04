/**
 * EfiErrorBoundary — Captura erros não tratados do SDK EFI
 *
 * Mostra toast critical + log Sentry
 */

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class EfiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log para Sentry (se configurado)
    if (typeof window !== "undefined") {
      const win = window as unknown as { Sentry?: { captureException: (err: Error, ctx: unknown) => void } };
      if (win.Sentry) {
        win.Sentry.captureException(error, {
          extra: errorInfo,
        });
      }
    }

    // Log console em dev
    console.error("[EfiErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div
          className="p-4 rounded-xl bg-danger/10 border border-danger/30"
          role="alert"
        >
          <p className="text-sm font-medium text-danger">
            Erro no módulo de pagamento seguro.
          </p>
          <p className="text-xs text-on-surface-dim mt-1">
            Tente recarregar a página ou use PIX como alternativa.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
