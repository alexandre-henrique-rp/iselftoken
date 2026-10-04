import { Sliders, Settings2 } from "lucide-react";

/**
 * Header editorial da página /admin/config.
 * Exibe o título + descrição contextual com iconografia consistente.
 */
export function AdminConfigHeader() {
  return (
    <header className="mb-10 sm:mb-12 space-y-4">
      <div className="flex items-center gap-4">
        <span className="w-12 h-px bg-primary" />
        <span className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">
          Admin
        </span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none flex items-center gap-3">
            <Settings2
              className="w-10 h-10 text-primary shrink-0"
              aria-hidden
            />
            Configurações
          </h1>
          <p className="text-muted-foreground text-sm mt-3 max-w-2xl leading-relaxed">
            Taxas, percentuais e limites usados nos cálculos. Cada alteração
            passa a valer a partir da data definida e{" "}
            <span className="text-foreground font-bold">
              não altera cálculos já realizados
            </span>{" "}
            — versões anteriores ficam preservadas.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/30 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">
          <Sliders className="w-3 h-3 text-primary" aria-hidden />
          Vigência por data
        </div>
      </div>
    </header>
  );
}
