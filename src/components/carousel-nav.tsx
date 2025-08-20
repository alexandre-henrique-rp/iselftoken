"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselNavProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CarouselNav({ className, children, ...props }: CarouselNavProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = viewportRef.current;
    if (!el) return;
    // Rola exatamente a largura do viewport para alinhar 1 card por vez no mobile
    const amount = el.clientWidth;
    el.scrollBy({ left: amount * dir, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)} {...props}>
      <div
        ref={viewportRef}
        className={cn(
          "overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "snap-x snap-mandatory"
        )}
        role="region"
        aria-roledescription="carrossel"
      >
        {/* No mobile, sem gap para não vazar próximo card; no md+ reintroduz gap */}
        <div className="flex gap-0 md:gap-4 px-0 md:px-12">
          {children}
        </div>
      </div>

      {/* Left gradient fade with progressive blur */}
      <div className="absolute left-0 top-0 bottom-0 w-20 pointer-events-none z-10">
        <div className="h-full w-full bg-gradient-to-r from-white/95 via-white/60 to-transparent backdrop-blur-[4px] dark:bg-gradient-to-r dark:from-black/95 dark:via-black/60 dark:to-transparent" 
             style={{
               maskImage: 'linear-gradient(to right, black 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0.4) 50%, transparent 100%)',
               WebkitMaskImage: 'linear-gradient(to right, black 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0.4) 50%, transparent 100%)'
             }} />
      </div>
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => scrollBy(-1)}
        className={cn(
          "absolute left-1 top-1/2 -translate-y-1/2 z-20",
          "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 border border-gray-300 text-gray-700 hover:bg-white/90",
          "dark:bg-black/80 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-black/90",
          "backdrop-blur-sm shadow-lg"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Right gradient fade with progressive blur */}
      <div className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-10">
        <div className="h-full w-full bg-gradient-to-l from-white/95 via-white/60 to-transparent backdrop-blur-[4px] dark:bg-gradient-to-l dark:from-black/95 dark:via-black/60 dark:to-transparent"
             style={{
               maskImage: 'linear-gradient(to left, black 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0.4) 50%, transparent 100%)',
               WebkitMaskImage: 'linear-gradient(to left, black 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0.4) 50%, transparent 100%)'
             }} />
      </div>
      <button
        type="button"
        aria-label="Próximo"
        onClick={() => scrollBy(1)}
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 z-20",
          "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 border border-gray-300 text-gray-700 hover:bg-white/90",
          "dark:bg-black/80 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-black/90",
          "backdrop-blur-sm shadow-lg"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export function CarouselItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "snap-start",
        // Mobile: 1 card por vez (sem espremimento)
        "min-w-full sm:min-w-full",
        // md: ~2 cards; lg+: ~3 cards
        "md:min-w-[50%] lg:min-w-[33.3333%] xl:min-w-[33.3333%]",
        // Espaçamento interno apenas no mobile para simular gap sem quebrar largura total
        "px-4 md:px-0",
        className
      )}
      {...props}
    />
  );
}
