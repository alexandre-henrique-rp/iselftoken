import { ArrowDownRight, ArrowUpRight, AlertTriangle, Loader2, X } from "lucide-react";

export type SwitchDirection = "upgrade" | "downgrade" | "same-tier";

interface SwitchPlanModalProps {
  currentPlanName: string;
  currentPlanPrice: number;
  newPlanName: string;
  newPlanPrice: number;
  direction: SwitchDirection;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Modal de confirmação de troca de plano. Mostra direção (upgrade ou
 * downgrade conforme delta de preço), reforça que NÃO há reembolso do
 * período já pago, e exige clique explícito pra avançar.
 *
 * O caller (`/pricing`) orquestra: ao confirmar, cancela a Subscription
 * atual via POST /api/subscriptions/:id/cancel e segue o fluxo padrão
 * de criar Subscription PENDING + Payment + navegar pro checkout.
 */
export function SwitchPlanModal({
  currentPlanName,
  currentPlanPrice,
  newPlanName,
  newPlanPrice,
  direction,
  submitting,
  onConfirm,
  onClose,
}: SwitchPlanModalProps) {
  const Icon =
    direction === "upgrade"
      ? ArrowUpRight
      : direction === "downgrade"
        ? ArrowDownRight
        : ArrowUpRight;
  const directionLabel =
    direction === "upgrade"
      ? "Upgrade"
      : direction === "downgrade"
        ? "Downgrade"
        : "Troca de plano";
  const iconTone =
    direction === "upgrade"
      ? "text-emerald-400 bg-emerald-500/10"
      : direction === "downgrade"
        ? "text-amber-400 bg-amber-500/10"
        : "text-primary bg-primary/10";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-plan-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-5">
        <header className="flex justify-between items-start gap-4">
          <div>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${iconTone}`}>
              <Icon className="w-3 h-3" />
              {directionLabel}
            </span>
            <h2 id="switch-plan-title" className="text-xl font-black tracking-tight mt-3">
              Trocar de plano?
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

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
            <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              Atual
            </span>
            <div className="text-right">
              <div className="font-bold">{currentPlanName}</div>
              <div className="text-xs text-muted-foreground">{formatBRL(currentPlanPrice)}/ano</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/30">
            <span className="text-primary text-xs uppercase tracking-widest font-bold">
              Novo
            </span>
            <div className="text-right">
              <div className="font-bold">{newPlanName}</div>
              <div className="text-xs text-muted-foreground">{formatBRL(newPlanPrice)}/ano</div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/5 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-400">Sem reembolso do período pago.</p>
            <p className="text-muted-foreground text-xs mt-1">
              Ao confirmar, sua assinatura atual será cancelada imediatamente
              e você terá que pagar o novo plano integralmente. Nenhum valor
              será estornado proporcionalmente.
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando…
              </>
            ) : (
              <>
                Confirmar troca <Icon className="w-4 h-4" />
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
