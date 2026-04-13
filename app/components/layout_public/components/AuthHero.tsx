import { CheckCircle, Shield } from "lucide-react";
import type { JSX } from "react";

/**
 * @name AuthHero
 * @description Hero visual para a coluna direita do login.
 *
 * @returns {JSX.Element} Coluna com imagem, overlay e badges.
 */
export function AuthHero(): JSX.Element {
  return (
    <section className="relative hidden overflow-hidden border-l border-border bg-card lg:flex">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
          alt="Investimento em tecnologia"
          className="h-full w-full object-cover opacity-35 mix-blend-luminosity transition-all duration-700 hover:scale-105 hover:opacity-50 hover:mix-blend-normal"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-background/85 to-transparent" />
      </div>

      <div className="relative z-20 flex w-full items-center justify-center p-10">
        <div className="w-full max-w-xl rounded-3xl border border-border/50 bg-background/40 p-8 shadow-lg shadow-black/10 backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Rodadas Abertas
            </div>
          </div>

          <h2 className="mb-6 text-3xl font-bold leading-tight text-foreground md:text-4xl">
            Invista em startups promissoras via tokenização de equity
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
            Conectamos investidores a fundadores em uma plataforma segura e
            acessível.
          </p>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-4 py-2 backdrop-blur-md">
              <Shield className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium text-foreground">
                Plataforma Regulada
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-4 py-2 backdrop-blur-md">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Investimento Acessível
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 -translate-x-1/3 translate-y-1/3 rounded-full bg-[#d500f9]/10 blur-[100px]" />
    </section>
  );
}
