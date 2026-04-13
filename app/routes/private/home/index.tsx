import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { Route } from "./+types";
import {
  mockBanners,
  mockFundraisingRounds,
  mockVerifiedStartups,
  mockAcceleratedStartups,
  mockApprovalStartups,
  mockOpportunities,
  opportunityFilters,
} from "~/data/mockData";
import {
  Carousel3D,
  MediumCard,
  OpportunityCard,
  RodadaCard,
} from "~/components/startup";
import { BannerSlider } from "./components";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Home | iSelfToken" },
    { name: "description", content: "Marketplace de investimentos em startups" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-950 pb-20 pt-6">
      {/* Banner Rotativo (Hero) */}
      <section className="mb-12">
        <BannerSlider banners={mockBanners} />
      </section>

      {/* Seção: Rodadas de Captação */}
      <section className="mb-12">
        <div className="container mx-auto">
          <Carousel3D title="Rodadas de Captação" cardHeight={600} cardSpacing={320}>
            {mockFundraisingRounds.map((startup) => (
              <RodadaCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>

          <div className="flex justify-center mt-2">
            <button className="text-sm font-medium text-stone-400 hover:text-blue-400 transition-colors flex items-center gap-1 group">
              Ver todas as rodadas
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Seção: Startups Verificadas */}
      <section className="mb-12">
        <div className="container mx-auto">
          <Carousel3D title="Startups Verificadas" cardHeight={320} cardSpacing={260}>
            {mockVerifiedStartups.map((startup) => (
              <MediumCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>

          <div className="flex justify-center mt-2">
            <button className="text-sm font-medium text-stone-400 hover:text-blue-400 transition-colors flex items-center gap-1 group">
              Ver todas verificadas
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Seção: Startups Aceleradas */}
      <section className="mb-12 bg-stone-900/20 py-8">
        <div className="container mx-auto">
          <Carousel3D title="Startups Aceleradas" cardHeight={320} cardSpacing={260}>
            {mockAcceleratedStartups.map((startup) => (
              <MediumCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>

          <div className="flex justify-center mt-2">
            <button className="text-sm font-medium text-stone-400 hover:text-blue-400 transition-colors flex items-center gap-1 group">
              Ver todas aceleradas
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Seção: Em Fase de Aprovação */}
      <section className="mb-12">
        <div className="container mx-auto">
          <Carousel3D title="Em Fase de Aprovação" cardHeight={320} cardSpacing={260}>
            {mockApprovalStartups.map((startup) => (
              <MediumCard key={startup.id} startup={startup} />
            ))}
          </Carousel3D>

          <div className="flex justify-center mt-2">
            <button className="text-sm font-medium text-stone-400 hover:text-blue-400 transition-colors flex items-center gap-1 group">
              Ver todas em aprovação
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Seção: Oportunidades de Investimento (Grid com Filtros) */}
      <OpportunitiesSectionPrivate />
    </div>
  );
}

function OpportunitiesSectionPrivate() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredOpportunities = useMemo(() => {
    if (activeFilter === "all") {
      return mockOpportunities;
    }
    return mockOpportunities.filter((item) =>
      item.type
        .toLowerCase()
        .replace(" / ", "-")
        .replaceAll(" ", "-")
        .includes(activeFilter)
    );
  }, [activeFilter]);

  return (
    <section className="bg-muted/40 px-4 py-16 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl mb-6">
          Oportunidades de Investimento
        </h2>
        <div className="mb-8 flex flex-wrap gap-2">
          {opportunityFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                activeFilter === filter.key
                  ? "bg-blue-600 text-white"
                  : "border border-border bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredOpportunities.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOpportunities.slice(0, 16).map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/50">
            <p className="text-muted-foreground font-medium">
              Nenhuma oportunidade encontrada nesta categoria.
            </p>
            <button
              onClick={() => setActiveFilter("all")}
              className="mt-4 text-primary hover:text-primary/80 text-sm font-medium hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
