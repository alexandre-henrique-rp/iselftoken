import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { Form, useNavigate } from "react-router";
import { formatBRLCompactWithCents } from "~/lib/currency-format";
import { cn } from "~/lib/utils";
import type { FinanceiroSplitRow } from "~/lib/queries";

interface FinanceiroSplitTableProps {
  rows: FinanceiroSplitRow[];
  total: number;
  pagina: number;
  pageSize: number;
  filters: {
    from?: string;
    to?: string;
    status?: string;
    search?: string;
  };
  onOpenDetail: (campaignId: number) => void;
}

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  FUNDED: {
    label: "FUNDED",
    tone: "bg-primary/10 text-primary border-primary/20",
  },
  PAID_OUT: {
    label: "PAID_OUT",
    tone: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  CLOSED: {
    label: "CLOSED",
    tone: "bg-white/5 text-muted-foreground border-white/10",
  },
  OPEN: {
    label: "OPEN",
    tone: "bg-warning/10 text-warning border-warning/20",
  },
  DRAFT: {
    label: "DRAFT",
    tone: "bg-white/5 text-muted-foreground border-white/10",
  },
  PAUSED: {
    label: "PAUSED",
    tone: "bg-white/5 text-muted-foreground border-white/10",
  },
};

/**
 * Tabela editorial de campanhas com breakdown do split financeiro.
 * Estilo consistente com admin-startup-table.tsx e admin-history-table.tsx.
 */
export function FinanceiroSplitTable({
  rows,
  total,
  pagina,
  pageSize,
  filters,
  onOpenDetail,
}: FinanceiroSplitTableProps) {
  const navigate = useNavigate();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goPage = (next: number) => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(next));
    navigate(`/admin/financeiro/split?${params.toString()}`);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/30 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-bold">Startup / Campanha</th>
              <th className="text-left px-4 py-3 font-bold">Status</th>
              <th className="text-right px-4 py-3 font-bold">Captado</th>
              <th className="text-right px-4 py-3 font-bold">Repasse (startup)</th>
              <th className="text-right px-4 py-3 font-bold">Lucro plataforma</th>
              <th className="text-right px-4 py-3 font-bold">Afiliado</th>
              <th className="text-right px-4 py-3 font-bold">Investidores</th>
              <th className="text-right px-4 py-3 font-bold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Nenhuma campanha encontrada com os filtros aplicados.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const badge = STATUS_LABEL[row.status] ?? {
                  label: row.status,
                  tone: "bg-white/5 text-muted-foreground border-white/10",
                };
                return (
                  <tr
                    key={row.campaignId}
                    className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">
                          {row.startupNome}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.campaignTitle}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
                          badge.tone,
                        )}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">
                      {formatBRLCompactWithCents(row.amountRaised)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-primary">
                      {formatBRLCompactWithCents(row.startupRepasseTotal)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">
                      {formatBRLCompactWithCents(row.platformRevenueTotal)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-muted-foreground">
                      {formatBRLCompactWithCents(row.affiliateCommissionTotal)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.investorsCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(row.campaignId)}
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-black/40 transition-colors"
                      >
                        Detalhe
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/5 bg-black/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Página <span className="font-mono font-bold">{pagina}</span> de{" "}
            <span className="font-mono font-bold">{totalPages}</span> ·{" "}
            <span className="font-mono">{total}</span> campanha(s)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => goPage(pagina - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-black/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Anterior
            </button>
            <button
              type="button"
              disabled={pagina >= totalPages}
              onClick={() => goPage(pagina + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-black/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Footer agregado — soma das colunas da página atual + botão de export.
 */
export function FinanceiroSplitTotals({
  totals,
}: {
  totals: {
    amountRaised: number;
    startupRepasseTotal: number;
    platformRevenueTotal: number;
    affiliateCommissionTotal: number;
    platformSpreadTotal: number;
    platformFeeTotal: number;
  };
}) {
  return (
    <div className="mt-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/85 to-card/60 p-4 sm:p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TotalsTile
          label="Captado"
          value={totals.amountRaised}
          tone="default"
        />
        <TotalsTile
          label="Repasse (startups)"
          value={totals.startupRepasseTotal}
          tone="primary"
        />
        <TotalsTile
          label="Lucro plataforma"
          value={totals.platformRevenueTotal}
          tone="default"
        />
        <TotalsTile
          label="Comissão afiliado"
          value={totals.affiliateCommissionTotal}
          tone="muted"
        />
      </div>
    </div>
  );
}

function TotalsTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "primary" | "muted";
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
        {label}
      </p>
      <p
        className={cn(
          "text-xl font-black tabular-nums tracking-tighter",
          tone === "primary" && "text-primary",
          tone === "muted" && "text-muted-foreground",
          tone === "default" && "text-foreground",
        )}
      >
        {formatBRLCompactWithCents(value)}
      </p>
    </div>
  );
}

/**
 * Botão de export CSV — reusa o BFF /api/admin/financeiro/split/:id/export.
 */
export function FinanceiroSplitExportButton({
  campaignId,
}: {
  campaignId: number;
}) {
  return (
    <a
      href={`/api/admin/financeiro/split/${campaignId}/export`}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-black/40 transition-colors"
    >
      <FileDown className="h-4 w-4" aria-hidden />
      Exportar CSV
    </a>
  );
}

/**
 * Re-export do Form para uso pelos componentes que importam daqui.
 */
export { Form };
