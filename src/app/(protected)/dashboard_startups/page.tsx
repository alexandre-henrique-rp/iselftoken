import { Suspense } from 'react'
import { Metadata } from 'next'
import { StartupFilters } from '@/types/startup'
import { StartupStatsCardsSkeleton } from '@/components/dashboard_startup/startup-stats-cards-skeleton'
import { StartupDataTableSkeleton } from '@/components/dashboard_startup/startup-data-table-skeleton'
import { StartupStatsCards } from '@/components/dashboard_startup/startup-stats-cards'
import { StartupDataTable } from '@/components/dashboard_startup/startup-data-table'

export const metadata: Metadata = {
  title: 'Dashboard - Gerenciamento de Startups | iSelfToken',
  description: 'Gerencie suas startups, acompanhe investimentos e monitore o desempenho das suas campanhas.',
}

const GetDados = async () => {
  const ReqStartups = await fetch('http://localhost:3000/api/startup/dashboard');
  const startups = await ReqStartups.json();
  const ReqStats = await fetch('http://localhost:3000/api/startup/dashboard/stats');
  const stats = await ReqStats.json();
  return { startups, stats }
}

interface PageProps {
  searchParams: {
    page?: string
    limit?: string
    search?: string
    status?: string
    area_atuacao?: string
    estagio?: string
    meta_min?: string
    meta_max?: string
    sort_by?: string
    sort_order?: string
  }
}

export default async function DashboardStartupsPage({ searchParams }: { searchParams: Promise<PageProps['searchParams']> }) {
  const awaitedSearchParams = await searchParams
  // Processar parâmetros de busca
  const filters = {
    page: parseInt(awaitedSearchParams.page || '1'),
    limit: parseInt(awaitedSearchParams.limit || '10'),
    search: awaitedSearchParams.search,
    status: awaitedSearchParams.status,
    area_atuacao: awaitedSearchParams.area_atuacao,
    estagio: awaitedSearchParams.estagio,
    meta_min: awaitedSearchParams.meta_min ? parseFloat(awaitedSearchParams.meta_min) : undefined,
    meta_max: awaitedSearchParams.meta_max ? parseFloat(awaitedSearchParams.meta_max) : undefined,
    sort_by: awaitedSearchParams.sort_by || 'nome',
    sort_order: (awaitedSearchParams.sort_order as 'asc' | 'desc') || 'asc',
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
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
  )
}

async function StartupStatsCardsWrapper() {
  const stats = await GetDados()
  return <StartupStatsCards stats={stats.stats} />
}

async function StartupDataTableWrapper({ filters }: { filters: StartupFilters }) {
  const data = await GetDados()
  return (
    <StartupDataTable
      initialData={data.startups.startups}
      totalCount={data.startups.totalCount}
      initialFilters={filters}
    />
  )
}