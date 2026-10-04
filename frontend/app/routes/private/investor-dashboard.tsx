import type { Route } from "./+types/investor-dashboard";
import { InvestmentMetrics } from "~/components/investor/investment-metrics";
import { InvestmentCard } from "~/components/investor/investment-card";
import { useInvestorDashboardQuery } from "~/hooks/use-investor-dashboard";
import { useUser } from "~/hooks/use-user";
import { usePlan } from "~/hooks/use-plan";
import { InvestedStartupsSection } from "~/components/investor/invested-startups-section";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Meus Investimentos | iSelfToken" },
    { name: "description", content: "Acompanhe seus investimentos, ROI e carteira na iSelfToken." },
  ];
}

export async function loader() {
  // Sem fetch direto: dados movidos para o hook client-side
  // (useInvestorDashboardQuery) — DEC-7 / STATE-02E.
  return null;
}

export default function InvestorDashboard() {
  const { data } = useInvestorDashboardQuery();
  const { investments = [], total = 0 } = data ?? {};

  const { user } = useUser();
  const { plan } = usePlan(user);
  const isInvestorPlan = plan?.slug?.includes("investor") ?? false;

  // Métricas a partir de dados REAIS. O valor atual vem de Token.currentVal
  // (calculado no backend); antes era `amount * 1.15` — uma valorização de
  // +15% fabricada, que produzia um ROI fictício.
  const confirmados = investments.filter((i) => i.status === "CONFIRMED");
  const totalInvested = confirmados.reduce((sum, i) => sum + i.amount, 0);

  // Só entram na conta as posições com valor atual conhecido; sem nenhuma,
  // currentValue fica null e a UI mostra "—" em vez de repetir o investido.
  const comValor = confirmados.filter((i) => i.currentValue !== null);
  const currentValue = comValor.length > 0
    ? comValor.reduce((sum, i) => sum + (i.currentValue as number), 0)
    : null;

  // ROI real, comparando só o que tem cotação conhecida (base coerente).
  const baseROI = comValor.reduce((sum, i) => sum + i.amount, 0);
  const roi = currentValue !== null && baseROI > 0
    ? ((currentValue - baseROI) / baseROI) * 100
    : null;

  const pendingCount = investments.filter((i) => i.status === "PENDING").length;

  return (
    <div className="relative">
      {/* Background Watermark */}
      <div className="fixed -bottom-10 -right-10 opacity-[0.02] pointer-events-none select-none -z-10 overflow-hidden">
        <h1 className="text-[12vw] font-black italic tracking-tighter uppercase leading-none">iSelfToken</h1>
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground leading-tight">
            Meus Investimentos
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl font-medium leading-relaxed">
            Acompanhe sua carteira, retorno sobre investimento e status de cada aplicação.
          </p>
        </div>
        <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
          {total} investimento{total !== 1 ? "s" : ""}
        </div>
      </header>

      {/* Metrics */}
      <InvestmentMetrics
        totalInvested={totalInvested}
        currentValue={currentValue}
        roi={roi}
        pendingCount={pendingCount}
      />

      {/* Startups grouping — only for investor plan */}
      {isInvestorPlan && <InvestedStartupsSection />}

      {/* Investment List */}
      <div className="flex flex-col gap-3">
        {investments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Você ainda não possui investimentos.</p>
            <p className="text-sm mt-2">Explore o marketplace para começar a investir.</p>
          </div>
        ) : (
          investments.map((investment) => (
            <InvestmentCard key={investment.id} investment={investment} />
          ))
        )}
      </div>
    </div>
  );
}
