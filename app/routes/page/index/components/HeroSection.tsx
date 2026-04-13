import { Rocket, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";

/**
 * @name HeroSection
 * @description Renderiza o hero principal com titulo, texto e CTAs.
 *
 * @returns {JSX.Element} Secao hero da homepage.
 *
 * @example
 * <HeroSection />
 *
 * Fluxo de execucao:
 * 1. Exibe mensagens de valor
 * 2. Direciona para cadastro ao acionar CTAs
 */
export function HeroSection() {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <section className="relative overflow-hidden bg-accent/5 pb-32 pt-40">
      <div className="absolute inset-0 bg-linear-to-b from-primary/10 via-transparent to-transparent" />
      <div className="absolute left-1/4 top-20 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="absolute right-1/4 top-40 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />

      <div className="container relative z-10 mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="mb-6 text-6xl font-bold leading-none text-primary md:text-8xl lg:text-9xl">
          iSelfToken
        </h1>
        <p className="mb-12 text-4xl font-extrabold text-muted-foreground md:text-6xl lg:text-7xl">
          Crowdfunding
        </p>
        <p className="mb-4 text-xl font-medium text-foreground md:text-2xl">
          Invista em startups promissoras via tokenização de equity
        </p>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Conectamos investidores visionários a fundadores inovadores em uma
          plataforma segura, transparente e 100% digital. Democratizando o
          acesso ao venture capital.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            type="button"
            className="h-14 bg-primary px-8 py-3.5 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
            onClick={() => handleNavigate("/cadastro")}
          >
            <Rocket className="mr-2 h-5 w-5" />
            Captar Investimento
          </Button>
          <Button
            type="button"
            className="h-14 border border-primary/30 bg-primary/10 px-8 py-3.5 text-lg font-semibold text-primary shadow-lg shadow-primary/10 hover:bg-primary/20"
            onClick={() => handleNavigate("/cadastro")}
          >
            <TrendingUp className="mr-2 h-5 w-5" />
            Comece a Investir
          </Button>
        </div>
      </div>
    </section>
  );
}
