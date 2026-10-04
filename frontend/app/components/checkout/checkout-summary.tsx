import React from "react";
import { Info, Ticket } from "lucide-react";
import { useNavigate } from "react-router";

interface CheckoutSummaryProps {
  planName: string;
  price: string;
  period: string;
  equity?: string;
  minInvestment?: number;
  campaignId: string;
}

export function CheckoutSummary({ planName, price, period, equity, minInvestment, campaignId }: CheckoutSummaryProps) {
  const navigate = useNavigate();

  return (
    <aside className="sticky top-28 space-y-8">
      <div className="bg-accent/20 rounded-[32px] p-8 lg:p-10 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 blur-[80px] rounded-full"></div>

        <h2 className="text-2xl font-black tracking-tighter text-foreground relative z-10 mb-10">Resumo do Pedido</h2>

          <div className="space-y-8 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <p className="font-black text-xl text-primary tracking-tight">{planName}</p>
              <p className="text-sm text-muted-foreground font-medium">
                {equity ? `Equity: ${equity}` : "Acesso completo à plataforma"}
              </p>
            </div>
            <p className="font-black text-lg text-foreground">{price}/{period}</p>
          </div>

          {minInvestment && (
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Investimento mínimo</p>
              <p className="text-lg font-black text-primary mt-1">
                R$ {minInvestment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          <div className="pt-8 space-y-6 border-t border-white/5">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cupom de Desconto</label>
              <div className="flex gap-3">
                <div className="relative flex-1 group">
                  <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-all"
                    placeholder="CUPOM10"
                    type="text"
                  />
                </div>
                <button className="px-6 py-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all active:scale-95 shadow-lg">
                  Aplicar
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground">{price}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-muted-foreground">
                <span>Taxas</span>
                <span className="text-primary-dim">R$ 0,00</span>
              </div>
              <div className="flex justify-between items-end pt-6 border-t border-white/5">
                <span className="font-black text-foreground text-xl">Total</span>
                <div className="text-right">
                  <p className="text-4xl font-black text-primary tracking-tighter drop-shadow-[0_0_15px_rgba(213,0,249,0.3)]">{price}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mt-1">Cobrança Mensal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/checkout/${campaignId}/pix`)}
          className="w-full kinetic-gradient text-black py-6 rounded-2xl font-black text-lg tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_12px_24px_rgba(213,0,249,0.3)] mt-10 relative z-10"
        >
          Finalizar Pagamento
        </button>

        <div className="bg-primary/5 p-5 rounded-2xl flex items-start gap-4 mt-8 border border-primary/10 relative z-10">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
            Ao finalizar, você concorda com nossos termos de uso. A renovação é automática a cada 30 dias, podendo ser cancelada a qualquer momento.
          </p>
        </div>
      </div>
    </aside>
  );
}
