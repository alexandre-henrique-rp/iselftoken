'use client';

import React from 'react';
import { Carousel, Card } from '@/components/ui/apple-cards-carousel';
import { Startup } from '@/data/home-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AppleCarouselWrapperProps {
  title: string;
  startups: Startup[];
}

export function AppleCarouselWrapper({
  title,
  startups,
}: AppleCarouselWrapperProps) {
  const cards = startups.map((startup) => ({
    src: startup.image,
    title: startup.name,
    description: startup.description,
    id: startup.id,
    logo: startup.logo,
    selos: startup.selos,
    videoUrl: startup.videoUrl,
    content: (
      <div className="mb-4 rounded-3xl bg-white p-8 md:p-14 dark:bg-neutral-900">
        <div className="mb-6 flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={startup.logo} alt={`Logo da ${startup.name}`} />
            <AvatarFallback>{startup.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
              {startup.name}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {startup.selos.map((selo) => (
                <Badge key={selo} variant="secondary" className="text-xs">
                  {selo}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <p className="mb-8 text-base leading-relaxed font-normal text-neutral-600 md:text-lg dark:text-neutral-400">
          {startup.description}
        </p>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-neutral-800">
            <h4 className="mb-2 font-semibold text-neutral-800 dark:text-neutral-200">
              Informações da Startup
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Fundada em 2023, a startup tem como foco inovação e tecnologia
              disruptiva no mercado.
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-neutral-800">
            <h4 className="mb-2 font-semibold text-neutral-800 dark:text-neutral-200">
              Principais Métricas
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              10M+ usuários ativos, crescimento de 150% no último ano.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button className="flex-1 bg-[#d500f9] text-white hover:bg-[#d500f9]/90">
            Investir Agora
          </Button>
          <Button variant="outline" className="flex-1">
            Saber Mais
          </Button>
        </div>
      </div>
    ),
  }));

  const items = cards.map((card, index) => (
    <Card key={startups[index]?.id || index} card={card} index={index} />
  ));

  return (
    <section className="w-full py-8 sm:py-12">
      <div className="mb-6 px-4 sm:mb-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
      </div>
      <Carousel items={items} />
    </section>
  );
}
