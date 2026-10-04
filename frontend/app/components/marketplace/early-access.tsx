import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { InitialsImage } from "~/components/ui/initials-image";
import type { EarlyAccessOpportunity } from "~/types/early-access-opportunity";
import { SealsRow } from "./category-visual";

export function EarlyAccess({ opportunities = [] }: { opportunities?: EarlyAccessOpportunity[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    loop: false,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!opportunities.length) return null;

  return (
    <section className="mb-12">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="text-primary font-bold text-[11px] tracking-widest uppercase mb-1 block">
            Pre-Seed & Seed
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Acesso Antecipado
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1.5">
            Participe de rodadas Pre-Seed e Seed com as startups mais promissoras do ecossistema.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={scrollPrev}
            aria-label="Anterior"
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-primary/20 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={scrollNext}
            aria-label="Próxima"
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-primary/20 transition-all"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {opportunities.map((item) => (
            <div
              key={item.id}
              className="shrink-0 basis-[260px] sm:basis-[280px] md:basis-[300px] lg:basis-[calc(25%-12px)]"
            >
              <div className="h-full p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 hover:border-primary/40 transition-all group flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <InitialsImage
                    name={item.name}
                    src={item.image}
                    alt={item.name}
                    className="h-10 w-10 shrink-0 rounded-xl border border-white/20"
                    fallbackClassName="bg-primary/20"
                    fallbackTextClassName="text-xs font-black"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-bold text-sm group-hover:text-primary transition-colors truncate">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold truncate">
                      {item.category}
                    </p>
                  </div>
                </div>

                <SealsRow seals={item.seals} size={20} max={5} />

                <div>
                  <div className="flex justify-between text-[10px] sm:text-[11px] mb-2 font-bold">
                    <span className="text-muted-foreground truncate mr-2">
                      {item.raised} / {item.goal}
                    </span>
                    <span className="text-primary font-black shrink-0">{item.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary shadow-[0_0_10px_rgba(213,0,249,0.5)] transition-all duration-1000"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>

                <button className="mt-auto w-full px-4 py-2 bg-primary/5 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all">
                  Ver Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
