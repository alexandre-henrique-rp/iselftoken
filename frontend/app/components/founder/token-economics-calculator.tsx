import type { UseFormReturn } from "react-hook-form";
import { Hourglass } from "lucide-react";
import { formatCurrencyBRL } from "~/lib/currency-format";
import { computeRoundMetrics } from "./new-startup-wizard.metrics";

interface TokenEconomicsCalculatorBaseProps {
  /** Preço do token. null = "aguardando precificação". */
  tokenPrice: number | null;
}

interface TokenEconomicsCalculatorCreateProps extends TokenEconomicsCalculatorBaseProps {
  mode?: "create";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  meta?: never;
  equity?: never;
}

interface TokenEconomicsCalculatorEditProps extends TokenEconomicsCalculatorBaseProps {
  mode: "edit";
  /** Valor atual da meta (R$ em número). */
  meta: number;
  /** Equity ofertado em % (0-100). */
  equity: number;
  form?: never;
}

type TokenEconomicsCalculatorProps =
  | TokenEconomicsCalculatorCreateProps
  | TokenEconomicsCalculatorEditProps;

export function TokenEconomicsCalculator(props: TokenEconomicsCalculatorProps) {
  const { tokenPrice } = props;
  // `mode` default is "create" when omitted (preserva o wizard).
  // No edit branch, props.meta/props.equity são `number` (non-nullable por tipo) —
  // sem fallback aqui; guardas `meta > 0` abaixo cuidam de zero/NaN.
  const meta = props.mode === "edit" ? props.meta : props.form.watch("metaCaptacao") ?? 0;
  const equity = props.mode === "edit" ? props.equity : props.form.watch("equityOferecido") ?? 0;

  if (tokenPrice == null) {
    return (
      <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-4">
        <header className="flex items-center gap-3">
          <Hourglass className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-black tracking-tight italic">Aguardando precificação</h2>
        </header>
        <p className="text-muted-foreground text-sm">
          A equipe iSelfToken define o preço do token desta startup. Os cálculos aparecem aqui assim que o preço for definido.
        </p>
      </section>
    );
  }

  // Fórmula canônica (computeRoundMetrics) — mesma usada pelo wizard de
  // cadastro e pela página de nova rodada. Substitui cálculo legado
  // `(adjustedTarget / equity) * 100` que produzia valuation pós-money
  // incorreta para equity < 50%.
  const { tokensCount, valuationPreMoney, equityPerToken } = computeRoundMetrics({
    targetAmount: meta,
    equityPercent: equity,
    tokenPrice,
    authFeePerToken: 0, // não aplicável neste calculo (sem taxa de reserva aqui)
  });

  // adjustedTarget usa o arredondamento para cima (Math.ceil) para refletir
  // o que de fato sera cobrado: tokens inteiros, nao fracionarios.
  const adjustedTarget = tokensCount * tokenPrice;
  // Valor monetario da equity oferecida: meta * equityPercent / 100.
  const equityAmount = meta > 0 && equity > 0 ? (meta * equity) / 100 : 0;

  const rows: [string, string][] = [
    ["Preço por token", formatCurrencyBRL(tokenPrice)],
    ["Tokens estimados", tokensCount.toLocaleString("pt-BR")],
    ["Meta ajustada", formatCurrencyBRL(adjustedTarget)],
    ["Valuation pré-money", formatCurrencyBRL(valuationPreMoney)],
    ["Equity em R$", formatCurrencyBRL(equityAmount)],
    ["Equity oferecida", `${equityPerToken.toFixed(2)}%`],
  ];

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-6">
      <header>
        <h2 className="text-2xl font-black tracking-tight italic">Token economics</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Valores calculados em tempo real conforme você ajusta meta e equity.
        </p>
      </header>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-black/30 border border-white/5 p-4">
            <dt className="label-tag">{label}</dt>
            <dd className="text-lg font-black italic text-foreground mt-1">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-[10px] text-muted-foreground/60 italic">
        Valores estimados — preço final do token sujeito a confirmação pela equipe iSelfToken.
      </p>
    </section>
  );
}
