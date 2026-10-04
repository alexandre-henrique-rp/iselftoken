import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useApprovePaymentMutation } from "~/hooks/use-approve-payment-mutation";

interface ApprovePaymentModalProps {
  paymentId: number;
  paymentSummary: {
    user: string;
    amount: string;
    purpose: string;
  };
  onClose: () => void;
  onApproved: () => void;
}

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MIN_JUSTIFICATION = 10;

export function ApprovePaymentModal({
  paymentId,
  paymentSummary,
  onClose,
  onApproved,
}: ApprovePaymentModalProps) {
  const [justification, setJustification] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const approveMutation = useApprovePaymentMutation();
  const submitting = approveMutation.isPending;

  const justificationValid = justification.trim().length >= MIN_JUSTIFICATION;
  const fileValid =
    file !== null &&
    ACCEPTED_MIME.includes(file.type) &&
    file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
  const canSubmit = justificationValid && fileValid && !submitting;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    if (!picked) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_MIME.includes(picked.type)) {
      toast.error("Formato não aceito. Use PDF, JPG ou PNG.");
      return;
    }
    if (picked.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setFile(picked);
  };

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !file) return;
    approveMutation.mutate(
      { paymentId, justification, file },
      { onSuccess: () => onApproved() },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-payment-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5"
      >
        <header className="flex justify-between items-start gap-4">
          <div>
            <h2 id="approve-payment-title" className="text-xl font-black tracking-tight">
              Aprovar Pagamento #{paymentId}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {paymentSummary.user} · {paymentSummary.purpose} ·{" "}
              <span className="font-bold text-foreground">{paymentSummary.amount}</span>
            </p>
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
            htmlFor="justification"
            className="block text-xs font-bold uppercase tracking-widest text-muted-foreground"
          >
            Justificativa <span className="text-destructive">*</span>
          </label>
          <textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={4}
            placeholder="Ex: PIX recebido em conta espelho dia 14/05, comprovante anexo."
            className="w-full bg-accent/30 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60"
            required
            minLength={MIN_JUSTIFICATION}
          />
          <p className="text-xs text-muted-foreground">
            Mínimo {MIN_JUSTIFICATION} caracteres ({justification.trim().length} digitados).
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Comprovante <span className="text-destructive">*</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={handleFileChange}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 px-4 py-6 rounded-xl border-2 border-dashed border-border/40 hover:bg-accent/30 text-sm"
          >
            <FileUp className="w-5 h-5 text-muted-foreground" />
            {file ? (
              <span>
                {file.name}{" "}
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                Selecionar PDF/JPG/PNG (máx {MAX_FILE_SIZE_MB} MB)
              </span>
            )}
          </button>
        </div>

        <footer className="flex justify-end gap-3 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent/40 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/90 text-white font-bold text-sm hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Aprovar pagamento
              </>
            )}
          </button>
        </footer>
      </form>
    </div>
  );
}