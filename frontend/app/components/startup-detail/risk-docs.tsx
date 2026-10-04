import React from "react";
import { AlertTriangle, FileText } from "lucide-react";

export function RiskDocs() {
  return (
    <section className="grid md:grid-cols-2 gap-12 lg:gap-16">
      <div className="space-y-8">
        <h3 className="text-2xl lg:text-3xl font-black tracking-tighter text-foreground">
          Categorias de Risco
        </h3>
        <div className="glass-panel rounded-2xl p-8 border border-white/5 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-bold text-foreground">
            Riscos ainda não publicados
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            O founder ainda não cadastrou as categorias de risco desta startup.
            Quando publicado, cada risco aparece como card categorizado.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-2xl lg:text-3xl font-black tracking-tighter text-foreground">
          Documentação
        </h3>
        <div className="bg-accent/20 rounded-3xl p-6 lg:p-8 border border-white/5 text-center space-y-3">
          <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-bold text-foreground">
            Nenhum documento publicado
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Pitch deck, planilha de valuation, term sheet e outros documentos
            aparecem aqui assim que forem anexados pelo founder.
          </p>
        </div>
      </div>
    </section>
  );
}