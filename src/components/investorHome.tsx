'use client';

import { IconArrowRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { HeroSearch } from '@/components/investidor/HeroSearch';
import { AppList } from '@/components/investidor/AppList';
import { EmptyState } from '@/components/investidor/EmptyState';
import { StartupCard } from './startup-card';
import { ProfileCards } from '@/data/profile';
import { AppItem } from './investidor/types';
import { StartupTypes } from '@/types/ProfileTypes';

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
  const dados = ProfileCards;
 
  /**
   * Converte um objeto do tipo `getAllStartups` (dados de mock/UI)
   * para o tipo `getStartupById` esperado pelo componente `StartupCard`.
   * Adiciona valores padrão para propriedades que não existem em getAllStartups.
   */
  const mapearProfileParaStartup = (
    item: StartupTypes.getAllStartups,
  ): StartupTypes.getStartupById => ({
    id: item.id,
    name: item.name,
    logo: item.logo,
    category: item.category,
    selos: item.selos,
    description: item.description,
    image: item.image,
    equityPercentage: item.equityPercentage,
    totalTokens: item.totalTokens,
    tokensRemaining: item.tokensRemaining,
    fundingGoal: 'R$ 1.000.000',
    raised: 'R$ 500.000',
    percentage: 50,
    valuation: 'R$ 5.000.000',
    investors: 25,
    timeLeft: '30 dias',
    trending: false,
    markdownContent: `## Sobre a ${item.name}\n\n${item.description}\n\n### Categoria\n${item.category}\n\n### Equity\n${item.equityPercentage}`,
    pais: '',
    icon: '',
    link_video: '',
    link_analysis: ''
  });

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
              {dados.map((item) => (
                <StartupCard key={item.id} startup={mapearProfileParaStartup(item)} />
              ))}
            </div>
          </section>

           {/* Hero + Busca */}
           <HeroSearch />

          {/* Em alta (lista ranqueada) */}
          <section className="px-4 lg:px-6">
            <Tabs defaultValue="free" className="w-full">
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
