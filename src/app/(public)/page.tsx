import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ProfileCard, type ProfileCardData } from "@/components/profile-card";
import { CarouselNav, CarouselItem } from "@/components/carousel-nav";
import { ExploreOpportunities, type OpportunityData } from "@/components/explore-opportunities";
import { TestimonialCard, type TestimonialData } from "@/components/testimonial-card";
import { StartupTestimonialCard, type StartupTestimonialData } from "@/components/startup-testimonial-card";
import { Star } from "lucide-react";

export default function Home() {
  // Dados das oportunidades de investimento (exigem origem na própria page.tsx)
  const opportunitiesData: OpportunityData[] = [
    { name: "Thape", subName: "Tintacp", category: "Fintech", icon: "fintech" },
    { name: "AI Abs", subName: "Stracp Carfgus", category: "AI", icon: "ai" },
    { name: "Edtech", subName: "Avcle Getterer", category: "EdTech", icon: "education" },
    { name: "CF Shimap", subName: "Conp Pctns", category: "SaaS", icon: "saas" },
    { name: "FinPulse", subName: "Credit Solutions", category: "Fintech", icon: "fintech" },
    { name: "AgroGrowth", subName: "Smart Farming", category: "AI", icon: "ai" },
    { name: "CloudBase", subName: "API Services", category: "SaaS", icon: "saas" },
    { name: "CareConnect", subName: "Patient Management", category: "Healthtech", icon: "health" },
    { name: "TutorMe", subName: "Peer-to-peer learning", category: "EdTech", icon: "education" },
    { name: "BioGen", subName: "Synthetic Biology", category: "Biotech", icon: "biotech" },
    { name: "AIVision", subName: "Image Recognition", category: "AI", icon: "ai" },
    { name: "DataFlow", subName: "ETL Platform", category: "SaaS", icon: "saas" },
    { name: "MedTech", subName: "Diagnostic Tools", category: "Healthtech", icon: "health" },
    { name: "EduSmart", subName: "Learning Analytics", category: "EdTech", icon: "education" },
    { name: "GreenTech", subName: "Carbon Tracking", category: "Biotech", icon: "biotech" },
    { name: "PayFlow", subName: "Payment Gateway", category: "Fintech", icon: "fintech" },
  ];

  const categoriesData = ["All", "Fintech", "AI", "SaaS", "Healthtech", "EdTech", "Biotech"];

  // Dados dos depoimentos de investidores (exigem origem na própria page.tsx)
  const investorTestimonials: TestimonialData[] = [
    {
      name: "Ana Silva",
      testimonial: "A iSelfToken abriu portas para investimentos que eu não teria acesso. Curadoria impecável!",
      role: "Investidora"
    },
    {
      name: "Carlos Pereira",
      testimonial: "Plataforma confiável e transparente. Já obtive excelentes retornos nos meus investimentos.",
      role: "Investidor"
    },
    {
      name: "Juliana Costa",
      testimonial: "Interface intuitiva e suporte excepcional. Recomendo para quem quer diversificar a carteira.",
      role: "Investidora"
    }
  ];

  // Dados dos depoimentos de startups (exigem origem na própria page.tsx)
  const startupTestimonials: StartupTestimonialData[] = [
    {
      name: "Roberto Santos",
      testimonial: "A iSelfToken nos ajudou a captar recursos de forma rápida e eficiente. Processo transparente e investidores qualificados.",
      role: "CEO, TechFlow",
      linkedinUrl: "https://linkedin.com/in/roberto-santos",
      youtubeUrl: "https://youtube.com/@techflow",
      websiteUrl: "https://techflow.com.br"
    },
    {
      name: "Marina Oliveira",
      testimonial: "Excelente plataforma para startups em crescimento. O suporte da equipe fez toda a diferença no nosso processo de captação.",
      role: "Fundadora, GreenTech Solutions",
      linkedinUrl: "https://linkedin.com/in/marina-oliveira",
      websiteUrl: "https://greentech.solutions"
    },
    {
      name: "Felipe Costa",
      testimonial: "Conseguimos conectar com investidores alinhados com nossa visão. A iSelfToken é essencial para o ecossistema de inovação.",
      role: "CTO, FinanceAI",
      linkedinUrl: "https://linkedin.com/in/felipe-costa",
      youtubeUrl: "https://youtube.com/@financeai",
      websiteUrl: "https://financeai.com"
    }
  ];

  // Dados dos cards (exigem origem na própria page.tsx)
  const profileCards: ProfileCardData[] = [
    {
      id: "eco-tech",
      name: "EcoTech Solutions",
      categoryLabel: "Sustentabilidade",
      stageLabel: "Série A",
      trending: true,
      endingSoon: true,
      description:
        "Soluções inovadoras para energia renovável e sustentabilidade urbana.",
      image:
        "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=1600&auto=format&fit=crop",
      raisedLabel: "R$ 1.8M",
      goalLabel: "R$ 2.5M",
      percent: 72,
      collectedLabel: "72% arrecadado",
      timeLeftLabel: "3 dias restantes",
      valuationLabel: "R$ 15M",
      investorsCount: 142,
    },
    {
      id: "health-ai",
      name: "HealthAI",
      categoryLabel: "Saúde",
      stageLabel: "Seed",
      trending: true,
      endingSoon: false,
      description:
        "Plataforma de IA para triagem e acompanhamento de pacientes.",
      image:
        "https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=1600&auto=format&fit=crop",
      raisedLabel: "R$ 900k",
      goalLabel: "R$ 1.6M",
      percent: 56,
      collectedLabel: "56% arrecadado",
      timeLeftLabel: "12 dias restantes",
      valuationLabel: "R$ 8M",
      investorsCount: 89,
    },
    {
      id: "edtech-pro",
      name: "EdTech Pro",
      categoryLabel: "Educação",
      stageLabel: "Série B",
      trending: false,
      endingSoon: true,
      description:
        "Ferramentas de aprendizagem adaptativa para escolas públicas.",
      image:
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop",
      raisedLabel: "R$ 2.1M",
      goalLabel: "R$ 3.0M",
      percent: 70,
      collectedLabel: "70% arrecadado",
      timeLeftLabel: "5 dias restantes",
      valuationLabel: "R$ 22M",
      investorsCount: 203,
    },
    {
      id: "fintech-plus",
      name: "FinTech Plus",
      categoryLabel: "Fintech",
      stageLabel: "Série A",
      trending: true,
      endingSoon: false,
      description:
        "Plataforma de pagamentos digitais para pequenas empresas.",
      image:
        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1600&auto=format&fit=crop",
      raisedLabel: "R$ 1.2M",
      goalLabel: "R$ 2.0M",
      percent: 60,
      collectedLabel: "60% arrecadado",
      timeLeftLabel: "12 dias restantes",
      valuationLabel: "R$ 18M",
      investorsCount: 156,
    },
    {
      id: "biotech-innovations",
      name: "BioTech Innovations",
      categoryLabel: "Biotech",
      stageLabel: "Seed",
      trending: true,
      endingSoon: false,
      description:
        "Desenvolvimento de terapias genéticas para doenças raras.",
      image:
        "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=1600&auto=format&fit=crop",
      raisedLabel: "R$ 800K",
      goalLabel: "R$ 1.5M",
      percent: 53,
      collectedLabel: "53% arrecadado",
      timeLeftLabel: "18 dias restantes",
      valuationLabel: "R$ 12M",
      investorsCount: 89,
    },
  ];


  return (
    <div className="min-h-screen bg-[#000000] text-zinc-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-blue-500">
              iSelfToken
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <Link
              className="text-blue-500 hover:text-zinc-200 transition-colors"
              href="#"
            >
              iSelfToken Education
            </Link>
            <Link href="/login">
            <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-600/90 transition-colors">
              Entrar
            </Button>
            </Link>
          </nav>
          <div className="md:hidden">
            <span className="text-sm text-zinc-400">Menu</span>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-black">
          <div className="container mx-auto px-6 pt-20 md:pt-28 pb-16">
            <div className="flex flex-col items-center gap-8 text-center">
              <Image
                src="/hero.png"
                alt="iSelfToken"
                width={1024}
                height={512}
                priority
                sizes="(max-width: 768px) 90vw, (max-width: 1280px) 800px, 1024px"
                className="w-full max-w-2xl h-auto"
              />
              <p className="max-w-2xl text-zinc-400 text-lg md:text-xl">
                A iSelfToken conecta investidores a ativos digitais inovadores
                com alto potencial de crescimento.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link href="/login">
                <Button
                  variant="outline"
                  className="inline-flex bg-transparent items-center justify-center rounded-md border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors p-6 text-base font-medium"
                >
                  Explorar Oportunidades
                </Button>
                </Link>
                <Link href="/login">
                <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-600/90 transition-colors p-6 text-base font-medium" >
                  Comece a Investir
                </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Destaques (ProfileCard) */}
        <section id="explorar" className="bg-black py-12">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Rodadas de captação
              </h2>
            </div>
            <CarouselNav>
              {profileCards.map((item) => (
                <CarouselItem key={item.id} aria-label={`Card ${item.name}`}>
                  <ProfileCard data={item} />
                </CarouselItem>
              ))}
            </CarouselNav>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-black border-black/20 py-16">
          <div className="container mx-auto px-6">
            <div className="bg-gradient-to-l from-black/10 to-zinc-200/10 border border-zinc-800 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-3">
                  Pronto para começar a investir?
                </h3>
                <p className="text-zinc-400 mb-6">
                  Crie sua conta gratuita e tenha acesso às melhores
                  oportunidades de investimento em startups.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-1 text-sm text-zinc-300">
                    <Star className="h-4 w-4 text-yellow-500 mr-2" />
                    <span>Startups verificadas</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-zinc-300">
                    <Star className="h-4 w-4 text-yellow-500 mr-2" />
                    <span>Investimento mínimo baixo</span>
                  </div>
                </div>
              </div>
              <Button
                asChild
                className="bg-white text-black hover:bg-gray-100 px-6 py-3 font-medium"
              >
                <Link href="/register">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                  Criar Conta Gratuita
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Explore Opportunities */}
        <ExploreOpportunities
          opportunities={opportunitiesData}
          categories={categoriesData}
          selectedCategory="All"
        />

        {/* Depoimentos de Investidores */}
        <section className="bg-black py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-10">
              Depoimentos de quem já investe
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {investorTestimonials.map((testimonial, idx) => (
                <TestimonialCard key={idx} data={testimonial} />
              ))}
            </div>
          </div>
        </section>

        {/* Depoimentos de Startups */}
        <section className="bg-black py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-10">
              O que os fundadores de startups falam sobre nós
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {startupTestimonials.map((testimonial, idx) => (
                <StartupTestimonialCard key={idx} data={testimonial} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-300">
        <div className="container mx-auto px-6 py-12 border-t border-zinc-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 text-white font-bold">iSelfToken</div>
              <p className="text-sm text-zinc-400">
                Conectando investidores a ativos digitais inovadores.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Plataforma</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-blue-400">
                    Para Investidores
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400">
                    Para Projetos
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-blue-400">
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400">
                    Privacidade
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contato</h4>
              <ul className="space-y-2 text-sm">
                <li>Email</li>
                <li>Telefone</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-400">
            <p>
              &copy; {new Date().getFullYear()} iSelfToken. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
