import { formatCurrencyBRL } from "~/lib/currency-format";

interface OfferSummaryCardProps {
  meta: number;
  adjustedTargetAmount: number;
  estimatedTokenCount: number;
  tokenPrice: number | null;
  valuation: number;
  equityPercent: number;
  equityAmount: number;
  reservationFee: number;
  /** Valor ORIGINAL (cheio) da reserva, antes do desconto. Quando > reservationFee
   *  exibe o preço cheio riscado + o valor pago em destaque (S18.6). */
  reservationFeeOriginal?: number | null;
  totalCheckout: number;
  /** Valor ORIGINAL (cheio) do checkout consolidado, antes do desconto. */
  totalCheckoutOriginal?: number | null;
  fastTrackFee?: number;
  flat?: boolean;
}

interface Row {
  id: string;
  label: string;
  value: string;
  strong?: boolean;
  hint?: string;
}

export function OfferSummaryCard({
  meta,
  adjustedTargetAmount,
  estimatedTokenCount,
  tokenPrice,
  valuation,
  equityPercent,
  equityAmount,
  reservationFee,
  reservationFeeOriginal,
  totalCheckout,
  totalCheckoutOriginal,
  fastTrackFee,
}: OfferSummaryCardProps) {
  const reservationHadDiscount =
    reservationFeeOriginal != null &&
    reservationFeeOriginal > reservationFee;
  const totalHadDiscount =
    totalCheckoutOriginal != null && totalCheckoutOriginal > totalCheckout;

  const rows: Row[] = [
    {
      id: "meta-requested",
      label: "Meta solicitada",
      value: formatCurrencyBRL(meta),
    },
    {
      id: "meta-adjusted",
      label: "Meta ajustada",
      value: formatCurrencyBRL(adjustedTargetAmount),
      strong: true,
    },
    {
      id: "tokens",
      label: "Tokens estimados",
      value: estimatedTokenCount.toLocaleString("pt-BR"),
    },
    {
      id: "token-price",
      label: "Preço por token",
      value: tokenPrice === null ? "—" : formatCurrencyBRL(tokenPrice),
    },
    {
      id: "valuation",
      label: "Valuation",
      value: formatCurrencyBRL(valuation),
    },
    {
      id: "equity",
      label: `Equity (${equityPercent.toFixed(2)}%)`,
      value: formatCurrencyBRL(equityAmount),
    },
    {
      id: "reservation",
      label: "Reserva",
      value: formatCurrencyBRL(reservationFee),
      hint: reservationHadDiscount
        ? `Original ${formatCurrencyBRL(reservationFeeOriginal!)}`
        : fastTrackFee
          ? "Reserva de tokens (sem Fast Track)"
          : undefined,
      strong: reservationHadDiscount,
    },
    {
      id: "total-checkout",
      label: "Total checkout",
      value: formatCurrencyBRL(totalCheckout),
      hint: totalHadDiscount
        ? `Original ${formatCurrencyBRL(totalCheckoutOriginal!)}`
        : undefined,
      strong: true,
    },
  ];

  return (
    <div className="glass-card rounded-3xl p-6 space-y-4">
      <h3 className="text-lg font-black italic tracking-tight">
        Resumo da oferta
      </h3>
      <dl className="space-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="text-right">
              {r.hint && (
                <span className="block text-[10px] text-muted-foreground/60 line-through">
                  {r.hint}
                </span>
              )}
              <span
                className={
                  r.strong
                    ? "font-black italic text-emerald-400 tabular-nums"
                    : r.id === "reservation" && r.hint
                      ? "font-black italic text-emerald-400 tabular-nums"
                      : "text-foreground/80 tabular-nums"
                }
              >
                {r.value}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[10px] text-muted-foreground/50 italic">
        Valores estimados. Confirmação final pela equipe iSelfToken.
      </p>
    </div>
  );
}
