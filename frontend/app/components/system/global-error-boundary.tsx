/**
 * S6-T02 — GlobalErrorBoundary
 *
 * Captura excecoes de qualquer sub-componente (aba da edicao de startup
 * ou pagina publica) e mostra fallback UI SEM quebrar:
 *   - menu lateral (links + logout)
 *   - action bar global
 *   - sub-rotas irmaos
 *
 * Hook Sentry para captura automatica (so dispara se window.Sentry estiver
 * disponivel; nao quebra SSR nem testes).
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

type State = { hasError: boolean; message?: string };

export class GlobalErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const sentry = (globalThis as any).Sentry;
    if (sentry?.captureException) {
      sentry.captureException(error, { extra: info });
    } else if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[GlobalErrorBoundary]", error, info);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 text-amber-100"
          >
            <p className="text-sm font-bold">Algo deu errado nesta secao.</p>
            <p className="mt-1 text-xs text-amber-100/70">
              {this.state.message ?? "Tente recarregar a pagina."}
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}