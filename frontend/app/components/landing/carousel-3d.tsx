import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";

const POSITION_STYLES: Record<number, { x: string; scale: number; rotateY: number; opacity: number; zIndex: number }> = {
  [-2]: { x: "-70%", scale: 0.5, rotateY: 55, opacity: 0, zIndex: 1 },
  [-1]: { x: "-115%", scale: 0.85, rotateY: 30, opacity: 0.55, zIndex: 5 },
  [0]:  { x: "0%", scale: 1, rotateY: 0, opacity: 1, zIndex: 10 },
  [1]:  { x: "115%", scale: 0.85, rotateY: -30, opacity: 0.55, zIndex: 5 },
  [2]:  { x: "70%", scale: 0.5, rotateY: -55, opacity: 0, zIndex: 1 },
};

const DEFAULT_STYLE = { x: "0%", scale: 0, rotateY: 0, opacity: 0, zIndex: 0 };

interface Carousel3DProps<T> {
  items: T[];
  renderItem: (item: T, isCenter: boolean) => ReactNode;
  title?: string;
  subtitle?: string;
  height?: string;
  maxWidth?: string;
  sectionClassName?: string;
}

export function Carousel3D<T>({
  items,
  renderItem,
  title,
  subtitle,
  height = "820px",
  maxWidth = "480px",
  sectionClassName,
}: Carousel3DProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalItems = items.length;

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalItems);
  }, [totalItems]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);
  }, [totalItems]);

  const visibleSlots = Math.min(5, totalItems);
  const halfSlots = Math.floor(visibleSlots / 2);

  const carouselItems = Array.from({ length: visibleSlots }, (_, i) => {
    const offset = i - halfSlots;
    const idx = (currentIndex + offset + totalItems) % totalItems;
    return { index: idx, position: offset };
  });

  return (
    <section className={cn("py-12 lg:py-16 overflow-hidden", sectionClassName)}>
      {title && (
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 mb-6 flex justify-between items-end">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tighter mb-2">{title}</h3>
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-90"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-90"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div
        className="relative flex justify-center items-center w-full"
        style={{ perspective: "1800px", height }}
      >
        {carouselItems.map(({ index: itemIndex, position }) => {
          const styles = POSITION_STYLES[position] ?? DEFAULT_STYLE;
          const isCenter = position === 0;

          return (
            <motion.div
              key={`carousel-${itemIndex}`}
              initial={false}
              animate={{
                x: styles.x,
                scale: styles.scale,
                rotateY: styles.rotateY,
                opacity: styles.opacity,
                zIndex: styles.zIndex,
              }}
              transition={{
                type: "spring",
                stiffness: 80,
                damping: 20,
                mass: 1,
              }}
              className="absolute h-full"
              style={{ transformStyle: "preserve-3d", width: "100%", maxWidth }}
            >
              {renderItem(items[itemIndex], isCenter)}
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center gap-3 mt-8">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentIndex
                ? "w-10 bg-primary kinetic-glow"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
    </section>
  );
}
