import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export function BusinessSummary() {
  return (
    <section className="space-y-12">
      <div className="space-y-6">
        <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-foreground">
          Resumo do negócio
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          O founder ainda não publicou um resumo executivo desta startup. Quando
          disponível, a descrição do problema, solução, modelo de receita e
          tamanho de mercado aparecem aqui.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 pt-4">
        <div className="space-y-8">
          <h3 className="text-primary font-bold tracking-[0.2em] uppercase text-xs">
            Proposta de Valor
          </h3>
          <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-foreground">
                  Análise da oportunidade
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Consulte os dados da campanha, os documentos autorizados e os
                  riscos antes de investir.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-accent/20 rounded-3xl p-8 border border-white/5">
          <h3 className="text-foreground font-black mb-4 text-lg">
            Próximos passos
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Caso o founder publique informações estratégicas (TAM/SAM/SOM,
            métricas de tração, etc.), elas serão exibidas neste espaço.
          </p>
        </div>
      </div>
    </section>
  );
}