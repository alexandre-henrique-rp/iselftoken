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
    const amount = el.clientWidth * 0.9;
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
        <div className="flex gap-4 px-20">
          {children}
        </div>
      </div>

      {/* Left gradient fade with progressive blur */}
      <div className="absolute left-0 top-0 bottom-0 w-20 pointer-events-none z-10">
        <div className="h-full w-full bg-gradient-to-r from-black/95 via-black/60 to-transparent backdrop-blur-[4px]" 
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
          "absolute left-2 top-1/2 -translate-y-1/2 z-20",
          "inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/80 border border-zinc-700",
          "text-zinc-200 hover:bg-black/90 backdrop-blur-sm shadow-lg"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Right gradient fade with progressive blur */}
      <div className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-10">
        <div className="h-full w-full bg-gradient-to-l from-black/95 via-black/60 to-transparent backdrop-blur-[4px]"
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
          "absolute right-2 top-1/2 -translate-y-1/2 z-20",
          "inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/80 border border-zinc-700",
          "text-zinc-200 hover:bg-black/90 backdrop-blur-sm shadow-lg"
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
        "min-w-[92%] sm:min-w-[80%] md:min-w-[65%] lg:min-w-[60%] xl:min-w-[55%]",
        className
      )}
      {...props}
    />
  );
}
