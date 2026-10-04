import type { Route } from "./+types/financeiro-config";
import { Link } from "react-router";
import { Info, Loader2 } from "lucide-react";
import { useAdminFundraisingConfigQuery } from "~/hooks/use-admin-fundraising-config";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Financeiro Config | iSelfToken" },
    { name: "description", content: "Taxas e limites vigentes da plataforma." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  return { config: null };
}

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const pctFrac = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export default function FinanceiroConfigPage() {
  const { data: config, isLoading } = useAdminFundraisingConfigQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
    );
  }

  const items: { label: string; value: string }[] = config
    ? [
        { label: "Taxa de emissão por token", value: brl(config.authFeePerToken) },
        { label: "Preço base do token", value: brl(config.tokenPrice) },
        { label: "Taxa da plataforma (fundraising)", value: pctFrac(config.platformFee) },
        { label: "Taxa de compliance", value: brl(config.complianceFee) },
        { label: "Taxa de fast-track", value: brl(config.fastTrackFee) },
        { label: "Campanha mínima", value: brl(config.minCampaign) },
        { label: "Campanha máxima", value: brl(config.maxCampaign) },
        { label: "Equity mínimo", value: `${config.equityMin}%` },
        { label: "Equity máximo", value: `${config.equityMax}%` },
      ]
    : [];

  return (
    <div className="relative max-w-[1200px] mx-auto space-y-10">
      <header>
        <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">Financeiro</span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">Taxas e limites vigentes</h1>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-5 py-4">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-sm text-sky-100/80 leading-relaxed">
          Estes valores são geridos em <span className="font-bold text-foreground">Admin → Configurações</span>, com vigência por data — cada alteração passa a valer a partir do dia definido e não altera cálculos passados. Abaixo, os valores <span className="font-bold">vigentes hoje</span>.
        </p>
      </div>

      {config ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.label} className="p-6 rounded-2xl bg-accent/20 border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{it.label}</p>
              <p className="text-2xl font-black text-foreground tracking-tighter">{it.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center"><p className="text-muted-foreground">Não foi possível carregar a configuração.</p></div>
      )}
    </div>
  );
}
