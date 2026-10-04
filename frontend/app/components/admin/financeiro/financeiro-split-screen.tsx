import { useState } from "react";
import {
  FinanceiroSplitDetailModal,
} from "~/components/admin/financeiro/financeiro-split-detail-modal";
import {
  FinanceiroSplitFiltersBar,
} from "~/components/admin/financeiro/financeiro-split-filters";
import { FinanceiroSplitSkeleton } from "~/components/admin/financeiro/financeiro-split-skeleton";
import {
  FinanceiroSplitTable,
  FinanceiroSplitTotals,
} from "~/components/admin/financeiro/financeiro-split-table";
import { useFinanceiroSplitQuery } from "~/hooks/use-financeiro-split";
import type { FinanceiroSplitFilters } from "~/lib/queries";

interface FinanceiroSplitScreenProps {
  filters: FinanceiroSplitFilters;
}

/**
 * Tela principal de /admin/financeiro/split.
 * Auditoria do split financeiro (repasse × lucro plataforma) por campanha.
 */
export function FinanceiroSplitScreen({ filters }: FinanceiroSplitScreenProps) {
  const query = useFinanceiroSplitQuery(filters);
  const [detailId, setDetailId] = useState<number | null>(null);

  if (query.isLoading || query.isError || !query.data) {
    return <FinanceiroSplitSkeleton />;
  }

  const { data, totals, total, pagina, pageSize } = query.data;

  return (
    <div className="space-y-6">
      <FinanceiroSplitFiltersBar filters={filters} />

      <FinanceiroSplitTotals totals={totals} />

      <FinanceiroSplitTable
        rows={data}
        total={total}
        pagina={pagina}
        pageSize={pageSize}
        filters={filters}
        onOpenDetail={(id) => setDetailId(id)}
      />

      <FinanceiroSplitDetailModal
        campaignId={detailId}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
