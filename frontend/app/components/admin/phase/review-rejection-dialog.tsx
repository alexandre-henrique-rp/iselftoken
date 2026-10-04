import { AlertTriangle, Loader2, X, ShieldOff } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Dialog destrutivo para REJEITAR (reprovar) um StartupDocument individual
 * na fase §2 (Compliance/Admin). Espelha o padrão visual de
 * `AdminKycRevokeDialog.tsx` mas com:
 *  - Textarea de justificativa (obrigatória, >=20 chars, <=500 — LGPD);
 *  - Validação inline ("Faltam X caracteres");
 *  - Submit desabilitado enquanto a justificativa não for válida;
 *  - Callback `onConfirm(justification)` — sem `<Form method="post">`,
 *    usamos TanStack Query invalidation no parent.
 */
interface ReviewRejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docName: string;
  categoriaLabel: string;
  onConfirm: (justification: string) => Promise<boolean>;
  pending: boolean;
}

const MIN_CHARS = 20;
const MAX_CHARS = 500;

export function ReviewRejectionDialog({
  open,
  onOpenChange,
  docName,
  categoriaLabel,
  onConfirm,
  pending,
}: ReviewRejectionDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [justification, setJustification] = useState("");

  const trimmed = justification.trim();
  const remaining = MIN_CHARS - trimmed.length;
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_CHARS;
  const tooLong = trimmed.length > MAX_CHARS;
  const canSubmit = trimmed.length >= MIN_CHARS && trimmed.length <= MAX_CHARS;

  // Reset textarea quando o dialog é reaberto (após sucesso, próxima rejeição).
  useEffect(() => {
    if (open) setJustification("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = window.document.body.style.overflow;
    const focusableSelector =
      'button:not([disabled]), [tabindex]:not([tabindex="-1"]), textarea:not([disabled])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!pending) onOpenChange(false);
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
    // Foco inicial no textarea (UX padrão para dialogs com input principal)
    setTimeout(() => textareaRef.current?.focus(), 0);

    return () => {
      window.document.removeEventListener("keydown", handleKeyDown);
      window.document.body.style.overflow = previousBodyOverflow;
    };
  }, [open, pending, onOpenChange]);

  if (!open || typeof window === "undefined") return null;

  async function handleSubmit() {
    if (!canSubmit) return;
    const ok = await onConfirm(trimmed);
    if (ok) onOpenChange(false);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      role="presentation"
      onClick={() => {
        if (!pending) onOpenChange(false);
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
                Reprovar documento
              </p>
              <h2
                id={titleId}
                className="mt-1 text-lg font-black tracking-tight text-foreground"
              >
                {categoriaLabel}
              </h2>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Arquivo: <span className="font-mono">{docName}</span>
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="shrink-0 rounded-xl border border-white/10 bg-black/30 p-2 text-muted-foreground transition hover:border-white/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar confirmação de reprovação"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div
          id={descriptionId}
          className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm leading-relaxed text-muted-foreground"
        >
          <p>
            O documento será <strong className="font-bold text-foreground">removido</strong>{" "}
            do startup e o founder será notificado por notificação in-app +
            e-mail. O <strong className="font-bold text-foreground">audit log</strong>{" "}
            preserva o snapshot pré-delete (nome, s3Key, tamanho, mime,
            uploadedBy, motivo) para fins de LGPD.
          </p>
          <p className="mt-3 text-xs text-muted-foreground/80">
            O founder verá um banner vermelho na categoria correspondente
            até enviar um novo documento.
          </p>
        </div>

        <label
          htmlFor="rejection-justification"
          className="mt-5 block text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
        >
          Justificativa (obrigatória, mín {MIN_CHARS} chars, máx {MAX_CHARS})
        </label>
        <textarea
          id="rejection-justification"
          ref={textareaRef}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          disabled={pending}
          maxLength={MAX_CHARS + 50}
          rows={4}
          placeholder="Descreva o motivo da reprovação para que o founder saiba exatamente o que corrigir no reenvio."
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div
          className={`mt-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest ${
            tooLong
              ? "text-destructive"
              : tooShort
                ? "text-amber-300"
                : trimmed.length > 0
                  ? "text-emerald-300"
                  : "text-muted-foreground"
          }`}
          aria-live="polite"
        >
          <span>
            {tooLong
              ? `Excede ${MAX_CHARS} caracteres (${trimmed.length}/${MAX_CHARS})`
              : tooShort
                ? `Faltam ${remaining} caracteres`
                : trimmed.length > 0
                    ? `${trimmed.length}/${MAX_CHARS} caracteres`
                    : "—"}
          </span>
          {trimmed.length >= MIN_CHARS && !tooLong && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              OK
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-muted-foreground transition hover:border-white/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || pending}
            aria-disabled={!canSubmit || pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white transition hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span aria-live="polite">Reprovando...</span>
              </>
            ) : (
              <>
                <ShieldOff className="h-4 w-4" aria-hidden="true" />
                Confirmar reprovação
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}