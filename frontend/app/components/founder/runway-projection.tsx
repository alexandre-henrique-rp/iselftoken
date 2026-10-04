import React from "react";
import { BarChart3 } from "lucide-react";

export function RunwayProjection() {
  return (
    <div className="glass-card p-8 lg:p-10 rounded-3xl border-dashed border-primary/30 shadow-xl">
      <h3 className="text-xl font-black text-foreground mb-8 flex items-center gap-3 italic uppercase tracking-tighter">
        <BarChart3 className="w-6 h-6 text-primary" />
        Projeção de Runway
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-accent/30 p-6 rounded-2xl border border-white/5">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Burn Rate</p>
          <p className="text-2xl font-black text-foreground tracking-tight italic">R$ 180k<span className="text-xs text-muted-foreground/40 not-italic">/mês</span></p>
        </div>
        <div className="bg-primary/5 p-6 rounded-2xl border-l-4 border-primary shadow-lg shadow-primary/5">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-3">Estimado</p>
          <p className="text-2xl font-black text-foreground tracking-tight italic">14 Meses</p>
        </div>
        <div className="bg-accent/30 p-6 rounded-2xl border border-white/5">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Meta Series A</p>
          <p className="text-2xl font-black text-foreground tracking-tight italic">Out/25</p>
        </div>
      </div>
    </div>
  );
}
