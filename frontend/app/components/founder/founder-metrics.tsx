import { Users, DollarSign, Rocket } from "lucide-react";
import { Link } from "react-router";
import { formatBRLCompact } from "~/lib/currency-format";

interface FounderMetricsData {
  investor_count: number;
  /** Soma de investments CONFIRMED em REAIS (alinhado com `valorCaptado` dos cards). */
  amount_raised: number;
  open_campaigns: number;
  total_campaigns: number;
}

interface FounderMetricsProps {
  metrics: FounderMetricsData;
}

export function FounderMetrics({ metrics }: FounderMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Hero — Captado */}
      <KpiCard
        accent
        icon={<DollarSign className="w-5 h-5 text-primary" />}
        label="Captado"
        value={formatBRLCompact(metrics.amount_raised ?? 0)}
        sublabel="Total levantado nas suas rodadas"
      />

      {/* Investidores — clicável: abre a lista completa */}
      <KpiCardLink
        href="/founder/investors"
        icon={
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
        }
        label="Investidores"
        value={String(metrics.investor_count)}
        sublabel="únicos · ver lista →"
      />

      {/* Captações */}
      <KpiCard
        icon={
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-primary" />
          </div>
        }
        label="Captações"
        value={
          <>
            <span className="text-primary">{metrics.open_campaigns}</span>
            <span className="text-muted-foreground/40 text-2xl">
              {" / "}
              {metrics.total_campaigns}
            </span>
          </>
        }
        sublabel="abertas / total"
      />
    </div>
  );
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  accent?: boolean;
}

function KpiCard({ icon, label, value, sublabel, accent }: KpiCardProps) {
  return (
    <div
      className={
        accent
          ? "bg-gradient-to-br from-primary/10 via-accent/30 to-accent/10 rounded-2xl p-5 border border-primary/15 shadow-lg relative overflow-hidden"
          : "bg-accent/20 rounded-2xl p-5 border border-white/5 shadow-lg"
      }
    >
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-3xl font-black tracking-tighter tabular-nums leading-none text-foreground">
        {value}
      </p>
      {sublabel && (
        <p className="text-[11px] text-muted-foreground mt-2 font-medium">
          {sublabel}
        </p>
      )}
    </div>
  );
}

function KpiCardLink({
  href,
  icon,
  label,
  value,
  sublabel,
}: Omit<KpiCardProps, "accent"> & { href: string }) {
  return (
    <Link
      to={href}
      className="group/inv bg-accent/20 hover:bg-accent/40 rounded-2xl p-5 border border-white/5 hover:border-primary/30 shadow-lg transition-all block"
      title={`Ver todos os ${label.toLowerCase()}`}
    >
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-3xl font-black text-foreground tracking-tighter tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-2 group-hover/inv:text-primary transition-colors">
        {sublabel}
      </p>
    </Link>
  );
}
