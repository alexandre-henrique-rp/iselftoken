import React from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";

interface StartupHeroProps {
  name: string;
  badge: string;
  description: string;
  logo: string;
}

export function StartupHero({ name, badge, description, logo }: StartupHeroProps) {
  return (
    <section>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-4 mb-16 text-[10px] sm:text-xs tracking-widest uppercase font-bold">
        <Link className="text-muted-foreground hover:text-primary transition-colors" to="/home">Home</Link>
        <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
        <Link className="text-muted-foreground hover:text-primary transition-colors" to="/home">Marketplace</Link>
        <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
        <span className="text-primary">{name}</span>
      </nav>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 lg:gap-8 mb-8 text-center md:text-left">
        <div className="relative shrink-0">
          <InitialsImage
            name={name}
            src={logo}
            alt={`${name} Logo`}
            className="h-24 w-24 rounded-3xl border-2 border-primary/20 shadow-[0_0_30px_rgba(213,0,249,0.1)] lg:h-32 lg:w-32"
            fallbackClassName="bg-primary/10"
            fallbackTextClassName="text-xl font-black text-primary lg:text-3xl"
          />
          <div className="absolute -bottom-2 -right-2 bg-primary text-black p-1.5 rounded-lg shadow-lg">
            <ShieldCheck className="w-4 h-4 stroke-[3]" />
          </div>
        </div>
        
        <div className="flex-1">
          <span className="bg-primary/10 text-primary text-[10px] font-black tracking-[0.2em] px-4 py-1.5 uppercase rounded-full mb-4 inline-block border border-primary/20">
            {badge}
          </span>
          <h1 className="text-5xl lg:text-8xl font-black tracking-tighter text-foreground neon-glow leading-none">
            {name}
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground mt-6 font-medium leading-relaxed max-w-2xl mx-auto md:mx-0">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

import { ShieldCheck } from "lucide-react";
