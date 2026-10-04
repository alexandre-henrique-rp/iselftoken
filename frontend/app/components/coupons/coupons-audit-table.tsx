/** Tabela de auditoria administrativa do cupom. */

import { AlertCircle, RefreshCw } from "lucide-react";
import { useCouponAudit } from "~/hooks/use-coupon-audit";

interface CouponsAuditTableProps {
  couponId: number;
  enabled?: boolean;
}

export function CouponsAuditTable({
  couponId,
  enabled = true,
}: CouponsAuditTableProps) {
  const { data, isLoading, isError, refetch } = useCouponAudit(
    couponId,
    enabled,
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-label="Carregando auditoria">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-14 animate-pulse rounded-xl bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-destructive/10 p-6 text-center">
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
        <p className="text-sm text-foreground">
          Não foi possível carregar a auditoria.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-black"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data?.data.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma alteração administrativa registrada.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl outline outline-1 outline-white/10">
      <table
        className="w-full min-w-[620px] text-left text-sm"
        aria-label="Auditoria administrativa do cupom"
      >
        <thead className="bg-white/5 text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Quando</th>
            <th className="px-4 py-3 font-medium">Ator</th>
            <th className="px-4 py-3 font-medium">Ação</th>
            <th className="px-4 py-3 font-medium">IP redatado</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((entry, index) => (
            <tr
              key={`${entry.timestamp}-${entry.action}-${index}`}
              className="border-t border-white/5 text-foreground"
            >
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                {new Date(entry.timestamp).toLocaleString("pt-BR")}
              </td>
              <td className="px-4 py-3">
                <span className="block">{entry.actor}</span>
                {entry.actorId && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {entry.actorId.slice(0, 8)}…
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{humanizeAction(entry.action)}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {entry.ip ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
        <span>
          Página {data.page} de {data.totalPages}
        </span>
        <span>{data.total} registro(s)</span>
      </div>
    </div>
  );
}

function humanizeAction(action: string) {
  return action
    .replace(/^COUPON_/, "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
