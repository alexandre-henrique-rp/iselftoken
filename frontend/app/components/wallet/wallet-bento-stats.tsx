/**
 * WalletBentoStats — Layout Bento responsivo para destaque de metricas no
 * topo das paginas de carteira.
 *
 * Comportamento por breakpoint (decisao 2026-09-06):
 * - < md: 1-col stack (hero em cima, KPIs embaixo)
 * - md: 2-cols — hero ocupa a linha inteira (col-span-2), KPIs 2 ou 3-cols
 *   na proxima linha. Ganha densidade em tablets sem ficar monótono.
 * - lg+: 5-cols (hero 2/5 + bloco de KPIs 3/5) — layout editorial original.
 *
 * Grid interno dos KPIs (decisao 2026-09-06):
 * - 3 cards: `grid-cols-3` (1 linha × 3 colunas) — padrao `/wallet` investidor
 * - 4 cards: `grid-cols-2` (2 linhas × 2 colunas) — usado quando afiliado
 *   adiciona card "Comissoes de Afiliado"
 *
 * Tamanho dos cards (decisao 2026-09-06 — feedback "diminuir o tamanho"):
 * - padding `p-4` (era `p-6`)
 * - icone `h-8 w-8` (era `h-9 w-9`)
 * - valor `text-xl` (era `text-2xl`)
 * - hint `text-[11px]` (era `text-xs`)
 *
 * Variantes:
 * - "hero-left": hero a esquerda + KPIs a direita (padrao)
 * - "hero-right": KPIs a esquerda + hero a direita
 */

import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

type Tone = "primary" | "emerald" | "amber" | "sky" | "neutral";

interface StatCard {
  /** Rótulo em uppercase tracking-widest. */
  label: string;
  /** Conteúdo do valor principal (string JSX, número formatado, etc). */
  value: ReactNode;
  /** Conteúdo opcional exibido abaixo do valor (ex: subtítulo explicativo). */
  hint?: ReactNode;
  /** Ações (botões) exibidas na base do card. Renderizado via mt-auto. */
  actions?: ReactNode;
  /** Cor de destaque (para ícones e bordas). */
  tone?: Tone;
}

interface WalletBentoStatsProps {
  /** Card hero (col-span 2 ou 1). Opcional — quando omitido, o summary
   *  ocupa toda a largura do container (util para paginas com 3 KPIs). */
  hero?: StatCard;
  /** Cards secundários (1 a 4 cartões dispostos em grid). Aceita array de
   *  qualquer comprimento — o grid interno se adapta automaticamente:
   *  - 1 card: 1-col
   *  - 2 cards: 2-cols
   *  - 3 cards: 3-cols
   *  - 4+ cards: 2-cols */
  summary: StatCard[];
  /** Layout: `hero-left` (hero ocupa 2 cols à esquerda) ou `hero-right` (hero à direita). */
  layout?: "hero-left" | "hero-right";
}

const TONE_MAP: Record<Tone, { bg: string; text: string; border: string }> = {
  primary: {
    bg: "bg-primary/15",
    text: "text-primary",
    border: "border-primary/30",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
  },
  neutral: {
    bg: "bg-white/[0.04]",
    text: "text-on-surface",
    border: "border-white/10",
  },
};

function BentoSummaryCard({ card }: { card: StatCard }) {
  const tone = TONE_MAP[card.tone ?? "neutral"];
  return (
    <div className="glass-panel rounded-xl border border-white/5 p-4 flex flex-col gap-2.5 h-full min-w-0">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center",
            tone.bg,
            tone.text,
          )}
        >
          <span className="text-[11px] font-black">
            {card.label.charAt(0)}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] leading-tight text-on-surface-variant font-black truncate">
          {card.label}
        </span>
      </div>
      <p className="text-xl font-black tracking-tight text-on-surface truncate">
        {card.value}
      </p>
      {card.hint && (
        <p className="text-[11px] text-on-surface-variant leading-snug mt-auto">
          {card.hint}
        </p>
      )}
      {card.actions && <div className="mt-auto">{card.actions}</div>}
    </div>
  );
}

export function WalletBentoStats({
  hero,
  summary,
  layout = "hero-left",
}: WalletBentoStatsProps) {
  const isHeroRight = layout === "hero-right";
  // < md: 1-col (hero e KPIs empilhados). md: 2-cols (hero full-row). lg+: 5-cols.
  const heroCol = cn(
    "col-span-1 md:col-span-2",
    isHeroRight
      ? "lg:col-span-2 lg:order-2"
      : "lg:col-span-2 lg:order-1",
  );
  // Grid interno dos KPIs adapta-se ao numero de cards:
  // 1 card -> 1-col, 2 cards -> 2-cols, 3 cards -> 3-cols, 4+ cards -> 2-cols.
  const summaryGridCols =
    summary.length >= 4
      ? "sm:grid-cols-2"
      : summary.length === 3
        ? "sm:grid-cols-3"
        : summary.length === 2
          ? "sm:grid-cols-2"
          : "sm:grid-cols-1";
  const summaryCol = cn(
    "col-span-1 md:col-span-2 grid grid-cols-1 gap-3 auto-rows-fr",
    summaryGridCols,
    isHeroRight
      ? "lg:col-span-3 lg:order-1"
      : "lg:col-span-3 lg:order-2",
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8 md:mb-10">
      {/* Hero card (opcional — quando ausente, summary ocupa toda a largura) */}
      {hero && (
        <div
          className={`${heroCol} glass-panel p-5 md:p-6 rounded-xl flex flex-col justify-between h-56 border-none relative overflow-hidden`}
        >
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">
              {hero.label}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-on-surface tracking-tighter mt-3">
              {hero.value}
            </h2>
            {hero.hint && (
              <p className="text-[11px] text-on-surface-variant mt-2 leading-snug">{hero.hint}</p>
            )}
          </div>
          {hero.actions && (
            <div className="relative z-10 flex flex-col gap-2 w-full">
              {hero.actions}
            </div>
          )}
        </div>
      )}

      {/* Summary grid — ocupa toda a largura quando hero eh omitido */}
      <div className={hero ? summaryCol : cn(summaryCol, "md:col-span-2 lg:col-span-5")}>
        {summary.map((card, idx) => (
          <BentoSummaryCard key={idx} card={card} />
        ))}
      </div>
    </div>
  );
}
