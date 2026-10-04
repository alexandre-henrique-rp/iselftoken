import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";
import { useFinanceiroSplitDetailQuery } from "~/hooks/use-financeiro-split";
import { formatBRLCompactWithCents } from "~/lib/currency-format";
import type { FinanceiroSplitInvestment } from "~/lib/queries";
import { cn } from "~/lib/utils";

interface FinanceiroSplitDetailModalProps {
  campaignId: number | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Modal/drawer de detalhe do split financeiro de uma campanha.
 * Lista os investments CONFIRMED com seus snapshots do split.
 */
export function FinanceiroSplitDetailModal({
  campaignId,
  open,
  onClose,
}: FinanceiroSplitDetailModalProps) {
  const query = useFinanceiroSplitDetailQuery(campaignId);

  // Esc fecha o modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !campaignId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalhe do split financeiro"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-white/10 rounded-t-2xl md:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-black/40 text-foreground hover:bg-black/60 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>

        <div className="p-6 md:p-8 space-y-6">
          {query.isLoading && (
            <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
              Carregando detalhe...
            </div>
          )}

          {query.isError && (
            <p className="text-sm text-destructive">
              Falha ao carregar detalhe do split.
            </p>
          )}

          {query.data && (
            <>
              <header className="space-y-2 pr-12">
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">
                  {query.data.campaign.status}
                </p>
                <h2 className="text-2xl font-black tracking-tighter text-foreground">
                  {query.data.campaign.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {query.data.campaign.startup.nome} ·{" "}
                  {query.data.campaign.tokensSold}/
                  {query.data.campaign.totalTokens} tokens vendidos
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Link
                    to={`/admin/startups/${query.data.campaign.startup.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-black/50 transition-colors"
                  >
                    Ver startup
                    <ExternalLink className="w-3 h-3" aria-hidden />
                  </Link>
                  <a
                    href={`/api/admin/financeiro/split/${campaignId}/export`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/15 transition-colors"
                  >
                    <Download className="w-3 h-3" aria-hidden />
                    Exportar CSV
                  </a>
                </div>
              </header>

              <BreakdownBlock
                breakdown={query.data.breakdown}
                targetAmount={query.data.campaign.targetAmount}
              />

              <InvestmentList investments={query.data.investments} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BreakdownBlock({
  breakdown,
  targetAmount,
}: {
  breakdown: {
    amountRaised: number;
    startupRepasseTotal: number;
    platformSpreadTotal: number;
    platformFeeTotal: number;
    platformRevenueTotal: number;
    affiliateCommissionTotal: number;
    investorsCount: number;
  };
  targetAmount: number;
}) {
  const rows: Array<{
    label: string;
    value: number;
    tone: "default" | "primary" | "muted";
  }> = [
    { label: "Meta da campanha", value: targetAmount, tone: "muted" },
    { label: "Captado (subtotal)", value: breakdown.amountRaised, tone: "default" },
    {
      label: "Repasse às startups",
      value: breakdown.startupRepasseTotal,
      tone: "primary",
    },
    {
      label: "Spread (markup venda-base)",
      value: breakdown.platformSpreadTotal,
      tone: "default",
    },
    {
      label: "Taxa da plataforma",
      value: breakdown.platformFeeTotal,
      tone: "default",
    },
    {
      label: "Lucro plataforma (spread + taxa)",
      value: breakdown.platformRevenueTotal,
      tone: "default",
    },
    {
      label: "Comissão afiliado",
      value: breakdown.affiliateCommissionTotal,
      tone: "muted",
    },
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4">
        Breakdown agregado
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-b border-white/5 pb-2"
          >
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                "text-sm font-bold tabular-nums font-mono",
                row.tone === "primary" && "text-primary",
                row.tone === "muted" && "text-muted-foreground",
                row.tone === "default" && "text-foreground",
              )}
            >
              {formatBRLCompactWithCents(row.value)}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <dt className="text-xs text-muted-foreground">Investidores únicos</dt>
          <dd className="text-sm font-bold tabular-nums font-mono text-foreground">
            {breakdown.investorsCount}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function InvestmentList({
  investments,
}: {
  investments: FinanceiroSplitInvestment[];
}) {
  if (investments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum investimento CONFIRMED encontrado.
      </p>
    );
  }
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
        Investments CONFIRMED ({investments.length})
      </h3>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-black/30 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Investidor</th>
              <th className="text-right px-3 py-2 font-bold">Qtd</th>
              <th className="text-right px-3 py-2 font-bold">Subtotal</th>
              <th className="text-right px-3 py-2 font-bold">Repasse</th>
              <th className="text-right px-3 py-2 font-bold">Lucro plat.</th>
              <th className="text-right px-3 py-2 font-bold">Afiliado</th>
              <th className="text-right px-3 py-2 font-bold">Total cobrado</th>
              <th className="text-right px-3 py-2 font-bold">Pago em</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((inv) => (
              <tr
                key={inv.id}
                className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-3 py-2">
                  <div className="font-semibold text-foreground">
                    {inv.userNome}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {inv.userPublicId}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{inv.tokensQty}</td>
                <td className="px-3 py-2 text-right tabular-nums font-mono">
                  {formatBRLCompactWithCents(inv.tokenSubtotal)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-mono text-primary">
                  {formatBRLCompactWithCents(inv.startupRepasseAmount)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-mono">
                  {formatBRLCompactWithCents(inv.platformRevenueAmount)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-mono text-muted-foreground">
                  {formatBRLCompactWithCents(inv.affiliateCommissionAmount)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-mono">
                  {formatBRLCompactWithCents(inv.totalCharged)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
