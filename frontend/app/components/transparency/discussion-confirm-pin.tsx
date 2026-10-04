/**
 * DiscussionConfirmPin: modal de confirmacao ao fixar/destfixar thread.
 */
import { Pin } from "lucide-react";

interface ConfirmPinProps {
  action: "pin" | "unpin";
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function DiscussionConfirmPin({
  action,
  onConfirm,
  onCancel,
  isSubmitting,
}: ConfirmPinProps) {
  const isPin = action === "pin";
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="discussion-confirm-pin"
    >
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-start gap-3">
          <Pin className="w-5 h-5 text-primary mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-black">
              {isPin ? "Fixar thread" : "Destfixar thread"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isPin
                ? "A thread aparecera no topo do feed com badge 'Fixada'. Apenas 1 thread pode estar fixada por vez - a atual sera destfixada."
                : "A thread voltara a ordenacao padrao do feed."}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-border hover:border-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
          >
            {isSubmitting ? "Salvando..." : isPin ? "Fixar" : "Destfixar"}
          </button>
        </div>
      </div>
    </div>
  );
}