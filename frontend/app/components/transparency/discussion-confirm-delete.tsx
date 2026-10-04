/**
 * DiscussionConfirmDelete: modal de confirmacao ao deletar thread COM replies.
 *
 * Checkbox de ciencia obrigatorio para habilitar o botao de excluir.
 */
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDeleteProps {
  repliesCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function DiscussionConfirmDelete({
  repliesCount,
  onConfirm,
  onCancel,
  isSubmitting,
}: ConfirmDeleteProps) {
  const [acked, setAcked] = useState(false);
  const message =
    repliesCount > 0
      ? `Esta thread tem ${repliesCount} ${repliesCount === 1 ? "resposta" : "respostas"}. Ao excluir, as respostas serao mantidas porem a thread aparecera como removida.`
      : "Tem certeza que deseja excluir esta thread?";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="discussion-confirm-delete"
    >
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-black">Excluir thread</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={acked}
            onChange={(e) => setAcked(e.target.checked)}
            className="mt-0.5"
            data-testid="discussion-confirm-delete-ack"
          />
          <span>Estou ciente de que esta acao nao pode ser desfeita.</span>
        </label>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-border hover:border-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!acked || isSubmitting}
            data-testid="discussion-confirm-delete-button"
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded bg-red-600 text-white hover:opacity-90 disabled:opacity-40 transition"
          >
            {isSubmitting ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}