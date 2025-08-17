'use client';

import {
  IconArrowRight,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeroSearch } from '@/components/investidor/HeroSearch';
import { ProductCard } from '@/components/investidor/ProductCard';
import { AppList } from '@/components/investidor/AppList';
import { EmptyState } from '@/components/investidor/EmptyState';
import type { AppItem, ProductItem } from '@/components/investidor/types';

// Tipos importados de '@/components/investidor/types'

/**
 * InvestorHome
 * Página de marketplace para investidores.
 * Exibe:
 * - Faixa de banners promocionais (cards grandes com imagem/gradiente, título e CTA)
 * - Seção "Em alta" com tabs e listagem ranqueada de apps/startups
 * Mantém padrão de cores e espaçamentos do projeto (Tailwind + UI shadcn-like).
 */
export default function InvestorHome() {
  // Dados mock para grid de "produtos/startups"
  const featured: ProductItem[] = [
    {
      id: '1',
      name: 'Biotech Starter',
      categories: ['Saúde', 'Bio'],
      rating: 4.7,
      rank: 1,
      price: 'R$ 12,9K',
      tag: 'Novo',
    },
    {
      id: '2',
      name: 'Agro Vision',
      categories: ['Agro', 'IA'],
      rating: 4.6,
      rank: 2,
      price: 'R$ 9,5K',
    },
    {
      id: '3',
      name: 'Fin AI Score',
      categories: ['Fintech', 'Score'],
      rating: 4.8,
      rank: 3,
      price: 'R$ 19,0K',
      tag: '-15%',
    },
    {
      id: '4',
      name: 'Edu Labs',
      categories: ['Educação'],
      rating: 4.4,
      rank: 4,
      price: 'R$ 7,2K',
    },
    {
      id: '5',
      name: 'Green Power',
      categories: ['Energia'],
      rating: 4.5,
      rank: 5,
      price: 'R$ 15,0K',
    },
    {
      id: '6',
      name: 'Urban Mobility',
      categories: ['Mobilidade'],
      rating: 4.3,
      rank: 6,
      price: 'R$ 8,0K',
    },
  ];

  const topFree: AppItem[] = [
    {
      id: 'roblox',
      name: 'Roblox',
      categories: ['Aventura', 'Simulação'],
      rating: 4.5,
      rank: 1,
    },
    {
      id: 'talking-tom',
      name: 'Meu Talking Tom: Amigos 2',
      categories: ['Casual', 'Simulação'],
      rating: 4.3,
      rank: 2,
    },
    {
      id: 'stumble-guys',
      name: 'Stumble Guys',
      categories: ['Ação', 'Plataforma'],
      rating: 4.2,
      rank: 3,
    },
    {
      id: 'naruto',
      name: 'Free Fire x NARUTO SHIPPUDEN',
      categories: ['Ação', 'Tiro tático'],
      rating: 4.6,
      rank: 4,
    },
    {
      id: 'avatar-world',
      name: 'Avatar World',
      categories: ['RPG', 'Casual'],
      rating: 4.6,
      rank: 5,
    },
    {
      id: 'super-bear',
      name: 'Super Bear Adventure',
      categories: ['Aventura'],
      rating: 4.5,
      rank: 6,
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 py-4 md:py-6">
          {/* Hero + Busca */}
          <HeroSearch />

          {/* Grid de Cards */}
          <section className="px-4 lg:px-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Destaques
              </h2>
              <Button variant="ghost" className="gap-1">
                Ver todos
                <IconArrowRight className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featured.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          {/* Em alta (lista ranqueada) */}
          <section className="px-4 lg:px-6">
            <h2 className="mb-3 text-xl font-semibold tracking-tight md:text-2xl">
              Em alta
            </h2>
            <Tabs defaultValue="free" className="w-full">
              <TabsList className="flex w-full flex-wrap gap-2">
                <TabsTrigger value="free">Principais gratuitos</TabsTrigger>
                <TabsTrigger value="top-grossing">Mais rentáveis</TabsTrigger>
                <TabsTrigger value="paid">Principais pagos</TabsTrigger>
              </TabsList>
              <TabsContent value="free" className="mt-4">
                <AppList items={topFree} />
              </TabsContent>
              <TabsContent value="top-grossing" className="mt-4">
                <EmptyState text="Sem dados disponíveis no momento." />
              </TabsContent>
              <TabsContent value="paid" className="mt-4">
                <EmptyState text="Sem dados disponíveis no momento." />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  );
}

// Componentes inline removidos; agora importados de '@/components/investidor/*'
