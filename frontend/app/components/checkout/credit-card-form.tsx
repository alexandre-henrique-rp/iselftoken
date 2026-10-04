import React, { useState } from "react";
import { CreditCard, QrCode, ShieldCheck, Lock, Verified } from "lucide-react";
import { cn } from "~/lib/utils";

export function CreditCardForm() {
  const [method, setMethod] = useState<"card" | "pix">("card");

  return (
    <div className="space-y-10">
      {/* Payment Method Selector */}
      <div className="flex flex-col md:flex-row gap-4">
        <label className="flex-1 cursor-pointer group">
          <input 
            type="radio" 
            name="payment_method" 
            className="hidden peer" 
            checked={method === "card"} 
            onChange={() => setMethod("card")} 
          />
          <div className="flex items-center gap-4 p-6 rounded-2xl bg-accent/20 border-2 border-transparent transition-all peer-checked:bg-primary/5 peer-checked:border-primary/40 group-hover:bg-accent/30">
            <CreditCard className={cn("w-6 h-6 transition-colors", method === "card" ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("font-black uppercase tracking-widest text-[10px]", method === "card" ? "text-primary" : "text-muted-foreground")}>Cartão de Crédito</span>
          </div>
        </label>
        
        <label className="flex-1 cursor-pointer group">
          <input 
            type="radio" 
            name="payment_method" 
            className="hidden peer" 
            checked={method === "pix"} 
            onChange={() => setMethod("pix")} 
          />
          <div className="flex items-center gap-4 p-6 rounded-2xl bg-accent/20 border-2 border-transparent transition-all peer-checked:bg-primary/5 peer-checked:border-primary/40 group-hover:bg-accent/30">
            <QrCode className={cn("w-6 h-6 transition-colors", method === "pix" ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("font-black uppercase tracking-widest text-[10px]", method === "pix" ? "text-primary" : "text-muted-foreground")}>PIX</span>
          </div>
        </label>
      </div>

      {method === "card" ? (
        <div className="glass-card p-8 lg:p-10 rounded-[32px] space-y-8 border border-white/5 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none">
            <CreditCard className="w-48 h-48 rotate-12" />
          </div>
          
          <div className="grid grid-cols-1 gap-8 relative z-10">
            <div className="flex flex-col space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Número do Cartão</label>
              <input 
                className="bg-accent/50 border-none border-b-2 border-white/10 focus:border-primary focus:ring-0 p-5 rounded-xl transition-all text-foreground text-lg font-medium placeholder:text-muted-foreground/30" 
                placeholder="0000 0000 0000 0000" 
                type="text"
              />
            </div>
            
            <div className="flex flex-col space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Nome no Cartão</label>
              <input 
                className="bg-accent/50 border-none border-b-2 border-white/10 focus:border-primary focus:ring-0 p-5 rounded-xl transition-all text-foreground text-lg font-medium placeholder:text-muted-foreground/30 uppercase" 
                placeholder="EX: RICARDO S FONTES" 
                type="text"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Validade</label>
                <input 
                  className="bg-accent/50 border-none border-b-2 border-white/10 focus:border-primary focus:ring-0 p-5 rounded-xl transition-all text-foreground text-lg font-medium placeholder:text-muted-foreground/30 text-center" 
                  placeholder="MM/AA" 
                  type="text"
                />
              </div>
              <div className="flex flex-col space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">CVV</label>
                <input 
                  className="bg-accent/50 border-none border-b-2 border-white/10 focus:border-primary focus:ring-0 p-5 rounded-xl transition-all text-foreground text-lg font-medium placeholder:text-muted-foreground/30 text-center" 
                  placeholder="123" 
                  type="text"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 rounded-[32px] border border-primary/20 flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
            <QrCode className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-foreground">Pagamento via PIX</h3>
          <p className="text-muted-foreground max-w-xs font-medium">O código QR será gerado após você clicar em "Finalizar Pagamento".</p>
        </div>
      )}

      {/* Security Info */}
      <div className="flex flex-wrap gap-8 items-center pt-10 border-t border-white/5 opacity-60 justify-center md:justify-start">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Verified className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">Pagamento Seguro</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">Criptografia SSL</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">Dados Protegidos</span>
        </div>
      </div>
    </div>
  );
}
