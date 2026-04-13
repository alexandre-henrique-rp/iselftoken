import {
  Briefcase,
  CheckCircle,
  Clock,
  Cpu,
  Leaf,
  Rocket,
  ShieldCheck,
  Star,
  Trophy,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import type { StartupCard } from "~/types/homepage";

interface RodadaCardProps {
  startup: StartupCard;
}

/**
 * @name RodadaCard
 * @description Renderiza o card principal das rodadas de captacao.
 *
 * @param {StartupCard} startup - Dados da startup exibida no card.
 *
 * @returns {JSX.Element} Card com metricas e CTA.
 *
 * @example
 * <RodadaCard startup={startup} />
 *
 * Fluxo de execucao:
 * 1. Calcula progresso da rodada
 * 2. Exibe badges, metricas e CTA
 * 3. Direciona para detalhes da startup
 */
export function RodadaCard({ startup }: RodadaCardProps) {
  const navigate = useNavigate();
  const progress = startup.totalTokens
    ? Math.min((startup.soldTokens ?? 0) / startup.totalTokens, 1)
    : 0;
  const progressPercent = Math.round(progress * 100);

  const handleNavigate = () => {
    navigate(`/startup/${startup.id}`);
  };

  const badgeIcons: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    Verificada: CheckCircle,
    ESG: Leaf,
    "Top Pick": Star,
    Acelerada: Rocket,
    "Em Aprovação": Clock,
    Compliance: ShieldCheck,
    B2B: Briefcase,
    Hardware: Cpu,
  };

  return (
    <article className="min-w-90 max-w-90 overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all duration-300 hover:border-muted-foreground/40 group">
      <div className="relative h-44 overflow-hidden">
        <img
          src={startup.image}
          alt={`Imagem da startup ${startup.name}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-linear-to-t from-card via-transparent to-transparent" />

        <div className="absolute right-3 top-3 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          {startup.category}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 overflow-hidden rounded-md border border-border bg-muted/60">
              <img
                src={startup.image}
                alt={`Logo da startup ${startup.name}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <h3 className="text-xl font-bold text-foreground">
              {startup.name}
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 mb-4">
            {startup.description}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 mb-4">
          <div className="flex flex-wrap gap-2">
            {startup.badges.map((badge) => {
              const Icon = badgeIcons[badge] ?? Trophy;

              return (
                <span
                  key={`${startup.id}-${badge}-trophy`}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground"
                  title={badge}
                  aria-label={badge}
                >
                  <Icon className="h-4 w-4" />
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground mb-1">
              Equity ofertado
            </p>
            <p className="text-lg font-bold text-foreground">
              {startup.valuation ?? "-"}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground mb-1">Valuation</p>
            <p className="text-lg font-bold text-foreground">
              {startup.currentValue ?? "-"}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso da rodada</span>
            <span className="font-semibold text-primary">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary relative transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
            <span>
              {(startup.soldTokens ?? 0).toLocaleString()} tokens vendidos
            </span>
            <span>Meta: {(startup.totalTokens ?? 0).toLocaleString()}</span>
          </div>
        </div>

        <Button
          type="button"
          className="w-full bg-primary py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
          onClick={handleNavigate}
        >
          <span>Investir Agora</span>
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Button>
      </div>
    </article>
  );
}
