import { Ban, Calendar, CheckCircle2, Clock, FileText } from "lucide-react";
import type { DocumentRequestItem } from "~/lib/document-request-types";
import { cn } from "~/lib/utils";

interface DocumentRequestsListProps {
  requests: DocumentRequestItem[];
  onCancel?: (id: number) => void;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_UI: Record<
  DocumentRequestItem["status"],
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  PENDING: {
    label: "Pendente",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Clock,
  },
  FULFILLED: {
    label: "Atendida",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  EXPIRED: {
    label: "Expirada",
    className: "bg-white/5 text-muted-foreground border-white/10",
    icon: Clock,
  },
  CANCELED: {
    label: "Cancelada",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: Ban,
  },
};

/**
 * Lista de solicitações de documentos para uma startup (compliance view).
 * Mostra tipo, descrição, status, prazo e ação de cancelar (apenas PENDING).
 */
export function DocumentRequestsList({ requests, onCancel }: DocumentRequestsListProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-accent/10 py-10 text-center">
        <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhuma solicitação de documento extra para esta startup.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const ui = STATUS_UI[req.status];
        const Icon = ui.icon;
        const canCancel = req.status === "PENDING";
        return (
          <div
            key={req.id}
            className="glass-panel rounded-2xl p-4 border border-white/5 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0",
                    ui.className,
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {ui.label}
                </span>
                <code className="text-[10px] font-mono text-muted-foreground/70 truncate">
                  {req.type}
                </code>
              </div>
              {canCancel && onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(req.id)}
                  className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-1.5 shrink-0"
                  title="Cancelar solicitação"
                >
                  <Ban className="w-3 h-3" /> Cancelar
                </button>
              )}
            </div>
            <p className="text-sm text-foreground">{req.description}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground/80">
              {req.deadline && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Prazo: {formatDate(req.deadline)}
                </span>
              )}
              <span>Solicitada em {formatDateTime(req.createdAt)}</span>
              {req.requestedByName && (
                <span>por {req.requestedByName}</span>
              )}
              {req.fulfilledDocId && (
                <span className="text-emerald-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Doc: {req.fulfilledDocName ?? `#${req.fulfilledDocId}`}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
