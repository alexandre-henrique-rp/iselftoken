import { Star, TrendingUp } from "lucide-react";
import React from "react";
import { Link } from "react-router";
import { BusinessSummary } from "~/components/startup-detail/business-summary";
import { InvestmentSidebar } from "~/components/startup-detail/investment-sidebar";
import { InvestorForum } from "~/components/startup-detail/investor-forum";
import { MetricsGrid } from "~/components/startup-detail/metrics-grid";
import { PitchVideo } from "~/components/startup-detail/pitch-video";
import { RealInvestors } from "~/components/startup-detail/real-investors";
import { RiskDocs } from "~/components/startup-detail/risk-docs";
import { StartupHero } from "~/components/startup-detail/startup-hero";
import { TeamSection } from "~/components/startup-detail/team-section";
import { useRelatedStartupsQuery } from "~/hooks/use-related-startups";
import { useStartupDetailQuery } from "~/hooks/use-startup-detail";
import type { Route } from "./+types/startup-detail";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Startup #${params.id} | Detalhes | iSelfToken` },
    {
      name: "description",
      content: "Informações detalhadas sobre a rodada de investimento.",
    },
  ];
}

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

/**
 * Se o investidor chegou por um link de afiliado (?ref=CODE), registra o
 * vínculo de indicação. Idempotente no backend; falhas (código inválido,
 * auto-indicação, sem sessão) são silenciosas — não podem quebrar a página.
 */
async function trackReferral(code: string, cookie: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/affiliate/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ code }),
    });
    const json = await res.json().catch(() => null);
    return Boolean(res.ok && json && !json.error);
  } catch {
    return false;
  }
}

export async function loader({ params, request }: Route.LoaderArgs) {
  // Registra a indicação ANTES de carregar a startup: a atribuição de comissão
  // não pode depender da renderização da página. Idempotente e silencioso.
  const ref = new URL(request.url).searchParams.get("ref");
  let referralTracked = false;
  if (ref) {
    referralTracked = await trackReferral(
      ref,
      request.headers.get("cookie") || "",
    );
  }
  return {
    referral: { code: ref, tracked: referralTracked },
    id: String(params.id),
  };
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="glass-card p-8 rounded-3xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground font-medium">
            Carregando startup...
          </span>
        </div>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-foreground mb-2">
          Startup não encontrada
        </h2>
        <p className="text-muted-foreground">
          A startup que você procura não existe ou foi removida.
        </p>
      </div>
      <Link
        to="/home"
        className="kinetic-gradient text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest"
      >
        Voltar ao Marketplace
      </Link>
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class RenderErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function StartupDetail({ loaderData }: Route.ComponentProps) {
  const {
    id,
    referral: { tracked, code },
  } = loaderData;
  const startupQuery = useStartupDetailQuery(id);
  // related-startups é melhor-esforço — falha silenciosa, lista fica vazia.
  const relatedQuery = useRelatedStartupsQuery();

  if (startupQuery.isError) return <ErrorState />;
  if (startupQuery.isLoading || !startupQuery.data) return <LoadingState />;

  const startup = startupQuery.data;

  return (
    <RenderErrorBoundary fallback={<ErrorState />}>
      {tracked && <ReferralBanner />}
      <StartupDetailContent
        startup={startup}
        affiliateCode={code ?? null}
        related={relatedQuery.data ?? []}
      />
    </RenderErrorBoundary>
  );
}

/**
 * Boundary de rota (React Router): captura falhas do `loader` — incluindo o
 * `throw new Response(404)` quando a startup não existe — e mostra o estado de
 * erro amigável específico da página, em vez do 404 genérico do root.
 */
export function ErrorBoundary() {
  return <ErrorState />;
}

function ReferralBanner() {
  return (
    <div className="mb-8 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
      <Star className="w-5 h-5 text-primary shrink-0" />
      <p className="text-sm text-foreground">
        <span className="font-black">
          Você chegou por indicação de um afiliado.
        </span>{" "}
        <span className="text-muted-foreground">
          Se investir nesta startup, a indicação será creditada automaticamente.
        </span>
      </p>
    </div>
  );
}

function StartupDetailContent({
  startup,
  affiliateCode,
  related: _related,
}: {
  startup: NonNullable<ReturnType<typeof useStartupDetailQuery>["data"]>;
  affiliateCode: string | null;
  related: unknown[];
}) {
  const badge = `${startup.category} • ${startup.stage}`;

  const metrics = [
    {
      label: "Valuation",
      value: startup.metrics.valuation,
      detail: "Avaliação da rodada",
      icon: TrendingUp,
      highlight: true,
    },
    {
      label: "Preço do Token",
      value: startup.metrics.tokenPrice,
      detail: "Por token",
      highlight: false,
    },
    {
      label: "Tokens Disponíveis",
      value: startup.metrics.tokensAvailable,
      detail: "Ainda ofertados",
      highlight: false,
    },
    {
      label: "Investidores",
      value: startup.metrics.investors,
      detail: "Nesta rodada",
      icon: Star,
      highlight: true,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 relative">
      {/* Main Content Column */}
      <div className="flex-1 space-y-24 lg:space-y-32">
        <StartupHero
          name={startup.name}
          badge={badge}
          description={startup.description}
          logo={startup.logo}
        />

        <PitchVideo thumbnail="https://images.unsplash.com/photo-1551288049-bbbda536339a?auto=format&fit=crop&q=80&w=1200" />

        <MetricsGrid metrics={metrics} />

        <BusinessSummary />

        <TeamSection />

        <RiskDocs />

        <RealInvestors />

        <InvestorForum />
      </div>

      {/* Right Sticky Investment Card */}
      <InvestmentSidebar
        raised={startup.campaign.raised}
        goal={startup.campaign.goal}
        valuation={startup.metrics.valuation}
        percentage={startup.campaign.percentage}
        remainingDays={startup.campaign.remainingDays}
        equity={startup.campaign.equity}
        startupName={startup.name}
        startupLogo={startup.logo}
        startupDescription={startup.description}
        investment={startup.investment}
        affiliateCode={affiliateCode}
      />
    </div>
  );
}
