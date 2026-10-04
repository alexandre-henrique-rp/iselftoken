import type { Route } from "./+types/financeiro-investments";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";
const PAGE_LIMIT = 25;

const brl = (v: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const STATUS_UI: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CANCELED: "bg-red-500/10 text-red-400 border-red-500/20",
  REFUNDED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};
const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmado", PENDING: "Pendente", CANCELED: "Cancelado", REFUNDED: "Estornado",
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "Financeiro · Investimentos | iSelfToken" }, { name: "description", content: "Investimentos da plataforma." }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const cookie = request.headers.get("cookie") || "";
  try {
    const res = await fetch(`${BACKEND_URL}/admin/financeiro/investments?page=${page}`, {
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

export default function FinanceiroInvestmentsPage({ loaderData }: Route.ComponentProps) {
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
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-foreground leading-none">Investimentos</h1>
        </div>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">{pagination.total.toLocaleString("pt-BR")} investimentos</p>
      </header>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40 backdrop-blur-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-accent/20 border-b border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                <th className="px-8 py-6">ID</th><th className="px-8 py-6">Investidor</th><th className="px-8 py-6">Startup</th>
                <th className="px-8 py-6 text-right">Tokens</th><th className="px-8 py-6 text-right">Cobrado</th>
                <th className="px-8 py-6 text-right">Repasse startup</th><th className="px-8 py-6 text-right">Receita plataforma</th>
                <th className="px-8 py-6 text-center">Status</th><th className="px-8 py-6">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.length === 0 ? (
                <tr><td colSpan={9} className="px-8 py-16 text-center text-sm font-medium text-muted-foreground/60">Nenhum investimento encontrado.</td></tr>
              ) : data.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-8 py-6 font-mono text-primary/80 text-xs font-bold">#{String(inv.id).padStart(6, "0")}</td>
                  <td className="px-8 py-6"><span className="font-black text-foreground italic">{inv.userName ?? "—"}</span><br /><span className="text-[10px] text-muted-foreground/60">{inv.userEmail}</span></td>
                  <td className="px-8 py-6 text-sm font-bold text-muted-foreground">{inv.startupName ?? "—"}<br /><span className="text-[10px] text-muted-foreground/60">{inv.campaignTitle}</span></td>
                  <td className="px-8 py-6 text-right font-mono text-xs font-bold text-muted-foreground">{Number(inv.tokensQty ?? 0).toLocaleString("pt-BR")}</td>
                  <td className="px-8 py-6 text-right font-mono font-black text-foreground">
                    {brl(inv.breakdown?.totalCharged ?? inv.payment?.amount ?? 0)}
                    {Number(inv.breakdown?.platformFeeAmount ?? 0) > 0 && (
                      <><br /><span className="text-[10px] font-bold text-muted-foreground/60">taxa {brl(inv.breakdown.platformFeeAmount)}</span></>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right font-mono font-bold text-emerald-400">{brl(inv.breakdown?.startupRepasseAmount ?? 0)}</td>
                  <td className="px-8 py-6 text-right font-mono font-bold text-primary">{brl(inv.breakdown?.platformRevenueAmount ?? 0)}</td>
                  <td className="px-8 py-6 text-center"><span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border", STATUS_UI[inv.status] ?? "bg-white/5 text-muted-foreground border-white/10")}>{STATUS_LABEL[inv.status] ?? inv.status}</span></td>
                  <td className="px-8 py-6 text-xs font-bold text-muted-foreground/60">{dateFmt.format(new Date(inv.createdAt))}</td>
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
