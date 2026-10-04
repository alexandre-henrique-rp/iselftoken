import { Info } from "lucide-react";

/**
 * TermoAdesaoLegalBanner — aviso obrigatorio sobre validade juridica do termo.
 *
 * Exibe referencia a Lei nº 14.063/2020 (assinatura eletronica avancada) e
 * a tecnologia PAdES aplicada. Aparece entre o header editorial e o conteudo
 * do termo na rota `/founder/termo-adesao/texto`.
 *
 * Estilo coerente com o badge legal usado em `termo-adesao-section.tsx`
 * (mesma cor magenta accent + ghost-border), mas em formato "full width"
 * proprio para a pagina de leitura.
 */
export function TermoAdesaoLegalBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20"
          aria-hidden="true"
        >
          <Info className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            Assinatura eletronica avancada
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-on-surface">
            Este documento sera assinado eletronicamente com{" "}
            <strong className="font-bold text-primary-light">
              certificado digital X.509
            </strong>{" "}
            e assinatura{" "}
            <strong className="font-bold text-primary-light">PAdES</strong>{" "}
            (PDF Advanced Electronic Signature), produzindo plenos efeitos
            juridicos conforme{" "}
            <strong className="font-bold text-primary-light">
              Lei nº 14.063/2020
            </strong>
            . Leia atentamente antes de aceitar.
          </p>
        </div>
      </div>
    </div>
  );
}
