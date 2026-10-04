import { cn } from "~/lib/utils";

interface HistoryEvent {
  id: string;
  timestamp: string;
  category: string;
  type: string;
  action: string;
  status: string | null;
  amount: number | null;
  actor: { id: number; nome: string; email: string } | null;
  actorRole: string;
  startup: { id: number; nome: string } | null;
  description: string;
}

const CAT_UI: Record<string, string> = {
  INVESTIMENTO: "bg-primary/10 text-primary border-primary/20",
  PAGAMENTO: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  TOKEN: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  SAQUE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  AFILIACAO: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  COMISSAO: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  STARTUP: "bg-white/5 text-muted-foreground border-white/10",
  ADMIN: "bg-red-500/10 text-red-400 border-red-500/20",
  USUARIO: "bg-primary/10 text-primary border-primary/20",
  ASSINATURA: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  KYC: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const ROLE_UI: Record<string, string> = {
  INVESTIDOR: "text-primary",
  FUNDADOR: "text-amber-400",
  AFILIADO: "text-sky-400",
  ADMIN: "text-red-400",
  SISTEMA: "text-muted-foreground",
};

const brl = (v: number | null) =>
  v == null
    ? ""
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);

const dt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export function AdminHistoryTable({ items }: { items: HistoryEvent[] }) {
  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 overflow-x-auto">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-[110px_120px_1.6fr_1.1fr_1fr_0.9fr] gap-4 px-6 py-4 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          <span>Data</span>
          <span>Categoria</span>
          <span>Ação</span>
          <span>Ator</span>
          <span>Startup</span>
          <span className="text-right">Valor / Status</span>
        </div>
        {items.map((e) => (
          <div
            key={e.id}
            className="grid grid-cols-[110px_120px_1.6fr_1.1fr_1fr_0.9fr] gap-4 px-6 py-4 border-b border-white/5 last:border-0 items-start hover:bg-white/[0.02]"
          >
            <span className="text-[11px] text-muted-foreground tabular-nums pt-0.5">
              {dt(e.timestamp)}
            </span>
            <span>
              <span
                className={cn(
                  "inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border",
                  CAT_UI[e.category] ??
                    "bg-white/5 text-muted-foreground border-white/10",
                )}
              >
                {e.category}
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{e.action}</p>
              <p className="text-[11px] text-muted-foreground/70 leading-snug mt-0.5 line-clamp-2">
                {e.description}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                {e.actor?.nome ?? "—"}
              </p>
              <p
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest mt-0.5",
                  ROLE_UI[e.actorRole] ?? "text-muted-foreground",
                )}
              >
                {e.actorRole}
              </p>
            </div>
            <span className="text-xs text-muted-foreground italic truncate pt-0.5">
              {e.startup?.nome ?? "—"}
            </span>
            <div className="text-right">
              {e.amount != null && (
                <p className="text-sm font-black text-foreground tabular-nums">
                  {brl(e.amount)}
                </p>
              )}
              {e.status && (
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                  {e.status}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
