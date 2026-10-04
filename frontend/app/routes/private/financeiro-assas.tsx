import type { Route } from "./+types/financeiro-assas";
import { Landmark, CreditCard, CheckCircle2 } from "lucide-react";
import { cn } from "~/lib/utils";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const METODO_LABEL: Record<string, string> = {
  PIX: "PIX", CREDIT_CARD: "Cartão", BOLETO: "Boleto", WALLET: "Carteira",
};
const STATUS_LABEL: Record<string, string> = {
  PAID: "Pago", PENDING: "Pendente", CANCELED: "Cancelado", REFUNDED: "Estornado",
};
const MODE_UI: Record<string, { label: string; className: string }> = {
  prod: { label: "Produção", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  sandbox: { label: "Sandbox", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  mock: { label: "Mock (dev)", className: "bg-white/5 text-muted-foreground border-white/10" },
};

interface GatewayData {
  gateway: string; mode: string; baseUrl: string | null; totalPago: number;
  porMetodo: Array<{ method: string; total: number; count: number }>;
  porStatus: Array<{ status: string; total: number; count: number }>;
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Financeiro · Gateway | iSelfToken" }, { name: "description", content: "Status do gateway de pagamento." }];
}

export async function loader({ request }: Route.LoaderArgs): Promise<{ gateway: GatewayData | null }> {
  const cookie = request.headers.get("cookie") || "";
  try {
    const res = await fetch(`${BACKEND_URL}/admin/financeiro/gateway`, { headers: { accept: "application/json", cookie } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return { gateway: json.data ?? null };
  } catch {
    return { gateway: null };
  }
}

export default function FinanceiroGatewayPage({ loaderData }: Route.ComponentProps) {
  const g = loaderData.gateway;
  const mode = g ? (MODE_UI[g.mode] ?? MODE_UI.mock) : MODE_UI.mock;

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-baseline gap-6">
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">Financeiro</span>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-foreground leading-none">Gateway</h1>
        </div>
      </header>

      {!g ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-muted-foreground/50 text-sm font-black uppercase tracking-widest">
          Não foi possível carregar o gateway.
        </div>
      ) : (
        <>
          {/* Status do gateway */}
          <section className="glass-panel rounded-2xl p-8 border border-white/5 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Landmark className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Provedor de pagamento</p>
                <p className="text-2xl font-black text-foreground italic">{g.gateway}</p>
                {g.baseUrl && <p className="text-[10px] text-muted-foreground/50 font-mono mt-1">{g.baseUrl}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Modo</p>
              <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", mode.className)}>{mode.label}</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total processado (pago)</p>
              <p className="text-3xl font-black text-foreground tracking-tighter">{brl(g.totalPago)}</p>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Por método */}
            <section className="glass-panel rounded-2xl p-8 border border-white/5">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-6 flex items-center gap-3"><CreditCard className="w-5 h-5 text-primary" /> Por Método (pagos)</h3>
              <div className="space-y-4">
                {g.porMetodo.length === 0 ? <p className="text-muted-foreground/50 text-sm">Sem pagamentos.</p> : g.porMetodo.map((m) => (
                  <div key={m.method} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                    <span className="text-sm font-bold text-foreground">{METODO_LABEL[m.method] ?? m.method}</span>
                    <div className="text-right"><span className="font-mono font-black text-foreground">{brl(m.total)}</span><span className="text-[10px] text-muted-foreground/60 ml-2">({m.count})</span></div>
                  </div>
                ))}
              </div>
            </section>

            {/* Por status */}
            <section className="glass-panel rounded-2xl p-8 border border-white/5">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-6 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> Por Status</h3>
              <div className="space-y-4">
                {g.porStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                    <span className="text-sm font-bold text-foreground">{STATUS_LABEL[s.status] ?? s.status}</span>
                    <div className="text-right"><span className="font-mono font-black text-foreground">{brl(s.total)}</span><span className="text-[10px] text-muted-foreground/60 ml-2">({s.count})</span></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
