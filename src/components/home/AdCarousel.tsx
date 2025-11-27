'use client';

import { Banner } from '@/data/banner-service';
import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

interface AdCarouselProps {
  banners: Banner[];
}

export function AdCarousel({ banners }: AdCarouselProps) {
  const [index, setIndex] = useState(0);

  // Configuração do Embla Carousel com Autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);

  // Atualiza o índice atual quando o slide muda
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect(); // Seta estado inicial
  }, [emblaApi, onSelect]);

  // Funções de navegação
  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi],
  );
  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi],
  );
  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi],
  );

  if (!banners || banners.length === 0) return null;

  return (
    <div className="group relative h-40 w-full bg-gray-900 sm:h-56 md:h-72 lg:h-80">
      {/* Embla Viewport e Container */}
      <div className="h-full w-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {banners.map((banner) => (
            <div
              className="relative h-full min-w-0 flex-[0_0_100%]"
              key={banner.id || banner.image}
            >
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                className="object-cover"
                priority={index === 0} // Prioriza apenas a primeira imagem
                sizes="100vw"
              />
              {/* Overlay gradiente */}
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60" />
            </div>
          ))}
        </div>
      </div>

      {/* Botões de Navegação (Setas) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              scrollPrev();
            }}
            className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/50"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              scrollNext();
            }}
            className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/50"
            aria-label="Próximo banner"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Indicadores (Dots) */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              scrollTo(idx);
            }}
            className={`h-2 w-2 rounded-full transition-all ${
              idx === index ? 'w-6 bg-white' : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Ir para banner ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
