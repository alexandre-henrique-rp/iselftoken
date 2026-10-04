/**
 * ToastProvider — Sonner customizado com 3 severidades
 *
 * - critical: vermelho, dismissible=false
 * - retryable: warning + botão tentar novamente
 * - default: info
 *
 * aria-live="polite", role="status", aria-atomic="true"
 * Fechamento automático após 5s (exceto critical)
 */

import { toast as sonnerToast, Toaster } from "sonner";
import type { ReactNode } from "react";

type ToastVariant = "default" | "retryable" | "critical";

interface ToastOptions {
  variant?: ToastVariant;
  retryAction?: () => void;
  duration?: number;
}

/**
 * showToast — função para exibir toasts customizados
 */
export function showToast(
  message: string,
  options: ToastOptions = {}
): string | number {
  const {
    variant = "default",
    retryAction,
    duration,
  } = options;

  switch (variant) {
    case "critical":
      return sonnerToast.error(message, {
        richColors: true,
        dismissible: false,
        duration: Infinity, // Critical só fecha via ação do usuário
        className: "bg-danger/15 border border-danger/30 text-on-surface",
      });

    case "retryable":
      return sonnerToast(message, {
        richColors: true,
        duration: duration ?? 5000,
        className: "bg-warning/15 border border-warning/30 text-on-surface",
        action: retryAction
          ? {
              label: "Tentar novamente",
              onClick: retryAction,
            }
          : undefined,
      });

    case "default":
    default:
      return sonnerToast(message, {
        richColors: true,
        duration: duration ?? 5000,
        className: "bg-surface-container border border-outline/30 text-on-surface",
      });
  }
}

/**
 * ToastContainer — wrapper para o Toaster com estilo Kinetic
 */
export function ToastContainer() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      richColors
      expand={false}
      visibleToasts={5}
      toastOptions={{
        classNames: {
          toast: "glass-strong rounded-xl border border-outline/20",
          title: "text-on-surface font-semibold",
          description: "text-on-surface-variant text-sm",
          actionButton:
            "bg-primary text-on-primary-fixed font-bold rounded-lg px-3 py-1.5 text-sm",
          cancelButton:
            "bg-surface-container text-on-surface-variant rounded-lg px-3 py-1.5 text-sm",
          error:
            "bg-danger/15 border-danger/30 text-on-surface",
          success:
            "bg-success/15 border-success/30 text-on-surface",
          warning:
            "bg-warning/15 border-warning/30 text-on-surface",
          info:
            "bg-surface-container border-outline/30 text-on-surface",
        },
      }}
      closeButton
    />
  );
}
