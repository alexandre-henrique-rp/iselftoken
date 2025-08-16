import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ProfileCard } from '@/components/profile-card';
import { CarouselNav, CarouselItem } from '@/components/carousel-nav';
import { ExploreOpportunities } from '@/components/explore-opportunities';
import { TestimonialCard } from '@/components/testimonial-card';
import { StartupTestimonialCard } from '@/components/startup-testimonial-card';
import { Star } from 'lucide-react';
import { OpportunitiesData } from '@/data/oportunidades';
import { Categories } from '@/data/categoria';
import { InvestorTestimonials } from '@/data/testemunhos/investidor';
import { StartupTestimonials } from '@/data/testemunhos/startup';
import { ProfileCards } from '@/data/profile';

export default function Home() {
  const opportunitiesData = OpportunitiesData;
  const categoriesData = Categories;
  const investorTestimonials = InvestorTestimonials;
  const startupTestimonials = StartupTestimonials;
  const profileCards = ProfileCards;

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-200">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-blue-500">
              iSelfToken
            </span>
          </div>
          <nav className="hidden items-center gap-4 md:flex">
            <Link
              className="text-blue-500 transition-colors hover:text-zinc-200"
              href="#"
            >
              iSelfToken Education
            </Link>
            <Link href="/login">
              <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600/90">
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
          <div className="container mx-auto px-6 pt-20 pb-16 md:pt-28">
            <div className="flex flex-col items-center gap-8 text-center">
              <Image
                src="/hero.png"
                alt="iSelfToken"
                width={1024}
                height={512}
                priority
                sizes="(max-width: 768px) 90vw, (max-width: 1280px) 800px, 1024px"
                className="h-auto w-full max-w-2xl"
              />
              <p className="max-w-2xl text-lg text-zinc-400 md:text-xl">
                A iSelfToken conecta investidores a ativos digitais inovadores
                com alto potencial de crescimento.
              </p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="inline-flex items-center justify-center rounded-md border border-blue-500 bg-transparent p-6 text-base font-medium text-blue-400 transition-colors hover:bg-blue-500 hover:text-white"
                  >
                    Explorar Oportunidades
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 p-6 text-base font-medium text-white transition-colors hover:bg-blue-600/90">
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
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
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
        <section className="border-black/20 bg-black py-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-zinc-800 bg-gradient-to-l from-black/10 to-zinc-200/10 p-8 md:flex-row md:items-center">
              <div className="flex-1">
                <h3 className="mb-3 text-2xl font-bold text-white">
                  Pronto para começar a investir?
                </h3>
                <p className="mb-6 text-zinc-400">
                  Crie sua conta gratuita e tenha acesso às melhores
                  oportunidades de investimento em startups.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex items-center gap-1 text-sm text-zinc-300">
                    <Star className="mr-2 h-4 w-4 text-yellow-500" />
                    <span>Startups verificadas</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-zinc-300">
                    <Star className="mr-2 h-4 w-4 text-yellow-500" />
                    <span>Investimento mínimo baixo</span>
                  </div>
                </div>
              </div>
              <Button
                asChild
                className="bg-white px-6 py-3 font-medium text-black hover:bg-gray-100"
              >
                <Link href="/register">
                  <svg
                    className="mr-2 h-4 w-4"
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
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
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
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
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
        <div className="container mx-auto border-t border-zinc-800 px-6 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 font-bold text-white">iSelfToken</div>
              <p className="text-sm text-zinc-400">
                Conectando investidores a ativos digitais inovadores.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">Plataforma</h4>
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
              <h4 className="mb-4 font-semibold text-white">Legal</h4>
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
              <h4 className="mb-4 font-semibold text-white">Contato</h4>
              <ul className="space-y-2 text-sm">
                <li>Email</li>
                <li>Telefone</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-zinc-800 pt-8 text-center text-sm text-zinc-400">
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
