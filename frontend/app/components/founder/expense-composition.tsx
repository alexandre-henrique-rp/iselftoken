import React from "react";

export function ExpenseComposition() {
  return (
    <div className="glass-card p-8 lg:p-10 rounded-3xl text-center relative overflow-hidden shadow-2xl">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-10">Composição de Gastos</h3>
      
      {/* Circular Chart Placeholder */}
      <div className="relative w-64 h-64 mx-auto mb-10 flex items-center justify-center animate-in fade-in zoom-in duration-1000">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" fill="transparent" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8"></circle>
          <circle className="drop-shadow-[0_0_12px_rgba(213,0,249,0.6)]" cx="50" cy="50" fill="transparent" r="40" stroke="#d500f9" strokeDasharray="251.2" strokeDashoffset="140" strokeWidth="8" strokeLinecap="round"></circle>
          <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f0abff" strokeDasharray="251.2" strokeDashoffset="210" strokeWidth="8" strokeLinecap="round"></circle>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-foreground tracking-tighter italic">45%</span>
          <span className="text-[9px] uppercase font-black tracking-widest text-primary mt-1">Marketing</span>
        </div>
      </div>

      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/20 transition-all cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(213,0,249,0.5)]"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Growth</span>
          </div>
          <span className="text-sm font-black text-foreground tracking-tight">R$ 1.1M</span>
        </div>
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-secondary/20 transition-all cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Operações</span>
          </div>
          <span className="text-sm font-black text-foreground tracking-tight">R$ 612K</span>
        </div>
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-muted-foreground/20 transition-all cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Tecnologia</span>
          </div>
          <span className="text-sm font-black text-foreground tracking-tight">R$ 490K</span>
        </div>
      </div>
    </div>
  );
}
