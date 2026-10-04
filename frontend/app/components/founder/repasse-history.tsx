import { History } from "lucide-react";
import {
  INSTALLMENT_STATUS_LABELS,
  type InstallmentRequest,
  type InstallmentRequestStatus,
} from "~/types/repasse";

const REQUEST_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Solicitada",
  APPROVED: "Aprovada",
  PROCESSING: "Em processamento",
  COMPLETED: "Concluída",
  REJECTED: "Rejeitada",
};

function statusLabel(status: InstallmentRequestStatus): string {
  return REQUEST_STATUS_LABELS[status] ?? INSTALLMENT_STATUS_LABELS[status as unknown as keyof typeof INSTALLMENT_STATUS_LABELS] ?? status;
}

function formatDateBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export interface RepasseHistoryProps {
  solicitacoes: InstallmentRequest[];
  /** Numero maximo exibido. Default 5. */
  limit?: number;
}

/**
 * @description Tabela compacta com as ultimas solicitacoes de uma startup.
 * Exibe installment #, data, status e valor. Limitado por `limit`.
 */
export function RepasseHistory({ solicitacoes, limit = 5 }: RepasseHistoryProps) {
  const items = [...solicitacoes]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, limit);

  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border/40 p-4 text-sm text-muted-foreground"
        data-testid="repasse-history-empty"
      >
        Nenhuma solicitacao registrada ainda.
      </div>
    );
  }

  return (
    <section
      className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden"
      data-testid="repasse-history"
    >
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <History className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Ultimas solicitacoes
        </h3>
      </header>
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr className="border-b border-border/40">
            <th className="px-4 py-2 text-left">#</th>
            <th className="px-4 py-2 text-left">Data</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-right">Valor</th>
            <th className="px-4 py-2 text-center">Tentativa</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr
              key={r.id}
              data-testid={`history-row-${r.id}`}
              className="border-b border-border/30 hover:bg-accent/10"
            >
              <td className="px-4 py-2 font-bold tabular-nums">#{r.installmentId}</td>
              <td className="px-4 py-2 tabular-nums">{formatDateBR(r.submittedAt)}</td>
              <td className="px-4 py-2">
                <span className="rounded-full bg-accent/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                  {statusLabel(r.status)}
                </span>
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                R$ {Number(r.valorSolicitado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-2 text-center tabular-nums">#{r.attemptNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
