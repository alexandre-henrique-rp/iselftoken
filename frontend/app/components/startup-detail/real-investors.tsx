import React from "react";
import { Users } from "lucide-react";

export function RealInvestors() {
  return (
    <section className="space-y-8 bg-accent/20 p-8 lg:p-12 rounded-3xl border border-white/5 relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black italic text-foreground tracking-tighter">
            Investidores Reais
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-2 block">
            Rodada em aberto
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">
            Sem investidores confirmados ainda. A contagem aparece aqui assim que
            houver aportes.
          </span>
        </div>
      </div>
    </section>
  );
}