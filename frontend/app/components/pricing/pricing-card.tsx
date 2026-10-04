import React from "react";
import { CheckCircle2, Rocket, BarChart3, type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface PricingCardProps {
  title: string;
  badge: string;
  eyebrow?: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  isFeatured?: boolean;
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}

export function PricingCard({
  title,
  badge,
  eyebrow,
  price,
  period,
  description,
  features,
  cta,
  isFeatured,
  icon: Icon,
  onClick,
  disabled,
}: PricingCardProps) {
  return (
    <div className="relative group h-full w-full">
      {isFeatured && (
        <div className="absolute -inset-0.5 kinetic-gradient rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      )}

      <div className={cn(
        "relative h-full flex flex-col p-5 lg:p-7 rounded-[2rem] transition-all duration-500 hover:-translate-y-1 border",
        isFeatured
          ? "bg-linear-to-br from-primary/20 via-accent/40 to-black border-primary/30 shadow-2xl"
          : "bg-linear-to-br from-primary/10 via-accent/30 to-black border-white/10 shadow-xl"
      )}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <span className={cn(
              "font-black tracking-[0.2em] text-[10px] uppercase block mb-1.5",
              isFeatured ? "text-primary" : "text-muted-foreground"
            )}>
              {eyebrow ?? badge}
            </span>
            {eyebrow && (
              <span className="font-black tracking-[0.2em] text-[10px] uppercase block mb-1.5 text-muted-foreground/60">
                {badge}
              </span>
            )}
            <h2 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight italic">{title}</h2>
          </div>
          <div className={cn(
            "p-2.5 rounded-xl",
            isFeatured ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground"
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-muted-foreground">R$</span>
            <span className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter">{price}</span>
            <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">/{period}</span>
          </div>
          <p className="mt-3 text-muted-foreground text-sm font-medium leading-snug">
            {description}
          </p>
        </div>

        <div className="flex-grow space-y-2.5 mb-6">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-3 group/feature">
              <CheckCircle2 className={cn(
                "w-4 h-4 transition-transform group-hover/feature:scale-110 shrink-0",
                isFeatured ? "text-primary fill-primary/10" : "text-muted-foreground/40"
              )} />
              <span className="text-foreground font-bold tracking-tight text-sm">{feature}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "w-full py-3 rounded-xl font-black tracking-[0.1em] uppercase text-xs transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed",
            isFeatured
              ? "bg-[linear-gradient(135deg,#f000ff_0%,#d500f9_42%,#000000_100%)] text-primary-foreground hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_24px_rgba(213,0,249,0.35)]"
              : "bg-[linear-gradient(135deg,#f000ff_0%,#d500f9_42%,#000000_100%)] text-primary-foreground border border-primary/40 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_24px_rgba(213,0,249,0.28)]"
          )}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
