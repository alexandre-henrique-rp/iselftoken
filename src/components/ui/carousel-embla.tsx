"use client";

import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * EmblaCarousel
 * Carrossel headless baseado em Embla, com setas e dots inclusos.
 * - Exibe 1 slide no mobile, 2 no md, 3 no lg+.
 * - Role por swipe ou botões.
 * - Acessível via aria.
 */
interface EmblaCarouselProps {
  children: React.ReactNode;
  className?: string;
  options?: EmblaOptionsType;
  showArrows?: boolean;
}

export function EmblaCarousel({ children, className, options, showArrows = false }: EmblaCarouselProps) {
  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start", ...options });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

  const onSelect = React.useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const scrollPrev = React.useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = (index: number) => emblaApi && emblaApi.scrollTo(index);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="overflow-hidden" ref={viewportRef}>
        {/* Gutters laterais para acomodar as setas sem cobrir os cards */}
        <div className="ml-0 flex touch-pan-y gap-4">
          {children}
        </div>
      </div>

      {/* Arrows - escondidas no mobile */}
      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={scrollPrev}
            className={cn(
              "hidden md:flex",
              "absolute left-2 top-1/2 -translate-y-1/2 z-10",
              "h-10 w-10 items-center justify-center rounded-full bg-white/80 border border-gray-300 text-gray-700 hover:bg-white/90",
              "dark:bg-black/80 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-black/90",
              "backdrop-blur-sm shadow-lg"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            aria-label="Próximo"
            onClick={scrollNext}
            className={cn(
              "hidden md:flex",
              "absolute right-2 top-1/2 -translate-y-1/2 z-10",
              "h-10 w-10 items-center justify-center rounded-full bg-white/80 border border-gray-300 text-gray-700 hover:bg-white/90",
              "dark:bg-black/80 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-black/90",
              "backdrop-blur-sm shadow-lg"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            aria-label={`Ir para slide ${index + 1}`}
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              selectedIndex === index ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-600"
            )}
            onClick={() => scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
}

/*
 * EmblaSlide
 * Slide responsivo: 1 por linha no mobile, 2 no md, 3 no lg+.
 */
export function EmblaSlide({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        // base: 100%, md: 50%, lg+: 33.333%
        "min-w-0 flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.3333%]",
        // evitar espremimento interno
        "px-1 md:px-1",
        className
      )}
    >
      {children}
    </div>
  );
}
