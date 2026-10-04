import type { Route } from "./+types/admin-history";
import { historyLoader } from "./admin-history.server";
import { AdminHistoryHeader } from "~/components/admin/admin-history-header";
import { AdminHistoryFilters } from "~/components/admin/admin-history-filters";
import { AdminHistoryEmptyState } from "~/components/admin/admin-history-empty-state";
import { AdminHistoryTable } from "~/components/admin/admin-history-table";
import { AdminHistoryPagination } from "~/components/admin/admin-history-pagination";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Histórico de Transações | iSelfToken" },
    {
      name: "description",
      content: "Auditoria unificada de todas as transações e decisões.",
    },
  ];
}

export const loader = historyLoader;

export default function AdminHistoryPage({ loaderData }: Route.ComponentProps) {
  const { data, erro, qs } = loaderData;

  return (
    <div className="relative max-w-[1500px] mx-auto space-y-8">
      <AdminHistoryHeader qs={qs} />
      <AdminHistoryFilters qs={qs} facets={data?.facets} />

      {erro || !data || data.items.length === 0 ? (
        <AdminHistoryEmptyState erro={erro} />
      ) : (
        <>
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
            {data.total} evento(s) · página {data.page}/{data.totalPages}
          </p>
          <AdminHistoryTable items={data.items} />
          {data.totalPages > 1 && (
            <AdminHistoryPagination
              qs={qs}
              page={data.page}
              totalPages={data.totalPages}
            />
          )}
        </>
      )}
    </div>
  );
}
