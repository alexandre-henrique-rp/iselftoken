import { useCallback, useEffect, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface CancelPlanModalProps {
  /** Nome do plano que sera cancelado (exibido no modal). */
  planName: string;
  /** Valor pago pelo plano (snapshot no momento do cancelamento). */
  planPrice: string;
  /** Data de vencimento atual. */
  expiresAt: string;
  /** Submit em voo (desabilita botao e mostra spinner). */
  submitting: boolean;
  /** Callback de confirmacao — chama API + invalida caches no caller. */
  onConfirm: () => void;
  /** Callback para fechar o modal (botao X ou "Voltar"). */
  onClose: () => void;
}

/**
 * Modal de confirmacao de cancelamento de plano.
 *
 * Padrao espelhado de `SwitchPlanModal` (app/components/pricing/) —
 * acessivel (role/aria), overlay com backdrop-blur, foco no cancel.
 *
 * Regra CASE.md §Planos + decisao F3: cancelar revoga acesso IMEDIATO
 * e NAO ha reembolso do periodo pago. O modal reforca isso visualmente
 * antes do clique final.
 */
export function CancelPlanModal({
  planName,
  planPrice,
  expiresAt,
  submitting,
  onConfirm,
  onClose,
}: CancelPlanModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    return () => {
      previousFocus.current?.focus();
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-plan-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5">
        <header className="flex justify-between items-start gap-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10">
              <AlertTriangle className="w-3 h-3" />
              Cancelamento
            </span>
            <h2
              id="cancel-plan-title"
              className="text-xl font-black tracking-tight mt-3"
            >
              Cancelar este plano?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 hover:bg-accent/40 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Resumo do plano que sera cancelado */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
            <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              Plano
            </span>
            <div className="text-right">
              <div className="font-bold">{planName}</div>
              <div className="text-xs text-muted-foreground">{planPrice}</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">
              Expira em
            </span>
            <span className="text-xs text-on-surface">{expiresAt}</span>
          </div>
        </div>

        {/* Aviso de impacto (CASE.md §Planos + F3) */}
        <div className="flex items-start gap-3 p-3 rounded-xl border-2 border-red-500/40 bg-red-500/5 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-400">
              Acesso revogado imediatamente. Sem reembolso.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Ao confirmar, sua assinatura sera cancelada e o acesso aos
              beneficios deste plano sera removido na proxima verificacao.
              O valor ja pago nao sera estornado proporcionalmente. Para
              voltar a ter acesso, faca uma nova contratacao em /pricing.
            </p>
          </div>
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
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Cancelando...
              </>
            ) : (
              <>
                Sim, cancelar plano
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
