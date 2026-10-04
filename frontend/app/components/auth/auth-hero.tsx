import React from "react";
import { type LucideIcon } from "lucide-react";

interface AuthHeroProps {
  title: React.ReactNode;
  subtitle: string;
  badgeText: string;
  icon?: LucideIcon;
  footerText?: string;
}

export function AuthHero({ title, subtitle, badgeText, icon, footerText }: AuthHeroProps) {
  const IconComponent = icon;

  return (
    <div className="hidden lg:flex flex-col justify-between p-12 lg:p-16 xl:p-20 bg-card/10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="text-primary text-[10px] lg:text-xs font-bold tracking-[0.4em] uppercase mb-8 animate-in fade-in slide-in-from-left duration-700">
          <span className="text-sm tracking-[6px] border-b-2 border-primary/20 pb-2">
            {badgeText}
          </span>
        </div>
        <h1 className="text-[clamp(3rem,6vw,5rem)] font-extrabold leading-[0.85] tracking-tighter text-foreground mb-10">
          {title}
        </h1>

        {IconComponent && (
          <div className="flex items-center gap-4 py-6 border-l-2 border-primary/40 pl-6 mb-8 bg-primary/5 rounded-r-2xl max-w-sm">
            <div className="p-3 rounded-full bg-surface-container-high border border-primary/20 shadow-[0_0_20px_rgba(213,0,249,0.1)] text-primary">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-foreground font-bold text-lg">{subtitle}</p>
              <p className="text-muted-foreground text-xs font-medium">Protocolos de segurança nível Tier 1 ativos.</p>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-auto">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-[2px] bg-primary"></div>
          <span className="text-xs tracking-[0.3em] text-foreground/40 font-bold uppercase">
            {footerText || "Security Infrastructure"}
          </span>
        </div>
      </div>

      {/* Background Kinetic Watermark */}
      <div className="absolute -bottom-16 -right-16 text-[20rem] font-black text-white/2 select-none pointer-events-none transform -rotate-12">
        IST
      </div>
    </div>
  );
}
