import type { Route } from "./+types/financeiro-dashboard";
import { DollarSign, TrendingUp, CreditCard, Calendar, CalendarDays, CalendarRange } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

interface RevenueBreakdown {
  gmv_cobrado: number;
  token_subtotal: number;
  repasse_startups: number;
  taxa_plataforma: number;
  spread_tokens: number;
  receita_investimentos: number;
  comissao_afiliado_investidores: number;
  taxa_reserva_tokens: number;
  taxa_compliance: number;
  fast_track: number;
  selo_verificacao: number;
  early_access: number;
  comissao_afiliados_devida: number;
  comissao_afiliados_plataforma: number;
  receita_plataforma_total: number;
}

interface FinanceiroData {
  kpis: {
    gmv: number;
    transaction_volume: number;
    platform_revenue: number;
    platform_fee_rate: number;
    repasse_startups: number;
  };
  revenue_breakdown: RevenueBreakdown | null;
  stats: {
    today: number;
    this_week: number;
    this_month: number;
  };
  recentTransactions: Array<{
    id: number;
    amount: number;
    method: string;
    purpose: string;
    status: string;
    userName: string;
    userEmail: string;
    createdAt: string;
  }>;
  paymentMethods: { labels: string[]; data: number[] };
  monthlyTrend: { labels: string[]; data: number[] };
}

const EMPTY_METHODS = { labels: [], data: [] };
const EMPTY_TREND = { labels: [], data: [] };

export async function loader({ request }: Route.LoaderArgs): Promise<FinanceiroData> {
  const cookie = request.headers.get("cookie") || "";

  const res = await fetch(`${BACKEND_URL}/admin/financeiro/dashboard`, {
    headers: { cookie },
  });

  const empty: FinanceiroData = {
    kpis: { gmv: 0, transaction_volume: 0, platform_revenue: 0, platform_fee_rate: 0.05, repasse_startups: 0 },
    revenue_breakdown: null,
    stats: { today: 0, this_week: 0, this_month: 0 },
    recentTransactions: [],
    paymentMethods: EMPTY_METHODS,
    monthlyTrend: EMPTY_TREND,
  };

  if (!res.ok) return empty;

  const result = await res.json();
  const data = result?.data;
  if (!data) return empty;

    // Modelo B — split financeiro:
    //   gmv                = total cobrado dos investidores (subtotal + taxa)
    //   repasse_startups   = devido às startups (preço base × tokens)
    //   platform_revenue   = receita total da plataforma (spread + taxa +
    //                        taxas avulsas + parte de comissões)
    //   fee_collection     = taxa da plataforma cobrada dos investidores
  return {
    kpis: {
      gmv: Number(data.kpis?.gmv_investments ?? data.kpis?.gmv ?? 0),
      transaction_volume: Number(data.kpis?.transaction_volume ?? 0),
      platform_revenue: Number(data.kpis?.total_revenue ?? data.kpis?.platform_revenue ?? 0),
      platform_fee_rate: Number(data.kpis?.platform_fee_rate ?? 0.05),
      repasse_startups: Number(data.kpis?.repasse_startups ?? 0),
    },
    revenue_breakdown: data.revenue_breakdown ?? null,
    stats: {
      today: Number(data.stats?.today ?? 0),
      this_week: Number(data.stats?.this_week ?? 0),
      this_month: Number(data.stats?.this_month ?? 0),
    },
    recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : [],
    paymentMethods: data.paymentMethods ?? EMPTY_METHODS,
    monthlyTrend: data.monthlyTrend ?? EMPTY_TREND,
  };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Financeiro Dashboard | iSelfToken" },
    { name: "description", content: "Painel financeiro para gestão de receitas e despesas." },
  ];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

const statusBadge = (status: string) => {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    PAID: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Pago" },
    PENDING: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Pendente" },
    FAILED: { color: "text-red-400", bg: "bg-red-500/10", label: "Falhou" },
    REFUNDED: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Reembolsado" },
  };
  const c = config[status] || config.PENDING;
  return <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${c.color} ${c.bg}`}>{c.label}</span>;
};

// =====================================================
// Mini Line Chart (SVG)
// =====================================================
function MiniLineChart({ data, labels = [], color = "#d400f9", height = 80 }: { data: number[]; labels?: string[]; color?: string; height?: number }) {
  if (data.length === 0) return null;

  // Baseline sempre em 0: escalar a partir do menor valor exageraria as
  // variações e distorceria a leitura (um mês de R$ 44k não pode aparecer
  // como "zero" só por ser o menor da série).
  const max = Math.max(...data, 1);
  const min = 0;
  const range = max - min || 1;
  const width = 300;
  const padding = 4;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ];

  return (
    <svg viewBox={`0 0 ${width} ${height + 14}`} className="w-full" style={{ height: height + 14 }}>
      <defs>
        <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints.join(" ")}
        fill={`url(#gradient-${color.replace("#", "")})`}
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((val, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - ((val - min) / range) * (height - padding * 2);
        return (
          <circle key={i} cx={x} cy={y} r="3" fill={color} opacity={i === data.length - 1 ? 1 : 0.5} />
        );
      })}
      {/* Rótulos ancorados no MESMO x dos pontos (antes ficavam fora do SVG,
          com justify-between, e não alinhavam com a série). */}
      {labels.map((label, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
        return (
          <text key={`${label}-${i}`} x={x} y={height + 10} textAnchor="middle" className="fill-muted-foreground" fontSize="7" fontWeight="bold">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// =====================================================
// Bar Chart (SVG)
// =====================================================
function MiniBarChart({ data, labels, height = 100 }: { data: number[]; labels: string[]; height?: number }) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const width = 300;
  const padding = 4;
  const barWidth = (width - padding * 2) / data.length - 4;

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full" style={{ height: height + 20 }}>
      {data.map((val, i) => {
        const barHeight = (val / max) * (height - padding * 2);
        const x = padding + i * ((width - padding * 2) / data.length) + 2;
        const y = height - padding - barHeight;
        const isMax = val === max;

        return (
          <g key={i}>
            {/* Valor acima da barra: o gráfico sozinho não permite ler quanto
                cada método movimentou. */}
            <text
              x={x + barWidth / 2}
              y={Math.max(8, y - 3)}
              textAnchor="middle"
              className="fill-foreground"
              fontSize="7"
              fontWeight="bold"
            >
              {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
            </text>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="3"
              fill={isMax ? "#d400f9" : "rgba(213, 0, 249, 0.3)"}
            />
            <text
              x={x + barWidth / 2}
              y={height + 12}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="8"
              fontWeight="bold"
            >
              {labels[i] || ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Rótulos legíveis dos métodos de pagamento (o backend envia os enums crus).
const METHOD_LABEL: Record<string, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartão",
  BOLETO: "Boleto",
  WALLET: "Carteira",
};

export default function FinanceiroDashboardPage({ loaderData }: Route.ComponentProps) {
  const { kpis, revenue_breakdown, stats, recentTransactions, paymentMethods, monthlyTrend } = loaderData;

  const revenueTrend = monthlyTrend.data;
  const revenueLabels = monthlyTrend.labels;
  const methodData = paymentMethods.data;
  const methodLabels = paymentMethods.labels.map((m) => METHOD_LABEL[m] ?? m);

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-16 lg:space-y-24">
      {/* Background Watermark */}
      <div className="fixed -bottom-10 -right-10 opacity-[0.02] pointer-events-none select-none -z-10 overflow-hidden">
        <h1 className="text-[12vw] font-black italic tracking-tighter uppercase leading-none">Financeiro</h1>
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-baseline gap-6 relative">
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">Financeiro</span>
          <h1 className="text-6xl lg:text-[7rem] font-black tracking-tighter text-foreground leading-none">
            Dashboard <span className="text-primary italic">Financeiro</span>
          </h1>
        </div>
      </header>

      {/* KPIs — Modelo B: GMV cobrado × repasse às startups × receita da plataforma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">GMV Cobrado</span>
          </div>
          <p className="text-3xl font-black text-foreground tracking-tighter">{formatCurrency(kpis.gmv)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total pago pelos investidores (tokens + taxa)</p>
        </div>

        <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Repasse às Startups</span>
          </div>
          <p className="text-3xl font-black text-foreground tracking-tighter">{formatCurrency(kpis.repasse_startups)}</p>
          <p className="text-xs text-muted-foreground mt-1">Preço base × tokens vendidos</p>
        </div>

        <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Receita da Plataforma</span>
          </div>
          <p className="text-3xl font-black text-foreground tracking-tighter">{formatCurrency(kpis.platform_revenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Spread + taxa {(kpis.platform_fee_rate * 100).toFixed(1)}% + taxas avulsas</p>
        </div>

        <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volume Transações</span>
          </div>
          <p className="text-3xl font-black text-foreground tracking-tighter">{formatCurrency(kpis.transaction_volume)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total processado (todos os purposes)</p>
        </div>
      </div>

      {/* Breakdown de receita — separação contábil do split de investimentos
          e das taxas avulsas cobradas da startup. */}
      {revenue_breakdown && (
        <section className="space-y-6">
          <h2 className="text-xl font-black tracking-tighter text-foreground">Composição da Receita</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Investimentos (split venda/base)</h3>
              {[
                ["Subtotal de tokens", revenue_breakdown.token_subtotal],
                ["Repasse às startups", revenue_breakdown.repasse_startups],
                ["Spread de tokens", revenue_breakdown.spread_tokens],
                [`Taxa da plataforma`, revenue_breakdown.taxa_plataforma],
                ["Receita de investimentos", revenue_breakdown.receita_investimentos],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-bold text-foreground">{formatCurrency(Number(value))}</span>
                </div>
              ))}
            </div>
            <div className="bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Taxas avulsas e afiliados</h3>
              {[
                ["Taxa de reserva de tokens", revenue_breakdown.taxa_reserva_tokens],
                ["Taxa de compliance", revenue_breakdown.taxa_compliance],
                ["Fast track review", revenue_breakdown.fast_track],
                ["Selo de verificação", revenue_breakdown.selo_verificacao],
                ["Early access", revenue_breakdown.early_access],
                ["Comissão de afiliados (plataforma)", revenue_breakdown.comissao_afiliados_plataforma],
                ["Comissão devida a afiliados", revenue_breakdown.comissao_afiliados_devida],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-bold text-foreground">{formatCurrency(Number(value))}</span>
                </div>
              ))}
              <div className="flex justify-between items-center border-t border-white/10 pt-3 text-sm">
                <span className="font-black uppercase tracking-widest text-primary">Receita total</span>
                <span className="font-mono font-black text-primary">{formatCurrency(revenue_breakdown.receita_plataforma_total)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-accent/10 rounded-xl p-4 border border-white/5 flex items-center gap-4">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hoje</span>
            <p className="text-xl font-black text-foreground">{formatCurrency(stats.today)}</p>
          </div>
        </div>
        <div className="bg-accent/10 rounded-xl p-4 border border-white/5 flex items-center gap-4">
          <CalendarDays className="w-5 h-5 text-primary" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Esta Semana</span>
            <p className="text-xl font-black text-foreground">{formatCurrency(stats.this_week)}</p>
          </div>
        </div>
        <div className="bg-accent/10 rounded-xl p-4 border border-white/5 flex items-center gap-4">
          <CalendarRange className="w-5 h-5 text-primary" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Este Mês</span>
            <p className="text-xl font-black text-foreground">{formatCurrency(stats.this_month)}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Line Chart */}
        <div className="bg-accent/10 rounded-2xl p-6 border border-white/5 shadow-lg">
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">Evolução do Volume Investido</h3>
          <MiniLineChart data={revenueTrend} labels={revenueLabels} color="#d400f9" height={120} />
        </div>

        {/* Payment Methods Bar Chart */}
        <div className="bg-accent/10 rounded-2xl p-6 border border-white/5 shadow-lg">
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">Volume por Método</h3>
          <MiniBarChart data={methodData} labels={methodLabels} height={120} />
        </div>
      </div>

      {/* Recent Transactions */}
      <section className="space-y-6">
        <h2 className="text-xl font-black tracking-tighter text-foreground">Transações Recentes</h2>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma transação recente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="bg-accent/20 rounded-2xl p-4 lg:p-5 border border-white/5 shadow-lg flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-foreground">{tx.userName}</h3>
                  <p className="text-xs text-muted-foreground">{tx.userEmail}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {tx.purpose} via {tx.method}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-black text-foreground">{formatCurrency(tx.amount)}</p>
                  {statusBadge(tx.status)}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
