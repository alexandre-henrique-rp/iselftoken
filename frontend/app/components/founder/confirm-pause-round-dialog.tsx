import { Loader2, X, Pause } from "lucide-react";

export interface ConfirmPauseRoundDialogProps {
  startupName: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Modal de confirmacao para pausar uma rodada.
 * Texto PT-BR: explica que novas reservas serao suspensas.
 */
export function ConfirmPauseRoundDialog({
  startupName,
  loading = false,
  onClose,
  onConfirm,
}: ConfirmPauseRoundDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5">
        <header className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15">
              <Pause className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 id="pause-dialog-title" className="text-xl font-black tracking-tight">
                Pausar Rodada
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {startupName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-accent/40"
            aria-label="Fechar"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja <strong className="text-foreground">pausar</strong> esta
          rodada de captação?{" "}
          <strong className="text-foreground">
            Novas reservas de investidores serão suspensas
          </strong>{" "}
          até que a rodada seja retomanda. Investimentos já realizados não são afetados.
        </p>

        <footer className="flex justify-end gap-3 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent/40 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/90 text-white font-bold text-sm hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando…
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" /> Pausar Rodada
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
