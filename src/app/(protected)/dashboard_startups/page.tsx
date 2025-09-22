export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Metadata } from 'next';
import { StartupFilters } from '@/types/startup';
import { StartupStatsCardsSkeleton } from '@/components/dashboard_startup/startup-stats-cards-skeleton';
import { StartupDataTableSkeleton } from '@/components/dashboard_startup/startup-data-table-skeleton';
import { StartupStatsCards } from '@/components/dashboard_startup/startup-stats-cards';
import { StartupDataTable } from '@/components/dashboard_startup/startup-data-table';
import { mockStartups, mockStartupStats } from '@/data/mock/startups-mock';
import { Delay } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Dashboard - Gerenciamento de Startups | iSelfToken',
  description:
    'Gerencie suas startups, acompanhe investimentos e monitore o desempenho das suas campanhas.',
};

const GetDados = async (filters?: StartupFilters) => {
  // const ReqStartups = await fetch('http://localhost:3000/api/startup/dashboard');
  // const startups = await ReqStartups.json();
  const startups = [...mockStartups];
  await Delay(500);
  console.log('🚀 ~ GetDados ~ startups:', startups);

  // Apply pagination
  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedStartups = startups.slice(startIndex, endIndex);
  const totalCount = startups.length;

  const pagination = {
    current_page: page,
    total_pages: Math.ceil(totalCount / limit),
    per_page: limit,
    total_items: totalCount,
    has_next: endIndex < totalCount,
    has_previous: page > 1,
  };
  const DataRetorno = {
    startups: paginatedStartups,
    pagination,
    totalCount,
  };
  // const ReqStats = await fetch('http://localhost:3000/api/startup/dashboard/stats');
  // const stats = await ReqStats.json();
  return { startups: DataRetorno, stats: mockStartupStats };
};

interface PageProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    area_atuacao?: string;
    estagio?: string;
    meta_min?: string;
    meta_max?: string;
    sort_by?: string;
    sort_order?: string;
  };
}

export default async function DashboardStartupsPage({
  searchParams,
}: {
  searchParams: Promise<PageProps['searchParams']>;
}) {
  const awaitedSearchParams = await searchParams;
  // Processar parâmetros de busca
  const filters = {
    page: parseInt(awaitedSearchParams.page || '1'),
    limit: parseInt(awaitedSearchParams.limit || '10'),
    search: awaitedSearchParams.search,
    status: awaitedSearchParams.status,
    area_atuacao: awaitedSearchParams.area_atuacao,
    estagio: awaitedSearchParams.estagio,
    meta_min: awaitedSearchParams.meta_min
      ? parseFloat(awaitedSearchParams.meta_min)
      : undefined,
    meta_max: awaitedSearchParams.meta_max
      ? parseFloat(awaitedSearchParams.meta_max)
      : undefined,
    sort_by: awaitedSearchParams.sort_by || 'nome',
    sort_order: (awaitedSearchParams.sort_order as 'asc' | 'desc') || 'asc',
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto space-y-8 px-6 py-8">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Gerenciamento de Startups
          </p>
        </div>

        {/* Stats Cards */}
        <Suspense fallback={<StartupStatsCardsSkeleton />}>
          <StartupStatsCardsWrapper />
        </Suspense>

        {/* Data Table */}
        <Suspense fallback={<StartupDataTableSkeleton />}>
          <StartupDataTableWrapper filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}

async function StartupStatsCardsWrapper() {
  const stats = await GetDados();
  return <StartupStatsCards stats={stats.stats} />;
}

async function StartupDataTableWrapper({
  filters,
}: {
  filters: StartupFilters;
}) {
  const data = await GetDados();
  return (
    <StartupDataTable
      initialData={data.startups.startups}
      totalCount={data.startups.totalCount}
      initialFilters={filters}
    />
  );
}
