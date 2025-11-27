'use client';

import { Banner } from '@/data/banner-service';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

interface AdCarouselProps {
  banners: Banner[];
}

export function AdCarousel({ banners }: AdCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Função para ir para o próximo slide
  const nextSlide = useCallback(() => {
    setIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // Função para ir para o slide anterior
  const prevSlide = useCallback(() => {
    setIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Rotação automática
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const timer = setInterval(nextSlide, 5000); // Troca a cada 5 segundos

    return () => clearInterval(timer);
  }, [banners.length, isPaused, nextSlide]);

  if (!banners || banners.length === 0) return null;

  const currentBanner = banners[index];

  return (
    <div
      className="group relative h-40 w-full overflow-hidden bg-gray-900 sm:h-56 md:h-72 lg:h-80"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-full w-full">
        <Image
          key={currentBanner.image} // Key única baseada na URL da imagem para forçar re-render e animação se desejado
          src={currentBanner.image}
          alt={currentBanner.title}
          fill
          className="object-cover transition-opacity duration-500"
          priority
          sizes="100vw"
        />

        {/* Overlay gradiente para legibilidade (opcional, ajustado conforme design existente) */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60" />
      </div>

      {/* Botões de Navegação (Setas) - Visíveis apenas no hover em telas maiores */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/50"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/50"
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
              setIndex(idx);
            }}
            className={`h-2 w-2 rounded-full transition-all ${
              idx === index ? 'w-6 bg-white' : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Ir para banner ${idx + 1}`}
          />
        ))}
      </div>

      {/* Contador numérico discreto */}
      <div className="pointer-events-none absolute top-2 right-2 z-20 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur-md">
        {index + 1} / {banners.length}
      </div>
    </div>
  );
}
