import { useNavigate } from "react-router";
import type { StartupCard } from "~/types/homepage";
import { Badge } from "./Badge";

interface MediumCardProps {
  startup: StartupCard;
}

/**
 * @name MediumCard
 * @description Renderiza um card medio para listagem de startups.
 *
 * @param {StartupCard} startup - Dados da startup exibida no card.
 *
 * @returns {JSX.Element} Card medio com selo e CTA.
 */
export function MediumCard({ startup }: MediumCardProps) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(`/startup/${startup.id}`);
  };

  return (
    <article className="min-w-70 max-w-70 rounded-lg border border-border bg-card p-5 transition-all duration-300 hover:border-muted-foreground/40">
      <div className="mb-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/60">
        <img
          src={startup.image}
          alt={`Logo da startup ${startup.name}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {startup.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {startup.description}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {startup.badges.map((badge) => (
          <Badge key={`${startup.id}-${badge}`} label={badge} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {startup.category}
        </span>
        <button
          type="button"
          onClick={handleNavigate}
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Ver mais →
        </button>
      </div>
    </article>
  );
}
