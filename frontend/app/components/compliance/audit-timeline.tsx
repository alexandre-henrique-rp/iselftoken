import { ClipboardList, Clock, UserCircle } from "lucide-react";
import type { AuditLogEntry } from "~/lib/audit-types";

interface AuditTimelineProps {
  entries: AuditLogEntry[];
  /** Quando true, mostra apenas a coluna esquerda sem empilhar. */
  compact?: boolean;
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function actionTone(action: string): { tone: string; label: string } {
  const a = action.toUpperCase();
  if (a.includes("APPROVE") || a.includes("ACTIVAT") || a.includes("ACTIVATE"))
    return { tone: "emerald", label: "Aprovação" };
  if (a.includes("REJECT") || a.includes("DECLIN"))
    return { tone: "red", label: "Rejeição" };
  if (a.includes("CREATE") || a.includes("SUBMIT"))
    return { tone: "sky", label: "Criação" };
  if (a.includes("UPDATE") || a.includes("EDIT") || a.includes("PATCH"))
    return { tone: "amber", label: "Atualização" };
  if (a.includes("DELETE") || a.includes("REMOVE"))
    return { tone: "red", label: "Remoção" };
  return { tone: "muted", label: action };
}

function toneClasses(tone: string) {
  switch (tone) {
    case "emerald":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "red":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "sky":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "amber":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default:
      return "bg-white/5 text-muted-foreground border-white/10";
  }
}

/**
 * Timeline vertical de eventos de auditoria para uma entidade.
 * Usada em /compliance/startups/:id e /compliance/campaigns/:id.
 */
export function AuditTimeline({ entries, compact = false }: AuditTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-10 text-center border border-white/5">
        <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum evento de auditoria registrado para esta entidade.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 pl-6 border-l-2 border-white/10 ml-2">
      {entries.map((entry) => {
        const tone = actionTone(entry.action);
        return (
          <li key={entry.id} className="relative">
            <span
              className={
                "absolute -left-[33px] top-2 w-4 h-4 rounded-full border-2 " +
                toneClasses(tone.tone)
              }
            />
            <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border " +
                    toneClasses(tone.tone)
                  }
                >
                  {tone.label}
                </span>
                <code className="text-[10px] font-mono text-muted-foreground/70">
                  {entry.action}
                </code>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(entry.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserCircle className="w-3 h-3" />
                  {entry.userName ?? "Sistema"}
                </span>
                {entry.ip && (
                  <span className="text-[10px] font-mono text-muted-foreground/50">
                    IP {entry.ip}
                  </span>
                )}
              </div>
              {!compact && entry.newValue != null && (
                <details className="text-[10px] text-muted-foreground/80 mt-1">
                  <summary className="cursor-pointer hover:text-foreground/80 select-none">
                    Ver payload
                  </summary>
                  <pre className="mt-2 p-2 rounded-lg bg-black/30 border border-white/5 font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto">
                    {JSON.stringify(entry.newValue, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
