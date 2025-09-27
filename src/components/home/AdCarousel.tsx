'use client';

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';

interface AdCarouselProps {
  banners: { id: number; image: string; title: string }[];
}

export function AdCarousel({ banners }: AdCarouselProps) {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay()]);

  return (
    <div className="w-full overflow-hidden relative" ref={emblaRef}>
      <div className="flex">
        {banners.map(banner => (
          <div className="flex-[0_0_100%] min-w-0 relative h-48 sm:h-64 md:h-80 lg:h-96" key={banner.id}>
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              style={{ objectFit: 'cover' }}
              priority={banner.id === banners[0]?.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
