import React from "react";

export function WithdrawHeader() {
  return (
    <header className="w-full mb-12 flex flex-col items-start gap-2">
      <span className="text-primary font-bold tracking-[0.2em] uppercase text-xs">
        Resgates e Liquidez
      </span>
      <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground leading-tight">
        Solicitar Resgate
      </h1>
    </header>
  );
}
