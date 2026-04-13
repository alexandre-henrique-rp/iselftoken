<<<<<<< Updated upstream
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ProfileCard } from '@/components/profile-card';
import { CarouselNav, CarouselItem } from '@/components/carousel-nav';
import { ExploreOpportunities } from '@/components/explore-opportunities';
import { TestimonialCard } from '@/components/testimonial-card';
import { StartupTestimonialCard } from '@/components/startup-testimonial-card';
import { Star } from 'lucide-react';
=======
import { EmblaCarousel, EmblaSlide } from '@/components/ui/carousel-embla';
import { MobileMenu } from '@/components/mobile-menu';
import { ExploreOpportunities } from '@/components/explore-opportunities';
import { HeaderTr } from '@/components/header-tr';
import { LanguageSelect } from '@/components/language-select';
import { ProfileCard } from '@/components/profile-card';
import { StartupTestimonialCard } from '@/components/startup-testimonial-card';
import { TestimonialCard } from '@/components/testimonial-card';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { TrText } from '@/components/tr-text';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ProfileCard2 } from '@/components/profile-card2';
import { Categorias, StartupTypes } from '@/types/ProfileTypes';
>>>>>>> Stashed changes
import { OpportunitiesData } from '@/data/oportunidades';
import { Categories } from '@/data/categoria';
import { InvestorTestimonials } from '@/data/testemunhos/investidor';
import { StartupTestimonials } from '@/data/testemunhos/startup';
import { ProfileCards } from '@/data/profile';
<<<<<<< Updated upstream
import { LanguageSelect } from '@/components/language-select';
import { HeaderTr } from '@/components/header-tr';
import { TrText } from '@/components/tr-text';


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
=======

const getAllStartups = async () => {
  // const baseUrl = 'http://localhost:3000';
  
  // try {
  //   const response = await fetch(`${baseUrl}/api/startup`);
    
  //   if (!response.ok) {
  //     throw new Error(`HTTP error! status: ${response.status}`);
  //   }
    
  //   const data = await response.json();
  //   return data;
  // } catch (error) {
  //   console.error('Erro ao buscar dados das startups:', error);
  //   return {
  //     oportunidades: [],
  //     categorias: [],
  //     testemunhosInvestidor: [],
  //     testemunhosStartup: [],
  //     campeao: [],
  //     verificado: [],
  //     acelerado: [],
  //     aprovadas: [],
  //   };
  // }
      const opportunitiesData = OpportunitiesData;
      const categoriesData = Categories as Categorias[];
      const investorTestimonials = InvestorTestimonials;
      const startupTestimonials = StartupTestimonials;
      const profileCards = ProfileCards;
  
      const data: StartupTypes.marketingData = {
        oportunidades: opportunitiesData,
        categorias: categoriesData,
        testemunhosInvestidor: investorTestimonials,
        testemunhosStartup: startupTestimonials,
        campeao: profileCards,
        verificado: profileCards,
        acelerado: profileCards,
        aprovadas: profileCards,
      };
  return data;
};

export default async function Home() {
  const dados: StartupTypes.marketingData = await getAllStartups();

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
>>>>>>> Stashed changes
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-blue-500">
              iSelfToken
            </span>
          </div>
          <nav className="hidden items-center gap-4 md:flex">
            {/* Seletor de idioma (Client Component) */}
<<<<<<< Updated upstream
            <LanguageSelect defaultLocale="pt" />
            <Link href="/login">
              <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600/90">
                Entrar
=======
            <LanguageSelect defaultLocale="pt-BR" />
            <AnimatedThemeToggler />
            <Link href="/login">
              <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600/90">
                <TrText k="home.header.login" />
>>>>>>> Stashed changes
              </Button>
            </Link>
          </nav>
          <div className="md:hidden">
<<<<<<< Updated upstream
            <span className="text-sm text-zinc-400">Menu</span>
=======
            <MobileMenu />
>>>>>>> Stashed changes
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
<<<<<<< Updated upstream
        <section className="bg-black">
          <div className="container mx-auto px-6 pt-20 pb-16 md:pt-28">
            <div className="flex flex-col items-center gap-8 text-center">
=======
        <section className="bg-background">
          <div className="container mx-auto px-6 pt-20 pb-16 md:pt-28">
            <div className="flex flex-col items-center gap-8 text-center">
              {/* Imagem para tema escuro */}
>>>>>>> Stashed changes
              <Image
                src="/hero.png"
                alt="iSelfToken"
                width={1024}
                height={512}
                priority
                sizes="(max-width: 768px) 90vw, (max-width: 1280px) 800px, 1024px"
<<<<<<< Updated upstream
                className="h-auto w-full max-w-2xl"
              />
              <HeaderTr />
              <TrText
                k="home.hero.subtitle"
                as="p"
                className="max-w-2xl text-lg text-zinc-400 md:text-xl"
=======
                className="hidden h-auto w-full max-w-2xl dark:block"
              />
              {/* Imagem para tema claro */}
              <Image
                src="/hero_light.png"
                alt="iSelfToken"
                width={1024}
                height={512}
                priority
                sizes="(max-width: 768px) 90vw, (max-width: 1280px) 800px, 1024px"
                className="h-auto w-full max-w-2xl dark:hidden"
              />
              <HeaderTr />
              
              <TrText
                k="home.hero.subtitle"
                as="p"
                className="text-muted-foreground max-w-2xl text-lg md:text-xl"
>>>>>>> Stashed changes
              />
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="inline-flex items-center justify-center rounded-md border border-blue-500 bg-transparent p-6 text-base font-medium text-blue-400 transition-colors hover:bg-blue-500 hover:text-white"
                  >
                    <TrText k="home.hero.cta.raise" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 p-6 text-base font-medium text-white transition-colors hover:bg-blue-600/90">
                    <TrText k="home.hero.cta.invest" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Destaques (ProfileCard) */}
<<<<<<< Updated upstream
        <section id="explorar" className="bg-black py-12">
=======
        <section id="explorar" className="bg-background py-12">
>>>>>>> Stashed changes
          <div className="container mx-auto px-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                <TrText k="home.sections.raising_title" />
              </h2>
            </div>
<<<<<<< Updated upstream
            <CarouselNav>
              {profileCards.map((item) => (
                <CarouselItem key={item.id} aria-label={`Card ${item.name}`}>
                  <ProfileCard data={item} />
                </CarouselItem>
              ))}
            </CarouselNav>
=======
            <EmblaCarousel>
              {dados.campeao.map((item) => (
                <EmblaSlide key={item.id}>
                  <ProfileCard data={item} />
                </EmblaSlide>
              ))}
            </EmblaCarousel>
>>>>>>> Stashed changes
          </div>
        </section>

        {/* CTA */}
<<<<<<< Updated upstream
        <section className="border-black/20 bg-black py-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-zinc-800 bg-gradient-to-l from-black/10 to-zinc-200/10 p-8 md:flex-row md:items-center">
              <div className="flex-1">
                <h3 className="mb-3 text-2xl font-bold text-white">
                  <TrText k="home.cta.title" />
                </h3>
                <TrText k="home.cta.subtitle" as="p" className="mb-6 text-zinc-400" />
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex items-center gap-1 text-sm text-zinc-300">
                    <Star className="mr-2 h-4 w-4 text-yellow-500" />
                    <TrText k="home.cta.bullets.verified" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-zinc-300">
=======
        <section className="border-border/20 bg-background py-16">
          <div className="container mx-auto px-6">
            <div className="border-border flex flex-col items-start justify-between gap-6 rounded-xl border bg-linear-to-r from-[#d500f9] to-black p-8 md:flex-row md:items-center dark:border-zinc-800 dark:bg-linear-to-l dark:from-black/10 dark:to-zinc-200/10">
              <div className="flex-1">
                <h3 className="text-foreground mb-3 text-2xl font-bold">
                  <TrText k="home.cta.title" />
                </h3>
                <TrText
                  k="home.cta.subtitle1"
                  as="p"
                  className="mb-6 text-white"
                />
                <TrText
                  k="home.cta.subtitle2"
                  as="p"
                  className="mb-6 text-white"
                />
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex items-center gap-1 text-sm text-white">
                    <Star className="mr-2 h-4 w-4 text-yellow-500" />
                    <TrText k="home.cta.bullets.verified" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-white">
>>>>>>> Stashed changes
                    <Star className="mr-2 h-4 w-4 text-yellow-500" />
                    <TrText k="home.cta.bullets.low_minimum" />
                  </div>
                </div>
              </div>
<<<<<<< Updated upstream
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
                  <TrText k="home.cta.button" />
                </Link>
              </Button>
=======
              <div className="flex flex-col items-center gap-4">
                <Button
                  asChild
                  className="bg-[#d500f9] text-background px-6 py-3 font-medium hover:opacity-70 dark:bg-white"
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
                    <TrText k="home.cta.button1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-[#d500f9] text-background px-6 py-3 font-medium hover:opacity-70 dark:bg-white"
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
                    <TrText k="home.cta.button2" />
                  </Link>
                </Button>
              </div>
>>>>>>> Stashed changes
            </div>
          </div>
        </section>

<<<<<<< Updated upstream
        {/* Explore Opportunities */}
        <ExploreOpportunities
          opportunities={opportunitiesData}
          categories={categoriesData}
=======
        {/* Startups verificadas */}
        <section id="explorar" className="bg-background py-3">
          <div className="container mx-auto px-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Startups Verificadas
              </h2>
            </div>
            <EmblaCarousel>
              {dados.verificado.map((item) => (
                <EmblaSlide key={item.id}>
                  <ProfileCard2 data={item} />
                </EmblaSlide>
              ))}
            </EmblaCarousel>
          </div>
        </section>

        {/* Startups aceleradas */}
        <section id="explorar" className="bg-background py-3">
          <div className="container mx-auto px-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Startups Aceleradas
              </h2>
            </div>
            <EmblaCarousel>
              {dados.acelerado.map((item) => (
                <EmblaSlide key={item.id}>
                  <ProfileCard2 data={item} />
                </EmblaSlide>
              ))}
            </EmblaCarousel>
          </div>
        </section>

        {/* startup em fase de aprovação */}
        <section id="explorar" className="bg-background py-3">
          <div className="container mx-auto px-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Startups em Fase de Aprovação
              </h2>
            </div>
            <EmblaCarousel>
              {dados.aprovadas.map((item) => (
                <EmblaSlide key={item.id}>
                  <ProfileCard2 data={item} />
                </EmblaSlide>
              ))}
            </EmblaCarousel>
          </div>
        </section>

        {/* Explore Opportunities */}
        <ExploreOpportunities
          opportunities={dados.oportunidades}
          categories={dados.categorias}
>>>>>>> Stashed changes
          selectedCategory="All"
        />

        {/* Depoimentos de Investidores */}
<<<<<<< Updated upstream
        <section className="bg-black py-16">
          <div className="container mx-auto px-6">
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
              <TrText k="home.testimonials.investors_title" />
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {investorTestimonials.map((testimonial, idx) => (
=======
        <section className="bg-background py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-foreground mb-10 text-center text-3xl font-bold tracking-tight">
              <TrText k="home.testimonials.investors_title" />
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {dados.testemunhosInvestidor.map((testimonial, idx) => (
>>>>>>> Stashed changes
                <TestimonialCard key={idx} data={testimonial} />
              ))}
            </div>
          </div>
        </section>

        {/* Depoimentos de Startups */}
<<<<<<< Updated upstream
        <section className="bg-black py-16">
          <div className="container mx-auto px-6">
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
              <TrText k="home.testimonials.startups_title" />
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {startupTestimonials.map((testimonial, idx) => (
=======
        <section className="bg-background py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-foreground mb-10 text-center text-3xl font-bold tracking-tight">
              <TrText k="home.testimonials.startups_title" />
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {dados.testemunhosStartup.map((testimonial, idx) => (
>>>>>>> Stashed changes
                <StartupTestimonialCard key={idx} data={testimonial} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
<<<<<<< Updated upstream
      <footer className="bg-zinc-900 text-zinc-300">
        <div className="container mx-auto border-t border-zinc-800 px-6 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 font-bold text-white">iSelfToken</div>
              <TrText k="home.footer.description" as="p" className="text-sm text-zinc-400" />
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white"><TrText k="home.footer.platform" /></h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-blue-400"><TrText k="home.footer.for_investors" /></a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400"><TrText k="home.footer.for_projects" /></a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white"><TrText k="home.footer.legal" /></h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className="transition-colors hover:text-blue-400"
=======
      <footer className="dark:bg-background text-muted-foreground bg-zinc-700">
        <div className="border-border container mx-auto border-t px-6 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 font-bold text-white">iSelfToken</div>
              <TrText
                k="home.footer.description"
                as="p"
                className="text-sm text-white"
              />
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">
                <TrText k="home.footer.platform" />
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-white hover:text-blue-500">
                    <TrText k="home.footer.for_investors" />
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white hover:text-blue-500">
                    <TrText k="home.footer.for_projects" />
                  </a>
                </li>
                <li>
                  <Link
                    className="text-white transition-colors hover:text-blue-500"
>>>>>>> Stashed changes
                    href="#"
                  >
                    <TrText k="home.footer.education" />
                  </Link>
                </li>
<<<<<<< Updated upstream
                <li>
                  <Link href="#" className="hover:text-blue-400"><TrText k="home.footer.terms" /></Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-400"><TrText k="home.footer.privacy" /></Link>
=======
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">
                <TrText k="home.footer.legal" />
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-white hover:text-blue-500">
                    <TrText k="home.footer.terms" />
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-white hover:text-blue-500">
                    <TrText k="home.footer.privacy" />
                  </Link>
>>>>>>> Stashed changes
                </li>
              </ul>
            </div>
            <div>
<<<<<<< Updated upstream
              <h4 className="mb-4 font-semibold text-white"><TrText k="home.footer.contact" /></h4>
              <ul className="space-y-2 text-sm">
                <li><TrText k="home.footer.email" /></li>
                <li><TrText k="home.footer.phone" /></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-zinc-800 pt-8 text-center text-sm text-zinc-400">
            <p>
              &copy; {new Date().getFullYear()} iSelfToken. <TrText k="home.footer.rights" />
=======
              <h4 className="mb-4 font-semibold text-white">
                <TrText k="home.footer.contact" />
              </h4>
              <ul className="space-y-2 text-sm text-white">
                <li>
                  <TrText k="home.footer.email" />
                </li>
                <li>
                  <TrText k="home.footer.phone" />
                </li>
              </ul>
            </div>
          </div>
          <div className="border-border mt-12 border-t pt-8 text-center text-sm text-white">
            <p>
              &copy; {new Date().getFullYear()} iSelfToken.{' '}
              <TrText k="home.footer.rights" />
>>>>>>> Stashed changes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
