import { StartupGridCard } from "./startup-grid-card";
import type { Startup } from "./startup-card";

interface StartupKanbanBoardProps {
  startups: Startup[];
}

type ColumnKey =
  | "draft"
  | "analysis"
  | "open"
  | "paused"
  | "closed"
  | "funded"
  | "paid_out";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  accent: string;
}

const COLUMNS: ReadonlyArray<ColumnDef> = [
  { key: "draft", label: "Rascunho", accent: "text-muted-foreground" },
  { key: "analysis", label: "Em análise", accent: "text-amber-400" },
  { key: "open", label: "Aberta", accent: "text-primary" },
  { key: "paused", label: "Pausada", accent: "text-amber-400" },
  { key: "closed", label: "Encerrada", accent: "text-red-400" },
  { key: "funded", label: "Financiada", accent: "text-primary" },
  { key: "paid_out", label: "Paga", accent: "text-primary" },
];

export function StartupKanbanBoard({ startups }: StartupKanbanBoardProps) {
  const grouped: Record<ColumnKey, Startup[]> = {
    draft: [],
    analysis: [],
    open: [],
    paused: [],
    closed: [],
    funded: [],
    paid_out: [],
  };
  for (const s of startups) {
    if (s.campaignStatus in grouped) {
      grouped[s.campaignStatus].push(s);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {COLUMNS.map((col) => (
        <section
          key={col.key}
          className="bg-accent/10 rounded-2xl border border-white/5 p-4 flex flex-col gap-3"
        >
          <header className="flex items-center justify-between px-1">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${col.accent}`}>
              {col.label}
            </h3>
            <span className="text-[10px] font-black tabular-nums text-muted-foreground bg-black/20 px-2 py-0.5 rounded-full">
              {grouped[col.key].length}
            </span>
          </header>
          <div className="flex flex-col gap-2.5">
            {grouped[col.key].length === 0 ? (
              <div className="text-center py-8 px-3 rounded-xl border border-dashed border-white/10 text-[11px] text-muted-foreground/60 font-medium">
                Sem startups nesta etapa
              </div>
            ) : (
              grouped[col.key].map((s) => <StartupGridCard key={s.id} startup={s} compact />)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
