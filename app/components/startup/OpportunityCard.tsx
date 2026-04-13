import { useNavigate } from "react-router";
import type { OpportunityItem } from "~/types/homepage";
import { Badge } from "./Badge";

interface OpportunityCardProps {
  opportunity: OpportunityItem;
}

/**
 * @name OpportunityCard
 * @description Renderiza o card compacto de oportunidades de investimento.
 *
 * @param {OpportunityItem} opportunity - Dados da oportunidade exibida.
 *
 * @returns {JSX.Element} Card compacto com icone e CTA.
 */
export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const navigate = useNavigate();
  const Icon = opportunity.icon;

  const handleNavigate = () => {
    navigate(`/startup/${opportunity.id}`);
  };

  return (
    <article
      className="group cursor-pointer rounded-lg border border-border bg-card p-5 transition-all duration-300 hover:border-muted-foreground/40 hover:bg-card/80"
      onClick={handleNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          handleNavigate();
        }
      }}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/60">
        {opportunity.image ? (
          <img
            src={opportunity.image}
            alt={`Logo da startup ${opportunity.name}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon className="h-5 w-5 text-primary" />
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {opportunity.name}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{opportunity.type}</p>
      {opportunity.badges?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {opportunity.badges.map((badge) => (
            <Badge
              key={`${opportunity.id}-${badge}`}
              label={badge}
              className="h-6 w-6"
            />
          ))}
        </div>
      ) : null}
      <span className="mt-3 inline-flex text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
        Ver mais →
      </span>
    </article>
  );
}
