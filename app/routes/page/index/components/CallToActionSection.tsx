import { CheckCircle, Rocket, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";

/**
 * @name CallToActionSection
 * @description Renderiza a secao "Como funciona" com dois cards de CTA.
 *
 * @returns {JSX.Element} Secao com chamadas para fundadores e investidores.
 *
 * @example
 * <CallToActionSection />
 *
 * Fluxo de execucao:
 * 1. Exibe cards com beneficios
 * 2. Direciona para cadastro ao clicar nos CTAs
 */
export function CallToActionSection() {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <section className="relative overflow-hidden bg-accent/10 py-24">
      <div className="absolute inset-0 bg-linear-to-b from-accent/40 via-background/80 to-background" />
      <div className="absolute top-0 h-px w-full bg-linear-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 h-px w-full bg-linear-to-r from-transparent via-border to-transparent" />
      <div className="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-fuchsia-600/10 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-foreground md:text-6xl">
            Como Funciona?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Uma plataforma completa para conectar quem quer captar com quem quer
            investir.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:gap-8">
          <article className="group relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/10 via-card to-card shadow-xl shadow-primary/15 transition-all duration-500 hover:border-primary/50">
            <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative p-8">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground md:text-3xl">
                Para Fundadores
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Capte investimento de forma segura, rapida e 100% digital.
                Tokenize seu equity e alcance investidores qualificados.
              </p>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Processo 100% digital e simplificado
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Acesso a investidores globais
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Suporte juridico e regulatorio
                </li>
              </ul>
              <Button
                type="button"
                className="mt-8 h-12 w-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                onClick={() => handleNavigate("/cadastro")}
              >
                <Rocket className="h-4 w-4" />
                Comece a captar agora
              </Button>
            </div>
          </article>

          <article className="group relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/10 via-card to-card shadow-xl shadow-primary/10 transition-all duration-500 hover:border-primary/50">
            <div className="absolute inset-0 bg-linear-to-br from-primary/15 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative p-8">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground md:text-3xl">
                Para Investidores
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Invista em startups promissoras com liquidez via tokenizacao de
                equity. Diversifique seu portfolio com valores acessiveis.
              </p>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Startups verificadas e curadas
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Investimento minimo acessivel
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Liquidez atraves de tokens
                </li>
              </ul>
              <Button
                type="button"
                className="mt-8 h-12 w-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                onClick={() => handleNavigate("/cadastro")}
              >
                <TrendingUp className="h-4 w-4" />
                Comece a investir agora
              </Button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
