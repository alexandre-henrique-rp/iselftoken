import * as React from "react";
import { cn } from "@/lib/utils";

// Carrossel simples baseado em CSS scroll-snap (sem JS cliente)
// - Acessível por teclado (tab/shift+tab entre cartões)
// - Sem dependências extras
// - Server Component-friendly

export function CarouselRoot({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative",
        className
      )}
      {...props}
    />
  );
}

export function CarouselViewport({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-x-auto overflow-y-hidden",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "snap-x snap-mandatory",
        className
      )}
      role="region"
      aria-roledescription="carrossel"
      {...props}
    />
  );
}

export function CarouselTrack({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex gap-4",
        className
      )}
      {...props}
    />
  );
}

export interface CarouselItemProps extends React.HTMLAttributes<HTMLDivElement> {
  ariaLabel?: string;
}

export function CarouselItem({ className, ariaLabel, ...props }: CarouselItemProps) {
  return (
    <div
      className={cn(
        // Larguras responsivas por item (1 / 1,2 / 2,2 / 3)
        "snap-start",
        // Mobile: 1 card por vez (sem espremimento)
        "min-w-full sm:min-w-full",
        // md: ~2 cards por tela; lg+: ~3 cards
        "md:min-w-[50%] lg:min-w-[33.3333%] xl:min-w-[33.3333%]",
        className
      )}
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      {...props}
    />
  );
}

export const Carousel = {
  Root: CarouselRoot,
  Viewport: CarouselViewport,
  Track: CarouselTrack,
  Item: CarouselItem,
};
