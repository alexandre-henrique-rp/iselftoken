import { AlertTriangle, Loader2, ShieldOff, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Form } from "react-router";

interface AdminKycRevokeDialogProps {
  documentLabel: string;
  kycProfileId: number;
  submitting: boolean;
  onClose: () => void;
}

export function AdminKycRevokeDialog({
  documentLabel,
  kycProfileId,
  submitting,
  onClose,
}: AdminKycRevokeDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previousActiveElement =
      window.document.activeElement instanceof HTMLElement
        ? window.document.activeElement
        : null;
    const previousBodyOverflow = window.document.body.style.overflow;
    const focusableSelector =
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!submitting) onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements =
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = window.document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.document.addEventListener("keydown", handleKeyDown);
    window.document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      window.document.removeEventListener("keydown", handleKeyDown);
      window.document.body.style.overflow = previousBodyOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose, submitting]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      role="presentation"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-surface-container-highest p-5 shadow-[0_0_18px_rgba(213,0,249,0.25),0_24px_80px_rgba(0,0,0,0.65)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">
                Ação irreversível nesta decisão
              </p>
              <h2
                id={titleId}
                className="mt-1 text-lg font-black tracking-tight text-foreground"
              >
                Revogar aprovação?
              </h2>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="shrink-0 rounded-xl border border-white/10 bg-black/30 p-2 text-muted-foreground transition hover:border-white/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar confirmação de revogação"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div
          id={descriptionId}
          className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm leading-relaxed text-muted-foreground"
        >
          <p>
            Você está prestes a revogar a aprovação de {documentLabel}. O
            documento voltará para o status{" "}
            <strong className="font-bold text-foreground">Pendente</strong>, e
            as ações de análise serão exibidas novamente para uma nova decisão.
          </p>
          <p className="mt-3 text-xs text-muted-foreground/80">
            A revogação será registrada na auditoria administrativa. O arquivo
            enviado não será excluído.
          </p>
        </div>

        <Form
          method="post"
          className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <input type="hidden" name="kycProfileId" value={kycProfileId} />
          <input type="hidden" name="intent" value="revoke-kyc" />
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-muted-foreground transition hover:border-white/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white transition hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span aria-live="polite">Revogando...</span>
              </>
            ) : (
              <>
                <ShieldOff className="h-4 w-4" aria-hidden="true" />
                Confirmar revogação
              </>
            )}
          </button>
        </Form>
      </div>
    </div>,
    window.document.body,
  );
}
