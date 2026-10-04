import { useState } from "react";
import { Loader2, X, Trash2 } from "lucide-react";
import { useDeleteStartupMutation } from "~/hooks/use-delete-startup-mutation";

export interface HardDeleteStartupDialogProps {
  startupId: string;
  startupName: string;
  onClose: () => void;
}

/**
 * Modal de exclusao definitiva (hard delete) de startup.
 *
 * Requer que o usuario digite o nome exato da startup para confirmar.
 * O botao de confirmar somente fica habilitado quando o input bate
 * com o nome da startup (case-insensitive).
 *
 * Apos confirmacao, chama DELETE /api/admin/startups/:id/delete via mutation.
 * Toast de sucesso/erro e invalidadcao de queries sao tratados pelo hook.
 */
export function HardDeleteStartupDialog({
  startupId,
  startupName,
  onClose,
}: HardDeleteStartupDialogProps) {
  const [typedName, setTypedName] = useState("");
  const deleteMutation = useDeleteStartupMutation();

  const namesMatch = typedName.toLowerCase().trim() === startupName.toLowerCase().trim();
  const canConfirm = namesMatch && !deleteMutation.isPending;

  const handleConfirm = () => {
    if (!canConfirm) return;
    deleteMutation.mutate(
      { startupId, reason: `Exclusao definitiva via compliance UI pelo usuario` },
      { onSuccess: onClose },
    );
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hard-delete-dialog-title"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <header className="flex justify-between items-start gap-4">
          <div>
            <h2
              id="hard-delete-dialog-title"
              className="text-xl font-black tracking-tight text-destructive"
            >
              Excluir startup definitivamente
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Esta acao nao pode ser desfeita.
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

        {/* Aviso */}
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive font-medium">
            Todos os dados da startup e seu historico financeiro serao removidos
            permanentemente. Esta operacao nao pode ser desfeita.
          </p>
        </div>

        {/* Input de confirmacao */}
        <div className="space-y-2">
          <label
            htmlFor="startup-name-confirm"
            className="block text-xs font-bold uppercase tracking-widest text-muted-foreground"
          >
            Digite o nome da startup para confirmar:{" "}
            <span className="text-destructive font-black">{startupName}</span>
          </label>
          <input
            id="startup-name-confirm"
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={startupName}
            autoComplete="off"
            className="w-full bg-accent/30 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-destructive/60 placeholder:text-muted-foreground/50"
          />
          {typedName.length > 0 && !namesMatch && (
            <p className="text-xs text-destructive">
              O nome digitado nao corresponde a &quot;{startupName}&quot;
            </p>
          )}
        </div>

        {/* Footer */}
        <footer className="flex justify-end gap-3 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent/40 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Excluir definitivamente
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
