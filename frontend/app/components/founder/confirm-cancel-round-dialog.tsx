import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, X, XCircle } from "lucide-react";

export interface ConfirmCancelRoundDialogProps {
  startupName: string;
  loading?: boolean;
  /** Quantidade de investidores na rodada. Exibida como contexto na mensagem. */
  investmentCount?: number;
  /** Valor total investido (formatado, ex: "R$ 150.000,00"). Exibido como contexto. */
  totalAmount?: string;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Modal de confirmação para cancelar uma rodada de captação.
 *
 * Exige checkbox de confirmação antes de habilitar o botão destrutivo.
 * Mostra contexto sobre investidores e valor quando disponível.
 * Bloqueia interação fora do modal (focus trap implícito via aria-modal).
 *
 * @param props - Props do componente
 * @param props.startupName - Nome da startup para contexto visual
 * @param props.loading - Estado de processamento (desabilita botões)
 * @param props.investmentCount - Qtd de investidores (exibido na mensagem)
 * @param props.totalAmount - Valor total investido formatado (exibido na mensagem)
 * @param props.onClose - Callback para fechar o modal
 * @param props.onConfirm - Callback para confirmar o cancelamento
 * @returns Modal de confirmação JSX
 * @example
 * <ConfirmCancelRoundDialog
 *   startupName="TechStart"
 *   investmentCount={12}
 *   totalAmount="R$ 150.000,00"
 *   loading={mutation.isPending}
 *   onClose={() => setOpen(false)}
 *   onConfirm={() => mutation.mutate()}
 * />
 */
export function ConfirmCancelRoundDialog({
  startupName,
  loading = false,
  investmentCount,
  totalAmount,
  onClose,
  onConfirm,
}: ConfirmCancelRoundDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Focus no diálogo ao abrir
  useEffect(() => {
    if (!loading) {
      checkboxRef.current?.focus();
    }
  }, [loading]);

  // Bloquear scroll do body enquanto modal aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Fechar com Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    },
    [loading, onClose],
  );

  const hasInvestors = investmentCount !== undefined && investmentCount > 0;
  const hasAmount = totalAmount !== undefined && totalAmount.length > 0;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      aria-describedby="cancel-dialog-description"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5">
        <header className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/15">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 id="cancel-dialog-title" className="text-xl font-black tracking-tight">
                Cancelar Rodada
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

        <p id="cancel-dialog-description" className="text-sm text-muted-foreground">
          Tem certeza que deseja{" "}
          <strong className="text-red-400">cancelar</strong> esta rodada?{" "}
          <strong className="text-foreground">
            Todos os investidores receberão estorno integral automaticamente.
          </strong>
          {hasInvestors && (
            <span className="block mt-1">
              Investidores afetados:{" "}
              <strong className="text-foreground">{investmentCount}</strong>
              {hasAmount && (
                <>
                  {" · Valor total: "}
                  <strong className="text-foreground">{totalAmount}</strong>
                </>
              )}
            </span>
          )}
        </p>

        <label
          htmlFor="cancel-confirm-checkbox"
          className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20 cursor-pointer select-none"
        >
          <input
            ref={checkboxRef}
            id="cancel-confirm-checkbox"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={loading}
            className="mt-0.5 h-4 w-4 rounded border-red-500/40 text-red-500 focus:ring-red-500/30 accent-red-500"
          />
          <span className="text-sm text-muted-foreground leading-snug">
            Confirmo que desejo cancelar esta rodada e estornar todos os investimentos.
          </span>
        </label>

        <footer className="flex justify-end gap-3 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent/40 disabled:opacity-50"
          >
            Manter Rodada
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !confirmed}
            aria-label="Sim, cancelar e estornar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando…
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" /> Sim, cancelar e estornar
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
