import type { Route } from "./+types/founder-investors";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, Users, DollarSign, Coins, Mail } from "lucide-react";
import { useFounderInvestorsQuery } from "~/hooks/use-founder-investors";

export function meta({ data }: Route.MetaArgs) {
  const escopo = (data as any)?.data?.escopo;
  return [{ title: `Investidores${escopo ? ` · ${escopo}` : ""} | iSelfToken` }];
}

export async function loader() {
  // Sem fetch direto: dados movidos para o hook client-side
  // (useFounderInvestorsQuery) — DEC-7 / STATE-02E.
  return null;
}

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const dt = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return iso; }
};

export default function FounderInvestorsPage() {
  const [searchParams] = useSearchParams();
  const startupId = searchParams.get("startupId");
  const query = useFounderInvestorsQuery(startupId);
  const data = query.data ?? null;
  const erro = query.isError
    ? (query.error instanceof Error ? query.error.message : "Erro ao carregar investidores.")
    : null;
  const escopo = data?.escopo ?? null;

  return (
    <div className="relative max-w-[1400px] mx-auto space-y-8">
      <Link to="/founder/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[11px] font-black uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Minhas Startups
      </Link>

      <header>
        <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
          {escopo ? escopo : "Todas as startups"}
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">Investidores</h1>
        <p className="text-muted-foreground text-sm mt-3 max-w-xl">
          {escopo
            ? `Quem investiu em ${escopo} (aportes confirmados).`
            : "Todos que investiram nas suas startups (aportes confirmados)."}
        </p>
      </header>

      {erro ? (
        <div className="glass-panel rounded-3xl p-12 text-center"><p className="text-muted-foreground font-medium">{erro}</p></div>
      ) : query.isLoading ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <p className="text-muted-foreground font-medium">Carregando investidores...</p>
        </div>
      ) : !data || data.investidores.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center space-y-3">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-lg font-black text-foreground">Nenhum investidor ainda.</p>
          <p className="text-sm text-muted-foreground">Assim que houver aportes confirmados, os investidores aparecem aqui.</p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <SummaryCard icon={Users} tone="primary" label="Investidores" value={String(data.totalInvestidores)} />
            <SummaryCard icon={DollarSign} tone="emerald" label="Total captado" value={brl(data.totalCaptado)} />
            <SummaryCard icon={Coins} tone="violet" label="Tokens vendidos" value={data.investidores.reduce((s, i) => s + i.totalTokens, 0).toLocaleString("pt-BR")} />
          </div>

          {/* Tabela */}
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 overflow-x-auto">
            <div className="min-w-[860px]">
              <div className={`grid ${escopo ? "grid-cols-[1.6fr_0.7fr_1fr_0.8fr_1fr]" : "grid-cols-[1.6fr_0.7fr_1fr_0.8fr_1.2fr]"} gap-4 px-6 py-4 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60`}>
                <span>Investidor</span><span>Aportes</span><span>Investido</span><span>Tokens</span><span>{escopo ? "Período" : "Startups"}</span>
              </div>
              {data.investidores.map((inv) => (
                <div key={inv.id} className={`grid ${escopo ? "grid-cols-[1.6fr_0.7fr_1fr_0.8fr_1fr]" : "grid-cols-[1.6fr_0.7fr_1fr_0.8fr_1.2fr]"} gap-4 px-6 py-4 border-b border-white/5 last:border-0 items-center`}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{inv.nome}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 shrink-0" /> {inv.email}</p>
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums">{inv.aportes}</span>
                  <span className="text-sm font-black text-emerald-400 tabular-nums">{brl(inv.totalInvestido)}</span>
                  <span className="text-sm font-bold text-primary tabular-nums">{inv.totalTokens.toLocaleString("pt-BR")}</span>
                  {escopo ? (
                    <span className="text-[11px] text-muted-foreground">{dt(inv.primeiroAporte)}{inv.aportes > 1 ? ` – ${dt(inv.ultimoAporte)}` : ""}</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {inv.startups.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-accent/40 border border-white/5 text-[10px] font-bold text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, tone, label, value }: { icon: React.ComponentType<{ className?: string }>; tone: "primary" | "emerald" | "violet"; label: string; value: string }) {
  const toneMap = { primary: "bg-primary/10 text-primary", emerald: "bg-emerald-500/10 text-emerald-400", violet: "bg-violet-500/10 text-violet-400" } as const;
  return (
    <div className="bg-accent/20 rounded-2xl p-5 border border-white/5">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${toneMap[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-black text-foreground tracking-tighter">{value}</p>
    </div>
  );
}
