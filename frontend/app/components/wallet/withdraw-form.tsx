import React, { useState } from "react";
import { QrCode, Landmark, Check, ArrowRight } from "lucide-react";
import { cn } from "~/lib/utils";

export function WithdrawForm() {
  const [method, setMethod] = useState<"pix" | "bank">("pix");

  return (
    <form className="bg-accent/20 rounded-[32px] p-8 lg:p-10 flex flex-col gap-10 border border-white/5 shadow-2xl" onSubmit={(e) => e.preventDefault()}>
      {/* Amount Input */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end px-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-primary">Valor do Resgate</label>
          <button 
            type="button"
            className="text-[10px] font-black text-primary hover:text-primary/80 transition-colors uppercase tracking-widest underline underline-offset-4"
          >
            Usar Saldo Total
          </button>
        </div>
        <div className="relative flex items-center group">
          <span className="absolute left-6 text-2xl font-black text-muted-foreground group-focus-within:text-primary transition-colors">R$</span>
          <input 
            className="w-full bg-accent border-none border-b-2 border-white/10 focus:border-primary focus:ring-0 rounded-2xl py-6 pl-16 pr-6 text-3xl font-black tracking-tight text-foreground transition-all placeholder:text-white/10" 
            placeholder="0,00" 
            type="text"
          />
        </div>
      </div>

      {/* Destination Selection */}
      <div className="flex flex-col gap-6">
        <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Seleção de Destino</label>
        
        <div className="grid grid-cols-1 gap-4">
          {/* PIX Option */}
          <div className="flex flex-col gap-4">
            <label className="cursor-pointer group">
              <input 
                type="radio" 
                name="destination" 
                className="hidden peer" 
                checked={method === "pix"} 
                onChange={() => setMethod("pix")} 
              />
              <div className="flex items-center gap-5 p-6 rounded-2xl bg-accent/20 border-2 border-transparent peer-checked:border-primary/40 peer-checked:bg-primary/5 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <QrCode className="w-7 h-7" />
                </div>
                <div className="flex-grow">
                  <p className="font-black text-foreground text-lg">Chave PIX</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Transferência instantânea</p>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-white/10 peer-checked:border-primary flex items-center justify-center">
                  <div className={cn("w-3 h-3 rounded-full bg-primary transition-transform duration-300", method === "pix" ? "scale-100" : "scale-0")}></div>
                </div>
              </div>
            </label>
            
            {method === "pix" && (
              <div className="px-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <input 
                  className="w-full bg-accent border-2 border-white/5 focus:border-primary focus:ring-0 rounded-xl py-4 px-6 text-base font-medium text-foreground transition-all placeholder:text-muted-foreground/30" 
                  placeholder="Insira sua chave PIX (CPF, Email, Celular ou Aleatória)" 
                  type="text"
                />
              </div>
            )}
          </div>

          {/* Bank Account Option */}
          <div className="flex flex-col gap-4">
            <label className="cursor-pointer group">
              <input 
                type="radio" 
                name="destination" 
                className="hidden peer" 
                checked={method === "bank"} 
                onChange={() => setMethod("bank")} 
              />
              <div className="flex items-center gap-5 p-6 rounded-2xl bg-accent/20 border-2 border-transparent peer-checked:border-primary/40 peer-checked:bg-primary/5 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-accent/50 flex items-center justify-center text-muted-foreground border border-white/5 peer-checked:text-primary">
                  <Landmark className="w-7 h-7" />
                </div>
                <div className="flex-grow">
                  <p className="font-black text-foreground text-lg">Conta Bancária</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">TED ou DOC (até 1 dia útil)</p>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-white/10 peer-checked:border-primary flex items-center justify-center">
                  <div className={cn("w-3 h-3 rounded-full bg-primary transition-transform duration-300", method === "bank" ? "scale-100" : "scale-0")}></div>
                </div>
              </div>
            </label>
            
            {method === "bank" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <input className="w-full bg-accent border-2 border-white/5 focus:border-primary focus:ring-0 rounded-xl py-4 px-6 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/30" placeholder="Banco" type="text" />
                <input className="w-full bg-accent border-2 border-white/5 focus:border-primary focus:ring-0 rounded-xl py-4 px-6 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/30" placeholder="Agência" type="text" />
                <input className="w-full bg-accent border-2 border-white/5 focus:border-primary focus:ring-0 rounded-xl py-4 px-6 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/30" placeholder="Conta + Dígito" type="text" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button 
        className="w-full kinetic-gradient text-black font-black text-lg py-6 rounded-2xl shadow-[0_0_30px_rgba(213,0,249,0.4)] hover:shadow-[0_0_50px_rgba(213,0,249,0.6)] active:scale-[0.98] transition-all duration-300 uppercase tracking-widest flex items-center justify-center gap-3" 
        type="submit"
      >
        Confirmar Resgate
        <Check className="w-6 h-6 stroke-[4]" />
      </button>
    </form>
  );
}
