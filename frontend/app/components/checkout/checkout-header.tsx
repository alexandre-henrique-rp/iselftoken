import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export function CheckoutHeader() {
  return (
    <div className="mb-12 space-y-12">
      <Link 
        to="/home" 
        className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit"
      >
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Voltar</span>
      </Link>

      <header className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight">
          Finalizar Checkout
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-xl font-medium">
          Complete as informações de pagamento para ativar seu acesso ao iSelfToken.
        </p>
      </header>
    </div>
  );
}
