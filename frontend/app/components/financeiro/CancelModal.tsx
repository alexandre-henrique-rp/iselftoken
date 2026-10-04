import { useState } from "react";
import { Loader2, X, XCircle } from "lucide-react";
import { useCancelPaymentMutation } from "~/hooks/use-cancel-payment-mutation";

interface CancelModalProps {
  title: string;
  description: string;
  endpoint: string;
  onClose: () => void;
  onCanceled: () => void;
}

const MIN_JUSTIFICATION = 10;

/**
 * Modal genérico de cancelamento — reusado para Payment e Subscription.
 * O caller passa o `endpoint` BFF que recebe `{justification}` por POST.
 *
 * Internamente delega para `useCancelPaymentMutation`, que invalida
 * queries de payments/startup-overview em sucesso.
 */
export function CancelModal({
  title,
  description,
  endpoint,
  onClose,
  onCanceled,
}: CancelModalProps) {
  const [justification, setJustification] = useState("");
  const cancelMutation = useCancelPaymentMutation();

  const submitting = cancelMutation.isPending;
  const valid = justification.trim().length >= MIN_JUSTIFICATION && !submitting;

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;
    cancelMutation.mutate(
      { endpoint, justification: justification.trim() },
      { onSuccess: () => onCanceled() },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5"
      >
        <header className="flex justify-between items-start gap-4">
          <div>
            <h2 id="cancel-modal-title" className="text-xl font-black tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-accent/40"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="space-y-2">
          <label
            htmlFor="cancel-justification"
            className="block text-xs font-bold uppercase tracking-widest text-muted-foreground"
          >
            Justificativa <span className="text-destructive">*</span>
          </label>
          <textarea
            id="cancel-justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={4}
            placeholder="Ex: Solicitação do cliente via chamado #123 — fraude confirmada."
            className="w-full bg-accent/30 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60"
            required
            minLength={MIN_JUSTIFICATION}
          />
          <p className="text-xs text-muted-foreground">
            Mínimo {MIN_JUSTIFICATION} caracteres ({justification.trim().length} digitados).
          </p>
        </div>

        <footer className="flex justify-end gap-3 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent/40 disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/90 text-white font-bold text-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando…
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" /> Confirmar cancelamento
              </>
            )}
          </button>
        </footer>
      </form>
    </div>
  );
}