import React from "react";

export function PricingHeader() {
  return (
    <header className="text-center mb-6 lg:mb-8 space-y-2">
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-foreground leading-none">
        Escolha seu perfil{" "}
        <span className="text-primary italic drop-shadow-[0_0_20px_rgba(213,0,249,0.3)]">
          iSelfToken
        </span>
      </h1>
      <p className="text-muted-foreground text-sm lg:text-base font-medium max-w-2xl mx-auto">
        Escolha como você quer participar do ecossistema iSelfToken.
      </p>
      <p className="text-muted-foreground/80 text-xs lg:text-sm max-w-2xl mx-auto">
        Capte investimento, invista em startups ou gere renda conectando investidores a oportunidades.
      </p>
    </header>
  );
}
