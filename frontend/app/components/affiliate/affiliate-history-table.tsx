import { cn } from "~/lib/utils";

type Status = "PENDING_FOUNDER" | "PENDING_ADMIN" | "ACTIVE" | "REJECTED" | "SUSPENDED";

interface HistoryRow {
  id: number;
  user: { nome: string; email: string };
  startup: { nome: string };
  tokensAllocated: number | null;
  code: string;
  status: Status;
}

const STATUS_UI: Record<Status, { label: string; className: string }> = {
  PENDING_FOUNDER: {
    label: "Aguardando você",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  PENDING_ADMIN: {
    label: "Encaminhada à iSelfToken",
    className: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  ACTIVE: {
    label: "Ativo",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  REJECTED: {
    label: "Rejeitado",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  SUSPENDED: {
    label: "Suspenso",
    className: "bg-white/5 text-muted-foreground border-white/10",
  },
};

/**
 * Tabela compacta do histórico de afiliações decididas.
 */
export function AffiliateHistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <section className="space-y-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
        Histórico ({rows.length})
      </h2>
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
        <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr] gap-4 px-6 py-4 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          <span>Afiliado</span>
          <span>Startup</span>
          <span>Tokens</span>
          <span>Código</span>
          <span className="text-right">Status</span>
        </div>
        {rows.map((a) => {
          const ui = STATUS_UI[a.status];
          return (
            <div
              key={a.id}
              className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr] gap-4 px-6 py-4 border-b border-white/5 last:border-0 items-center"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {a.user.nome}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {a.user.email}
                </p>
              </div>
              <span className="text-xs text-muted-foreground italic truncate">
                {a.startup.nome}
              </span>
              <span className="text-xs font-bold text-foreground">
                {a.tokensAllocated ?? "—"}
              </span>
              <span className="text-[10px] font-mono text-primary">{a.code}</span>
              <div className="text-right">
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    ui.className,
                  )}
                >
                  {ui.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
