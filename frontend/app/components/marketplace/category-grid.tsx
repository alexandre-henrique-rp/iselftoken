import {
  Banknote,
  Biohazard,
  Brain,
  Cloud,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import type { CategoryItem } from "~/types/category-item";

const ICON_BY_GROUP: Record<string, LucideIcon> = {
  ai: Brain,
  fintech: Banknote,
  healthtech: HeartPulse,
  saas: Cloud,
  edtech: GraduationCap,
  biotech: Biohazard,
  deeptech: FlaskConical,
  other: Rocket,
};

export function CategoryGrid({ stats }: { stats: CategoryItem[] }) {
  if (!stats.length) return null;
  return (
    <section className="pb-8">
      <div className="mb-6">
        <span className="text-primary font-bold text-[11px] tracking-widest uppercase mb-1 block">
          Exploração Ampla
        </span>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
          Startups por Categorias
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((cat) => {
          const Icon = ICON_BY_GROUP[cat.group] ?? Rocket;
          return (
            <div
              key={cat.group}
              className="p-4 sm:p-6 glass-card rounded-2xl border border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 cursor-pointer group"
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-bold text-xs sm:text-sm mb-1 line-clamp-1">{cat.name}</h4>
              <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                {cat.count} {cat.count === 1 ? "startup" : "startups"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
