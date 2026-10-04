import {
  ArrowRight,
  Brain,
  Cloud,
  Dna,
  Globe,
  School,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";
import { cn } from "~/lib/utils";
import type {
  StartupCategoryCode,
  StartupOpportunity,
} from "~/types/startup-opportunity";

type FilterCode = StartupCategoryCode | "ALL";

const CATEGORY_META: Record<
  StartupCategoryCode,
  { label: string; icon: LucideIcon }
> = {
  FINTECH: { label: "Fintech", icon: Wallet },
  AI: { label: "AI", icon: Brain },
  SAAS: { label: "SaaS", icon: Cloud },
  HEALTHTECH: { label: "Healthtech", icon: Stethoscope },
  EDTECH: { label: "EdTech", icon: School },
  BIOTECH: { label: "Biotech", icon: Dna },
  OTHER: { label: "Other", icon: Globe },
};

const FILTERS: { code: FilterCode; label: string }[] = [
  { code: "ALL", label: "All" },
  { code: "FINTECH", label: "Fintech" },
  { code: "AI", label: "AI" },
  { code: "SAAS", label: "SaaS" },
  { code: "HEALTHTECH", label: "Healthtech" },
  { code: "EDTECH", label: "EdTech" },
  { code: "BIOTECH", label: "Biotech" },
];

export function Opportunities({
  opportunities,
}: {
  opportunities: StartupOpportunity[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterCode>("ALL");

  const filtered =
    activeFilter === "ALL"
      ? opportunities
      : opportunities.filter((o) => o.category === activeFilter);

  return (
    <section className="py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="mb-8 lg:mb-10">
          <h3 className="text-2xl lg:text-3xl font-bold tracking-tighter mb-5 lg:mb-6 text-left">
            Oportunidades de Investimento
          </h3>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.code}
                onClick={() => setActiveFilter(f.code)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all",
                  activeFilter === f.code
                    ? "bg-primary text-white"
                    : "bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-white/5",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((item) => {
            const meta = CATEGORY_META[item.category ?? "OTHER"];
            return (
              <div
                key={item.id}
                className="bg-card p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group flex flex-col"
              >
                <div className="flex items-start justify-between mb-5 gap-3">
                  <InitialsImage
                    name={item.name}
                    src={item.image}
                    alt={item.name}
                    className="h-12 w-12 shrink-0 rounded-xl border border-white/10 transition-colors group-hover:border-primary/30"
                    fallbackClassName="bg-accent"
                    fallbackTextClassName="text-sm font-black"
                  />
                  {item.seals && item.seals.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 justify-end">
                      {item.seals.slice(0, 4).map((seal) => (
                        <img
                          key={seal.slug}
                          src={seal.imagePath}
                          alt={seal.name}
                          title={seal.name}
                          className="w-6 h-6 object-contain transition-transform hover:scale-110"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <h5 className="text-lg font-bold mb-1">{item.name}</h5>
                <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-3">
                  {meta.label}
                </p>
                <p className="text-muted-foreground text-sm mb-6 flex-1">
                  {item.description}
                </p>
                <Link
                  to={`/startup/${encodeURIComponent(item.slug)}`}
                  state={{ startup: item }}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground hover:text-primary transition-colors mt-auto"
                >
                  Ver mais <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
