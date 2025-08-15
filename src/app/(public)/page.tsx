import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ProfileCard, type ProfileCardData } from "@/components/profile-card";
import { CarouselNav, CarouselItem } from "@/components/carousel-nav";
import { Star } from "lucide-react";

export default function Home() {
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
  ];

  const recentInvestments = [
    { startup: "EcoTech Solutions", amount: "R$ 50.000", date: "15 Jan 2025", status: "Ativo", roi: "+15%" },
    { startup: "HealthAI", amount: "R$ 75.000", date: "8 Jan 2025", status: "Ativo", roi: "+8%" },
    { startup: "EdTech Pro", amount: "R$ 100.000", date: "22 Dez 2024", status: "Ativo", roi: "+22%" },
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
            <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-600/90 transition-colors">
              Entrar
            </Button>
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
                className="w-full max-w-xl h-auto"
              />
              <p className="max-w-2xl text-zinc-400 text-lg md:text-xl">
                A iSelfToken conecta investidores a ativos digitais inovadores
                com alto potencial de crescimento.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="inline-flex bg-transparent items-center justify-center rounded-md border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors p-6 text-base font-medium"
                >
                  Explorar Oportunidades
                </Button>
                <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-600/90 transition-colors p-6 text-base font-medium">
                  Comece a Investir
                </Button>
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

        {/* Depoimentos */}
        <section className="bg-zinc-950 py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-10">
              O que Nossos Investidores Dizem
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {["Ana Silva", "Carlos Pereira", "Juliana Costa"].map((name) => (
                <div
                  key={name}
                  className="bg-black rounded-xl border border-zinc-800"
                >
                  <div className="p-6">
                    <p className="text-zinc-400 italic">
                      A iSelfToken abriu portas para investimentos que eu não
                      teria acesso. Curadoria impecável!
                    </p>
                  </div>
                  <div className="flex items-center p-6 pt-0">
                    <div className="h-12 w-12 rounded-full bg-zinc-800 mr-4" />
                    <div>
                      <p className="font-semibold text-zinc-100">{name}</p>
                      <p className="text-sm text-blue-400">Investidor(a)</p>
                    </div>
                  </div>
                </div>
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
