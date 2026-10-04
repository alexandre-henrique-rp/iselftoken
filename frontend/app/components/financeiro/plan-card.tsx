import { Award, Edit3, Power, PowerOff, Star, Users } from "lucide-react";
import { Link } from "react-router";
import type { PlanItem } from "~/lib/plan-types";
import { cn } from "~/lib/utils";

interface PlanCardProps {
  plan: PlanItem;
  adminActions?: boolean;
}

const brl = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v ?? 0));

function formatBenefitCount(n: number | undefined | null) {
  if (n == null) return "—";
  return `${n} benef.`;
}

/**
 * Card de plano para a lista em /financeiro/plans.
 * Mostra nome, preço, período, status, visibilidade, contagem de
 * assinantes ativos (quando admin) e ações.
 */
export function PlanCard({ plan, adminActions = true }: PlanCardProps) {
  return (
    <div
      className={cn(
        "glass-panel rounded-3xl p-6 border space-y-4 transition-opacity",
        plan.isActive ? "border-white/5" : "border-white/5 opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-foreground truncate">{plan.nome}</h3>
          <p className="text-[10px] font-mono text-muted-foreground/70 truncate mt-1">
            {plan.slug}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {plan.recomendado && (
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" aria-label="Recomendado" />
          )}
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
              plan.isActive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-white/5 text-muted-foreground border-white/10",
            )}
          >
            {plan.isActive ? "Ativo" : "Inativo"}
          </span>
          {!plan.visivel && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-white/5 text-muted-foreground border-white/10">
              Oculto
            </span>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-black text-foreground tracking-tight">
          {brl(plan.preco)}
          <span className="ml-1 text-sm font-bold text-muted-foreground">{plan.periodo}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
        <span className="text-[10px] text-muted-foreground font-bold">
          {formatBenefitCount(plan.beneficios?.length)}
        </span>
        {typeof plan.activeSubscribers === "number" && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-bold ml-auto">
            <Users className="w-3 h-3" />
            {plan.activeSubscribers} assinante{plan.activeSubscribers !== 1 ? "s" : ""}
          </span>
        )}
        {plan.periodoMeses > 0 && (
          <span className="text-[10px] text-muted-foreground font-bold">
            · {plan.periodoMeses}m
          </span>
        )}
      </div>

      {adminActions && (
        <div className="flex items-center gap-2 pt-2">
          <Link
            to={`/financeiro/plans/${plan.id}`}
            className="flex-1 py-2 rounded-lg bg-accent/40 text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-primary/15 transition-all flex items-center justify-center gap-1.5"
          >
            <Edit3 className="w-3 h-3" /> Editar
          </Link>
          <span
            className={cn(
              "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border cursor-default",
              plan.isActive
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            )}
            title="Use o botão 'Desativar' no detalhe"
          >
            {plan.isActive ? (
              <>
                <PowerOff className="w-3 h-3" /> Ativo
              </>
            ) : (
              <>
                <Power className="w-3 h-3" /> Inativo
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
