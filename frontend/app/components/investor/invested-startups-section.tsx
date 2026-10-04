import React from "react";
import { useInvestedStartupsQuery } from "~/hooks/use-invested-startups";
import { InvestedStartupCard } from "~/components/investor/invested-startup-card";
import { Building2 } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export function InvestedStartupsSection() {
  const { data, isLoading } = useInvestedStartupsQuery();

  if (isLoading) {
    return (
      <section className="mb-10">
        {/* Header skeleton */}
        <div className="flex items-end justify-between mb-5">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-accent/20 rounded-xl animate-pulse" />
            <div className="h-4 w-72 bg-accent/10 rounded-lg animate-pulse" />
          </div>
          <div className="h-6 w-24 bg-accent/10 rounded-lg animate-pulse" />
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-52 bg-accent/10 rounded-2xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      </section>
    );
  }

  const startups = data?.startups ?? [];
  const totalStartups = data?.totalStartups ?? 0;
  const totalInvestido = data?.totalInvestido ?? 0;

  if (startups.length === 0) {
    return (
      <section className="mb-10">
        <div className="flex items-end justify-between mb-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Minhas Startups
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Startups em que você possui tokens
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-accent/10 border border-white/5">
          <Building2 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-base font-bold text-foreground">
            Nenhuma startup com tokens ainda
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Seus investimentos agrupados por startup aparecerão aqui.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Minhas Startups
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            {totalStartups} startup{totalStartups !== 1 ? "s" : ""} com
            tokens — investimento agrupado
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Total Investido
          </p>
          <p className="text-lg font-black text-foreground tracking-tight">
            {formatCurrency(totalInvestido)}
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {startups.map((startup) => (
          <InvestedStartupCard key={startup.startupId} startup={startup} />
        ))}
      </div>
    </section>
  );
}
