import { useEffect, useMemo, useState } from "react";
import {
  mockAcceleratedStartups,
  mockApprovalStartups,
  mockFounderTestimonials,
  mockFundraisingRounds,
  mockInvestorTestimonials,
  mockOpportunities,
  mockVerifiedStartups,
  opportunityFilters,
} from "~/data/mockData";
import type { HomePageData } from "~/types/homepage";
import type { Route } from "./+types";
import {
  Carousel3D,
  MediumCard,
  OpportunityCard,
  RodadaCard,
} from "~/components/startup";
import {
  CallToActionSection,
  Footer,
  Header,
  HeroSection,
  SectionState,
  SkeletonCard,
  SkeletonTestimonial,
  SkeletonWideCard,
  TestimonialFounderCard,
  TestimonialInvestorCard,
} from "./components";

const STARTUP_SKELETONS = 4;
const TESTIMONIAL_SKELETONS = 3;

/**
 * @name meta
 * @description Define meta tags da homepage publica.
 *
 * @returns {Array<Record<string, string>>} Metadados para SEO e redes sociais.
 */
export function meta({}: Route.MetaArgs) {
  return [
    { title: "iSelfToken" },
    {
      name: "description",
      content: "Invista em startups promissoras via tokenização de equity.",
    },
    { property: "og:title", content: "iSelfToken" },
    {
      property: "og:description",
      content: "Crowdfunding para conectar investidores e fundadores.",
    },
  ];
}

/**
 * @name buildMockData
 * @description Monta dados mockados para a homepage.
 *
 * @returns {HomePageData} Dados consolidados para renderização.
 */
function buildMockData(): HomePageData {
  return {
    fundraisingRounds: mockFundraisingRounds,
    verifiedStartups: mockVerifiedStartups,
    acceleratedStartups: mockAcceleratedStartups,
    approvalStartups: mockApprovalStartups,
    opportunities: mockOpportunities,
    investorTestimonials: mockInvestorTestimonials,
    founderTestimonials: mockFounderTestimonials,
  };
}

/**
 * @name HomePage
 * @description Pagina inicial publica da plataforma.
 *
 * @returns {JSX.Element} Layout completo da homepage.
 */
export default function HomePage() {
  const [data, setData] = useState<HomePageData | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isLoading, setIsLoading] = useState({
    startups: true,
    testimonials: true,
  });
  const [errors, setErrors] = useState({
    startups: "",
    testimonials: "",
  });

  /**
   * @name loadHomeData
   * @description Simula carregamento de dados da homepage.
   *
   * @param {"all" | "startups" | "testimonials"} scope - Escopo de carregamento.
   */
  const loadHomeData = (scope: "all" | "startups" | "testimonials" = "all") => {
    if (scope === "all") {
      setIsLoading({ startups: true, testimonials: true });
      setErrors({ startups: "", testimonials: "" });
    }

    if (scope === "startups") {
      setIsLoading((prev) => ({ ...prev, startups: true }));
      setErrors((prev) => ({ ...prev, startups: "" }));
    }

    if (scope === "testimonials") {
      setIsLoading((prev) => ({ ...prev, testimonials: true }));
      setErrors((prev) => ({ ...prev, testimonials: "" }));
    }

    const timer = setTimeout(() => {
      setData(buildMockData());
      setIsLoading((prev) => ({
        ...prev,
        startups: scope === "testimonials" ? prev.startups : false,
        testimonials: scope === "startups" ? prev.testimonials : false,
      }));
    }, 600);

    return () => clearTimeout(timer);
  };

  useEffect(() => loadHomeData("all"), []);

  /**
   * @name handleRetryStartups
   * @description Recarrega os dados das seções de startups.
   */
  const handleRetryStartups = () => {
    loadHomeData("startups");
  };

  /**
   * @name handleRetryTestimonials
   * @description Recarrega os dados das seções de depoimentos.
   */
  const handleRetryTestimonials = () => {
    loadHomeData("testimonials");
  };

  const filteredOpportunities = useMemo(() => {
    if (!data?.opportunities) {
      return [];
    }

    if (activeFilter === "all") {
      return data.opportunities;
    }

    return data.opportunities.filter((item) =>
      item.type
        .toLowerCase()
        .replace(" / ", "-")
        .replaceAll(" ", "-")
        .includes(activeFilter),
    );
  }, [activeFilter, data?.opportunities]);

  /**
   * @name handleFilterChange
   * @description Atualiza o filtro ativo e direciona para a rota.
   *
   * @param {string} filterKey - Chave do filtro selecionado.
   */
  const handleFilterChange = (filterKey: string) => {
    setActiveFilter(filterKey);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <HeroSection />

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            {isLoading.startups ? (
              <div className="flex gap-6 overflow-x-auto pb-4">
                {Array.from({ length: STARTUP_SKELETONS }).map((_, index) => (
                  <SkeletonWideCard key={`skeleton-round-${index}`} />
                ))}
              </div>
            ) : errors.startups ? (
              <SectionState
                title="Nao foi possivel carregar as startups"
                message="Tente novamente em alguns instantes."
                onRetry={handleRetryStartups}
              />
            ) : data?.fundraisingRounds.length ? (
              <Carousel3D title="Rodadas de Captação" cardHeight={600}>
                {data.fundraisingRounds.map((startup) => (
                  <RodadaCard key={startup.id} startup={startup} />
                ))}
              </Carousel3D>
            ) : (
              <SectionState
                title="Nenhuma startup disponível"
                message="Seja o primeiro a se cadastrar na plataforma."
              />
            )}
          </div>
        </section>

        <CallToActionSection />

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            {isLoading.startups ? (
              <div className="flex gap-6 overflow-x-auto pb-4">
                {Array.from({ length: STARTUP_SKELETONS }).map((_, index) => (
                  <SkeletonCard key={`skeleton-verified-${index}`} />
                ))}
              </div>
            ) : data?.verifiedStartups.length ? (
              <Carousel3D
                title="Startups Verificadas"
                cardHeight={320}
                cardSpacing={300}
              >
                {data.verifiedStartups.map((startup) => (
                  <MediumCard key={startup.id} startup={startup} />
                ))}
              </Carousel3D>
            ) : (
              <SectionState
                title="Nenhuma startup verificada"
                message="Novas startups serão listadas em breve."
              />
            )}
          </div>
        </section>

        <section className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            {isLoading.startups ? (
              <div className="flex gap-6 overflow-x-auto pb-4">
                {Array.from({ length: STARTUP_SKELETONS }).map((_, index) => (
                  <SkeletonCard key={`skeleton-accelerated-${index}`} />
                ))}
              </div>
            ) : data?.acceleratedStartups.length ? (
              <Carousel3D
                title="Startups Aceleradas"
                cardHeight={320}
                cardSpacing={300}
              >
                {data.acceleratedStartups.map((startup) => (
                  <MediumCard key={startup.id} startup={startup} />
                ))}
              </Carousel3D>
            ) : (
              <SectionState
                title="Nenhuma startup acelerada"
                message="Em breve novas aceleradas entram na plataforma."
              />
            )}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            {isLoading.startups ? (
              <div className="flex gap-6 overflow-x-auto pb-4">
                {Array.from({ length: STARTUP_SKELETONS }).map((_, index) => (
                  <SkeletonCard key={`skeleton-approval-${index}`} />
                ))}
              </div>
            ) : data?.approvalStartups.length ? (
              <Carousel3D
                title="Startups em Fase de Aprovacao"
                cardHeight={320}
                cardSpacing={300}
              >
                {data.approvalStartups.map((startup) => (
                  <MediumCard key={startup.id} startup={startup} />
                ))}
              </Carousel3D>
            ) : (
              <SectionState
                title="Nenhuma startup em aprovacao"
                message="Em breve novas startups estarão em aprovacao."
              />
            )}
          </div>
        </section>

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
                  onClick={() => handleFilterChange(filter.key)}
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

            {isLoading.startups ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonCard key={`skeleton-opportunity-${index}`} />
                ))}
              </div>
            ) : filteredOpportunities.length ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredOpportunities.slice(0, 16).map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-8">
                <SectionState
                  title="Nenhuma oportunidade"
                  message="Novas oportunidades serão listadas em breve."
                />
              </div>
            )}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            <h2 className="text-center text-2xl font-semibold text-foreground md:text-3xl mb-8">
              Depoimentos de quem ja investe
            </h2>
            <div className="mt-8">
              {isLoading.testimonials ? (
                <div className="flex gap-6 overflow-x-auto pb-4">
                  {Array.from({ length: TESTIMONIAL_SKELETONS }).map(
                    (_, index) => (
                      <SkeletonTestimonial key={`skeleton-investor-${index}`} />
                    ),
                  )}
                </div>
              ) : errors.testimonials ? (
                <SectionState
                  title="Nao foi possivel carregar os depoimentos"
                  message="Tente novamente em alguns instantes."
                  onRetry={handleRetryTestimonials}
                />
              ) : data?.investorTestimonials.length ? (
                <Carousel3D cardHeight={280} cardSpacing={340}>
                  {data.investorTestimonials.map((testimonial) => (
                    <TestimonialInvestorCard
                      key={testimonial.id}
                      testimonial={testimonial}
                    />
                  ))}
                </Carousel3D>
              ) : (
                <SectionState
                  title="Sem depoimentos"
                  message="Ainda nao recebemos depoimentos de investidores."
                />
              )}
            </div>
          </div>
        </section>

        <section className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            <h2 className="text-center text-2xl font-semibold text-foreground md:text-3xl mb-8">
              O que os fundadores de startups falam sobre nos
            </h2>
            <div className="mt-8">
              {isLoading.testimonials ? (
                <div className="flex gap-6 overflow-x-auto pb-4">
                  {Array.from({ length: TESTIMONIAL_SKELETONS }).map(
                    (_, index) => (
                      <SkeletonTestimonial key={`skeleton-founder-${index}`} />
                    ),
                  )}
                </div>
              ) : errors.testimonials ? (
                <SectionState
                  title="Nao foi possivel carregar os depoimentos"
                  message="Tente novamente em alguns instantes."
                  onRetry={handleRetryTestimonials}
                />
              ) : data?.founderTestimonials.length ? (
                <Carousel3D cardHeight={320} cardSpacing={340}>
                  {data.founderTestimonials.map((testimonial) => (
                    <TestimonialFounderCard
                      key={testimonial.id}
                      testimonial={testimonial}
                    />
                  ))}
                </Carousel3D>
              ) : (
                <SectionState
                  title="Sem depoimentos"
                  message="Ainda nao recebemos depoimentos de fundadores."
                />
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
