import React from "react";
import { Wallet, Clock } from "lucide-react";

interface WithdrawSummaryProps {
  availableBalance: string;
}

export function WithdrawSummary({ availableBalance }: WithdrawSummaryProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Balance Card */}
      <div className="bg-accent/30 rounded-3xl p-8 flex flex-col gap-4 relative overflow-hidden group border border-white/5">
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <Wallet className="w-16 h-16 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground font-bold tracking-wide uppercase text-[10px]">Saldo Disponível para Saque</p>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-primary tracking-[0.2em] uppercase">BRL</span>
          <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter drop-shadow-[0_0_20px_rgba(213,0,249,0.1)]">
            {availableBalance}
          </h2>
        </div>
      </div>

      {/* Withdrawal Info */}
      <div className="bg-accent/10 rounded-3xl p-8 border-l-4 border-primary/40">
        <div className="flex items-start gap-4 mb-8">
          <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-muted-foreground font-medium">
            O valor será creditado em sua conta em até <span className="text-foreground font-black">24 horas úteis.</span>
          </p>
        </div>
        <div className="space-y-5">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Taxa de Resgate</span>
            <span className="text-primary tracking-tight">R$ 0,00</span>
          </div>
          <div className="flex justify-between items-center text-lg font-black border-t border-white/5 pt-5">
            <span className="text-foreground tracking-tight">Recebimento Líquido</span>
            <span className="text-primary drop-shadow-[0_0_10px_rgba(213,0,249,0.2)] tracking-tighter">{availableBalance}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
