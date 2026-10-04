import { CheckCircle2, Coins, Star } from "lucide-react";
import type { PlanItem } from "~/lib/plan-types";
import { cn } from "~/lib/utils";

interface PlanPreviewProps {
  plan: PlanItem;
}

/**
 * Preview ao vivo do card de plano (clona o PricingCard do consumidor
 * para evitar divergência visual entre /pricing e /financeiro/plans).
 */
export function PlanPreview({ plan }: PlanPreviewProps) {
  const brl = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div
      className={cn(
        "glass-panel rounded-3xl p-6 border-2 space-y-5 transition-all",
        plan.recomendado
          ? "border-primary/40 bg-primary/[0.03] shadow-[0_0_30px_rgba(213,0,249,0.1)]"
          : "border-white/10",
      )}
    >
      {plan.recomendado && (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest">
          <Star className="w-3 h-3 fill-black" /> Recomendado
        </span>
      )}
      <div className="space-y-1">
        <h3 className="text-lg font-black uppercase tracking-widest text-foreground italic">
          {plan.nome || "Nome do plano"}
        </h3>
        {plan.descricao && (
          <p className="text-xs text-muted-foreground">{plan.descricao}</p>
        )}
      </div>
      <div>
        <p className="text-4xl font-black text-foreground tracking-tighter">
          {brl.format(Number(plan.preco ?? 0))}
          <span className="ml-1 text-base font-bold text-muted-foreground">
            {plan.periodo || "/ano"}
          </span>
        </p>
      </div>
      <ul className="space-y-2 min-h-[60px]">
        {(plan.beneficios ?? []).slice(0, 5).map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-foreground/90"
          >
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>{b}</span>
          </li>
        ))}
        {(plan.beneficios ?? []).length > 5 && (
          <li className="text-[10px] text-muted-foreground italic">
            +{(plan.beneficios ?? []).length - 5} benefícios adicionais
          </li>
        )}
        {(!plan.beneficios || plan.beneficios.length === 0) && (
          <li className="text-xs text-muted-foreground italic">
            Adicione benefícios para visualizar o preview…
          </li>
        )}
      </ul>
      <button
        type="button"
        disabled
        className="w-full py-3 rounded-full bg-primary/40 text-black/60 font-black uppercase tracking-widest text-[11px] cursor-default"
      >
        <Coins className="w-3.5 h-3.5 inline-block mr-1" />
        {plan.textoBotao?.trim() || "Começar agora"}
      </button>
      <p className="text-[9px] text-muted-foreground text-center">
        Preview — apenas para conferência visual
      </p>
    </div>
  );
}
