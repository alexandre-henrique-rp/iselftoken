import { useState, useEffect, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import type { BannerSlide } from "~/types/banner-slide";

const AUTO_PLAY_MS = 4000;

export function MarketplaceBanner({ slides }: { slides: BannerSlide[] }) {
  const [current, setCurrent] = useState(0);
  const total = slides.length;

  // Empty state: nada para mostrar. Caller (marketing.tsx) também faz guard,
  // mas defensivo aqui evita o "buraco de 340px" se for usado fora do home.
  if (total === 0) return null;

  const next = useCallback(() => setCurrent((i) => (i + 1) % total), [total]);

  useEffect(() => {
    const timer = setInterval(next, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative w-full h-[340px] sm:h-[300px] lg:h-[360px] overflow-hidden rounded-3xl mb-8">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <div className="absolute inset-0">
            <img
              alt={slide.title}
              className="w-full h-full object-cover opacity-40 grayscale"
              src={slide.image}
            />
            <div className="absolute inset-0 bg-linear-to-b from-black via-black/20 sm:via-black/40 to-black" />
          </div>

          <div className="relative z-10 h-full flex items-center justify-center text-center px-4 sm:px-6">
            <div className="max-w-5xl">
              <div className="inline-block mb-3 sm:mb-4 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-md">
                <span className="text-primary font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.2em]">{slide.badge}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-on-surface mb-3 sm:mb-4 leading-tight">
                {slide.title} <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text kinetic-gradient">{slide.highlight}</span>
              </h1>

              <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-2xl mx-auto font-light leading-relaxed mb-4 sm:mb-6">
                {slide.description}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <button className="w-full sm:w-auto kinetic-gradient text-black font-bold text-sm px-6 py-2.5 rounded-full flex items-center justify-center gap-2 group transition-all hover:scale-105 shadow-[0_0_30px_rgba(213,0,249,0.3)]">
                  {slide.primaryLabel}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 text-on-surface font-semibold text-sm px-6 py-2.5 rounded-full transition-all">
                  {slide.secondaryLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
