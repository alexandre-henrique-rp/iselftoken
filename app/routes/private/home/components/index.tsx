import { useState, useEffect } from "react";
import type { Banner } from "~/types/homepage";

/**
 * @name BannerSlider
 * @description Componente de banner rotativo automático com indicador de progresso.
 *
 * @param {Banner[]} banners - Array de banners a serem exibidos.
 *
 * @returns {JSX.Element | null} Banner slider ou null se não houver banners.
 */
export function BannerSlider({ banners }: { banners: Banner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const duration = 5000;

  useEffect(() => {
    if (banners.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, duration);

    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-[95%] mx-auto h-70 md:h-80 rounded-2xl overflow-hidden shadow-2xl border border-border group">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <div className="absolute inset-0">
            <img
              src={banner.image}
              alt={banner.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-linear-to-r from-background via-background/60 to-transparent" />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold mb-4 w-fit border border-primary/20 backdrop-blur-sm">
              {banner.category}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              {banner.title}
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl line-clamp-2">
              {banner.description}
            </p>
          </div>
        </div>
      ))}

      <div className="absolute bottom-6 left-8 md:left-16 z-20 flex gap-3">
        {banners.map((_, index) => (
          <div
            key={index}
            className="h-1.5 w-12 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm"
          >
            <div
              className={`h-full bg-foreground rounded-full ${
                index === currentIndex
                  ? "animate-progress"
                  : index < currentIndex
                    ? "w-full"
                    : "w-0"
              }`}
              style={{
                animationDuration:
                  index === currentIndex ? `${duration}ms` : "0s",
                animationTimingFunction: "linear",
                animationFillMode: "forwards",
              }}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        .animate-progress { animation-name: progress; }
      `}</style>
    </div>
  );
}
