import type { Route } from "./+types/financeiro-withdraws";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";
const PAGE_LIMIT = 25;

const brl = (v: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const STATUS_UI: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PROCESSING: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  REQUESTED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};
const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Concluído", PROCESSING: "Processando", REQUESTED: "Solicitado", REJECTED: "Rejeitado",
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "Financeiro · Saques | iSelfToken" }, { name: "description", content: "Saques e repasses às startups." }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const cookie = request.headers.get("cookie") || "";
  try {
    const res = await fetch(`${BACKEND_URL}/admin/financeiro/withdrawals?page=${page}`, {
      headers: { accept: "application/json", cookie },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const total = json.total ?? 0;
    return {
      data: json.data ?? [],
      pagination: { page: json.pagina ?? Number(page), limit: PAGE_LIMIT, total, totalPages: Math.max(1, Math.ceil(total / PAGE_LIMIT)) },
    };
  } catch {
    return { data: [], pagination: { page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 0 } };
  }
}

export default function FinanceiroWithdrawsPage({ loaderData }: Route.ComponentProps) {
  const { data, pagination } = loaderData;
  const [sp, setSp] = useSearchParams();
  const goToPage = (p: number) => { const n = new URLSearchParams(sp); n.set("page", String(p)); setSp(n, { replace: true }); };
  const primeiro = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const ultimo = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-baseline gap-6">
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">Financeiro</span>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-foreground leading-none">Saques</h1>
        </div>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">{pagination.total.toLocaleString("pt-BR")} saques</p>
      </header>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40 backdrop-blur-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-accent/20 border-b border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                <th className="px-8 py-6">ID</th><th className="px-8 py-6">Startup</th><th className="px-8 py-6 text-right">Valor</th>
                <th className="px-8 py-6">Banco</th><th className="px-8 py-6 text-center">Status</th><th className="px-8 py-6">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-16 text-center text-sm font-medium text-muted-foreground/60">Nenhum saque encontrado.</td></tr>
              ) : data.map((w: any) => (
                <tr key={w.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-8 py-6 font-mono text-primary/80 text-xs font-bold">#{String(w.id).padStart(6, "0")}</td>
                  <td className="px-8 py-6 font-black text-foreground italic">{w.startup?.nome ?? "—"}</td>
                  <td className="px-8 py-6 text-right font-mono font-black text-foreground">{brl(w.amount)}</td>
                  <td className="px-8 py-6 text-xs font-bold text-muted-foreground/70">{w.bankInfo?.banco ? `Banco ${w.bankInfo.banco}` : "—"}{w.txIdBancario ? ` · ${w.txIdBancario}` : ""}</td>
                  <td className="px-8 py-6 text-center"><span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border", STATUS_UI[w.status] ?? "bg-white/5 text-muted-foreground border-white/10")}>{STATUS_LABEL[w.status] ?? w.status}</span></td>
                  <td className="px-8 py-6 text-xs font-bold text-muted-foreground/60">{dateFmt.format(new Date(w.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="px-8 py-6 flex items-center justify-between border-t border-white/5 bg-white/1">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Exibindo <span className="text-foreground">{primeiro}–{ultimo}</span> de <span className="text-foreground">{pagination.total.toLocaleString("pt-BR")}</span></span>
          <nav className="flex items-center gap-3">
            <button type="button" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent/40 border border-white/10 text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary transition-all"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex items-center gap-1.5"><span className="px-3 h-9 flex items-center justify-center rounded-xl bg-primary text-black font-black text-xs">{pagination.page}</span><span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">de {pagination.totalPages}</span></div>
            <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => goToPage(pagination.page + 1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent/40 border border-white/10 text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary transition-all"><ChevronRight className="w-4 h-4" /></button>
          </nav>
        </footer>
      </div>
    </div>
  );
}
