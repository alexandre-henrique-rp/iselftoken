import type { UseFormReturn } from "react-hook-form";
import { Pencil } from "lucide-react";
import { formatCurrencyBRL } from "~/lib/currency-format";
import { computeRoundMetrics } from "./new-startup-wizard.metrics";

interface ReviewAccordionProps {
  form: UseFormReturn<any>;
  logoFile: File | null;
  pitchDeckFile: File | null;
  onEditStep: (step: number) => void;
  tokenPrice: number | null;
}

const truncate = (s: string, n = 200) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function ReviewAccordion({ form, logoFile, pitchDeckFile, onEditStep, tokenPrice }: ReviewAccordionProps) {
  const v = form.getValues();
  const price = tokenPrice ?? 0;
  const metaCaptacao = Number(v.metaCaptacao) || 0;
  const equityOferecido = Number(v.equityOferecido) || 0;

  // Fórmula canônica — mesma usada pelo wizard e pela página de nova rodada.
  // Substitui cálculo legado `(adjusted / equity) * 100` que produzia valuation
  // pós-money incorreta para equity < 50%.
  const { tokensCount, valuationPreMoney } = computeRoundMetrics({
    targetAmount: metaCaptacao,
    equityPercent: equityOferecido,
    tokenPrice: price,
    authFeePerToken: 0,
  });
  const adjusted = tokensCount * price;

  const groups = [
    {
      title: "Identidade",
      step: 1,
      rows: [
        ["CNPJ", v.cnpj || "—"],
        ["Razão Social", v.razaoSocial || "—"],
        ["Nome Fantasia", v.nomeFantasia || "—"],
        ["País", v.paisIso3 || "—"],
        ["Área", v.areaAtuacao || "—"],
        ["Estágio", v.estagio || "—"],
        ["Descrição", truncate(v.descricao ?? "")],
      ] as [string, string][],
    },
    {
      title: "Oferta",
      step: 2,
      rows: [
        ["Meta ajustada", formatCurrencyBRL(adjusted)],
        ["Equity", `${v.equityOferecido}%`],
        ["Prazo", `${v.prazoCaptacao} dias`],
        ["Tokens estimados", tokensCount.toLocaleString("pt-BR")],
        ["Valuation pré-money", formatCurrencyBRL(valuationPreMoney)],
      ] as [string, string][],
    },
    {
      title: "Mídias & Social",
      step: 3,
      rows: [
        ["Logo", logoFile?.name ?? "Não enviada"],
        ["Pitch Deck", pitchDeckFile?.name ?? "Não enviado"],
        ["Vídeo", v.videoPitch || "—"],
        ["Website", v.website || "—"],
        ["LinkedIn", v.linkedin || "—"],
      ] as [string, string][],
    },
  ];

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-6">
      <header>
        <h2 className="text-2xl font-black tracking-tight italic">Revisão final</h2>
        <p className="text-muted-foreground text-sm mt-1">Confirme os dados antes de criar a startup.</p>
      </header>
      <div className="space-y-4">
        {groups.map((g) => (
          <details key={g.title} open className="rounded-2xl bg-black/30 border border-white/5 group">
            <summary className="cursor-pointer flex items-center justify-between px-5 py-4 list-none">
              <span className="text-sm font-black uppercase tracking-widest text-primary">{g.title}</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onEditStep(g.step); }}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Editar
              </button>
            </summary>
            <dl className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {g.rows.map(([k, val]) => (
                <div key={k}>
                  <dt className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">{k}</dt>
                  <dd className="text-sm text-foreground mt-0.5">{val}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
    </section>
  );
}
