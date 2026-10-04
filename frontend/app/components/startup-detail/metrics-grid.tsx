import React from "react";
import { TrendingUp, Star } from "lucide-react";

interface Metric {
  label: string;
  value: string;
  detail: string;
  icon?: React.ComponentType<{ className?: string }>;
  highlight: boolean;
}

interface MetricsGridProps {
  metrics?: Metric[];
}

const defaultMetrics: Metric[] = [
  { label: "MRR", value: "R$ 0", detail: "Carregando...", icon: TrendingUp, highlight: true },
  { label: "Growth Rate", value: "0%", detail: "Carregando...", highlight: false },
  { label: "Clients", value: "0", detail: "Carregando...", highlight: false },
  { label: "NPS", value: "0", detail: "Carregando...", icon: Star, highlight: true },
];

export function MetricsGrid({ metrics = defaultMetrics }: MetricsGridProps) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
      {metrics.map((metric) => (
        <div 
          key={metric.label}
          className="bg-accent/30 p-6 lg:p-8 rounded-2xl border-l-4 border-primary/40 hover:bg-accent/50 transition-colors"
        >
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-4">
            {metric.label}
          </span>
          <div className="text-2xl lg:text-3xl font-black text-foreground">
            {metric.value}
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            {metric.icon && <metric.icon className="w-3.5 h-3.5 text-primary" />}
            <span className={metric.highlight ? "text-xs font-bold text-primary" : "text-xs text-muted-foreground italic font-medium"}>
              {metric.detail}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}
