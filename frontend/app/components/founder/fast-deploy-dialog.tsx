import { useEffect, useCallback } from "react";
import { Loader2, Rocket, Clock, X } from "lucide-react";

export interface FastDeployDialogProps {
  /** Preço do serviço "Publicação Rápida" (R$). */
  price?: number;
  loading?: boolean;
  /** Fecha o diálogo sem contratar (segue só com a Taxa de Compliance). */
  onDecline: () => void;
  /** Confirma a contratação da Publicação Rápida (checkout com os 2 produtos). */
  onAccept: () => void;
}

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Diálogo "Publicação Rápida" (FAST_DEPLOY).
 *
 * Exibido ao clicar em "Finalizar" na tela de retornos da captação, SOMENTE
 * quando a Taxa de Compliance ainda NÃO foi paga. Explica que, por padrão, a
 * publicação ocorre em até 24h após a aprovação do Compliance, e oferece a
 * Publicação Rápida (publicação imediata) como serviço pago, contratado junto
 * da Taxa de Compliance (checkout com 2 produtos).
 *
 * @example
 * <FastDeployDialog
 *   price={1000}
 *   loading={mutation.isPending}
 *   onDecline={() => finalize(false)}
 *   onAccept={() => finalize(true)}
 * />
 */
export function FastDeployDialog({
  price,
  loading = false,
  onDecline,
  onAccept,
}: FastDeployDialogProps) {
  // Bloquear scroll do body enquanto o modal está aberto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onDecline();
      }
    },
    [loading, onDecline],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fast-deploy-dialog-title"
      aria-describedby="fast-deploy-dialog-description"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5">
        <header className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/15">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2
                id="fast-deploy-dialog-title"
                className="text-xl font-black tracking-tight"
              >
                Publicação Rápida
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Publique sua startup sem espera
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDecline}
            className="rounded-lg p-1 hover:bg-accent/40"
            aria-label="Fechar"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div
          id="fast-deploy-dialog-description"
          className="space-y-3 text-sm text-muted-foreground"
        >
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p>
              Por padrão, após a aprovação do Compliance, sua startup é publicada
              no marketplace em até{" "}
              <strong className="text-foreground">24 horas</strong>.
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <Rocket className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>
              Com a <strong className="text-foreground">Publicação Rápida</strong>
              , a publicação e a liberação da página pública são{" "}
              <strong className="text-primary">imediatas</strong> assim que o
              Compliance aprovar.
              {typeof price === "number" && price > 0 && (
                <>
                  {" "}
                  Valor único:{" "}
                  <strong className="text-foreground">{formatBRL(price)}</strong>
                  , cobrado junto da Taxa de Compliance.
                </>
              )}
            </p>
          </div>
        </div>

        <footer className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-border/30">
          <button
            type="button"
            onClick={onDecline}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent/40 disabled:opacity-50"
          >
            Não, obrigado
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={loading}
            aria-label="Aceitar Publicação Rápida"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando…
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" /> Aceitar Publicação Rápida
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
