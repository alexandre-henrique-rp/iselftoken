import { ArrowLeft, Wallet } from "lucide-react";
import { Link } from "react-router";

/**
 * Header da pagina /founder/financeiro — area financeira consolidada do fundador.
 * Mostra link "Voltar" + titulo + badge magenta consistente com o design system.
 */
export function FounderFinanceiroHeader({ startupCount }: { startupCount: number }) {
  return (
    <header className="space-y-3">
      <Link
        to="/founder/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-[11px] font-black uppercase tracking-widest transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
      </Link>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            founder · financeiro
          </span>
          <h1 className="mt-1 text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-foreground leading-[0.9]">
            FINANCEIRO.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">
            Todas as cobranças e pagamentos das suas startups — reservas, taxas
            de compliance, selos, prorrogações e outros serviços.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
          <Wallet className="h-3.5 w-3.5" />
          {startupCount > 0
            ? `${startupCount} startup${startupCount === 1 ? "" : "s"}`
            : "Sem startup"}
        </div>
      </div>
    </header>
  );
}