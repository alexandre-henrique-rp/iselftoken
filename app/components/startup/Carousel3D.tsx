import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState } from "react";
import { cn } from "~/lib/utils";

interface Carousel3DProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  cardHeight?: number;
  cardSpacing?: number;
}

/**
 * @name Carousel3D
 * @description Renderiza um carrossel 3D horizontal com controles e efeito de profundidade.
 *
 * @param {string} title - Título opcional da seção.
 * @param {React.ReactNode} children - Cards renderizados no carrossel.
 * @param {string} className - Classes adicionais para o container.
 * @param {number} cardHeight - Altura do carrossel em pixels.
 * @param {number} cardSpacing - Espaçamento entre cards em pixels.
 *
 * @returns {JSX.Element} Carrossel 3D com navegação e indicadores.
 *
 * @example
 * <Carousel3D title="Rodadas de Captação">{cards}</Carousel3D>
 *
 * Fluxo de execução:
 * 1. Calcula posição e estilo de cada card baseado no índice ativo
 * 2. Aplica transformações 3D para criar efeito de profundidade
 * 3. Navega entre cards com animações suaves
 */
export function Carousel3D({
  title,
  children,
  className,
  cardHeight = 600,
  cardSpacing = 320,
}: Carousel3DProps) {
  const items = React.Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalItems = items.length;

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % totalItems);
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
  };

  const getCardStyle = (index: number) => {
    let diff = index - activeIndex;

    // Normaliza para loop infinito visual
    if (diff > totalItems / 2) diff = diff - totalItems;
    if (diff < -totalItems / 2) diff = diff + totalItems;

    const absDiff = Math.abs(diff);

    // Card ativo (centro)
    if (diff === 0) {
      return {
        transform: "translateX(-50%) scale(1) rotateY(0deg)",
        left: "50%",
        zIndex: 50,
        opacity: 1,
        filter: "brightness(1)",
        pointerEvents: "auto" as const,
      };
    }

    // Cards laterais
    const direction = diff > 0 ? 1 : -1;
    const offset = direction * (absDiff * cardSpacing + 60);
    const scale = Math.max(0.75, 1 - absDiff * 0.12);
    const opacity = Math.max(0, 1 - absDiff * 0.35);
    const zIndex = 40 - absDiff * 10;
    const brightness = Math.max(0.4, 1 - absDiff * 0.25);
    const rotateY = direction * -8 * Math.min(absDiff, 2);

    return {
      transform: `translateX(calc(-50% + ${offset}px)) scale(${scale}) rotateY(${rotateY}deg)`,
      left: "50%",
      zIndex: Math.max(0, zIndex),
      opacity: absDiff > 2 ? 0 : opacity,
      filter: `brightness(${brightness})`,
      pointerEvents: absDiff > 1 ? ("none" as const) : ("auto" as const),
    };
  };

  return (
    <section className={cn("relative", className)}>
      {title && (
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            {title}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-muted p-3 text-muted-foreground transition hover:border-muted-foreground/40 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Voltar no carrossel"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-muted p-3 text-muted-foreground transition hover:border-muted-foreground/40 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Avançar no carrossel"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {!title && (
        <div className="flex justify-end gap-2 mb-8">
          <button
            onClick={goPrev}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-muted p-3 text-muted-foreground transition hover:border-muted-foreground/40 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Voltar no carrossel"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goNext}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-muted p-3 text-muted-foreground transition hover:border-muted-foreground/40 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Avançar no carrossel"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Container do Carousel 3D */}
      <div
        className="relative overflow-hidden"
        style={{
          height: `${cardHeight}px`,
          perspective: "1200px",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {items.map((child, index) => (
            <div
              key={index}
              className="absolute transition-all duration-500 ease-out cursor-pointer"
              style={{
                ...getCardStyle(index),
                transformStyle: "preserve-3d",
              }}
              onClick={() => setActiveIndex(index)}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Indicadores */}
      <div className="flex justify-center gap-2 mt-6">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "bg-blue-500 w-8"
                : "bg-muted hover:bg-muted/80 w-2"
            }`}
            aria-label={`Ir para card ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
