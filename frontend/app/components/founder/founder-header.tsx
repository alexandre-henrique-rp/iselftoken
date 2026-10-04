import { Plus, Wallet } from "lucide-react";
import { Link } from "react-router";

export function FounderHeader() {
  return (
    <header className="mb-10">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-3">
        founder · dashboard
      </p>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-foreground leading-[0.85]">
            MINHAS
            <br />
            <span className="text-primary italic">STARTUPS.</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl font-medium leading-relaxed mt-4">
            Gerencie projetos, rodadas e ativos tokenizados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Link
            to="/founder/financeiro"
            className="border border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all duration-300 px-4 py-2.5 rounded-full flex items-center justify-center gap-2 active:scale-95"
            data-testid="founder-header-financeiro-cta"
          >
            <Wallet className="text-primary w-4 h-4" />
            <span className="text-primary font-black uppercase tracking-widest text-[10px]">
              Financeiro
            </span>
          </Link>
          <Link
            to="/founder/startups/new"
            className="bg-primary hover:bg-primary-container transition-all duration-300 px-5 py-2.5 rounded-full flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(213,0,249,0.25)]"
          >
            <Plus className="text-black w-4 h-4 stroke-[3]" />
            <span className="text-black font-black uppercase tracking-widest text-[10px]">
              Nova Startup
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
