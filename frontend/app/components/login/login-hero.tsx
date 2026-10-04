import React from "react";

export function LoginHero() {
  return (
    <div className="hidden lg:flex flex-col justify-between p-12 lg:p-16 xl:p-20 bg-card/10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="text-primary text-[10px] lg:text-xs font-bold tracking-[0.4em] uppercase mb-8 animate-in fade-in slide-in-from-left duration-700">
          <span className="text-sm tracking-[6px] border-b-2 border-primary/20 pb-2">
            EQUITY CROWDFUNDING
          </span>
        </div>
        <h1 className="text-[clamp(2.25rem,4vw,3rem)] font-bold leading-[0.9] tracking-tighter text-foreground mb-10">
          iSelf<span className="text-primary drop-shadow-[0_0_20px_rgba(213,0,249,0.3)]">Token</span>
        </h1>
        <p className="mt-6 text-muted-foreground max-w-lg leading-relaxed">
          <span className="block text-foreground text-xl lg:text-2xl font-bold tracking-tight mb-3">
            Capital, conexões e oportunidades em um único ecossistema.
          </span>
          <span className="text-base lg:text-lg font-medium">
            Acesse sua conta e continue sua jornada na iSelfToken.
          </span>
        </p>
      </div>
      
      <div className="relative z-10 mt-auto">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-[2px] bg-primary"></div>
          <span className="text-xs tracking-[0.3em] text-foreground/40 font-bold uppercase">
            Evolution of Equity
          </span>
        </div>
      </div>

      {/* Background Kinetic Watermark */}
      <div className="absolute -bottom-16 -right-16 text-[20rem] font-bold text-white/[0.02] select-none pointer-events-none transform -rotate-12">
        IST
      </div>
    </div>
  );
}
