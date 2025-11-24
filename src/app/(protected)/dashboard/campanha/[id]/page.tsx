import { CampanhaDataTableClient } from '@/components/dashboard_campanha/campanha-data-table-client';
import { CampanhaDataTableSkeleton } from '@/components/dashboard_campanha/campanha-data-table-skeleton';
import { CampanhaStatsCards } from '@/components/dashboard_campanha/campanha-stats-cards';
import { CampanhaStatsCardsSkeleton } from '@/components/dashboard_campanha/campanha-stats-cards-skeleton';
import { mockStartups } from '@/data/mock/startups-mock';
import { Delay } from '@/lib/utils';
import { CampanhaStartup, Startup, StartupFilters } from '@/types/startup';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<PageProps['params']>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const startupId = parseInt(awaitedParams.id);

  // Buscar dados da startup
  const startups: Startup[] = [...mockStartups];
  const startup = startups.find((s) => s.id === startupId);

  if (!startup) {
    return {
      title: 'Startup Não Encontrada | iSelfToken',
      description: 'A startup solicitada não foi encontrada.',
    };
  }

  return {
    title: `Campanhas - ${startup.nome} | iSelfToken`,
    description: `Gerencie as campanhas de captação da ${startup.nome} - ${startup.area_atuacao}. Ative ou pause campanhas e monitore o desempenho.`,
  };
}

// Tipo compatível com o esperado pelos componentes
type CampanhaComStartup = CampanhaStartup & {
  startup: {
    id: number;
    nome: string;
    area_atuacao: string;
    status: string;
  };
};

interface PageProps {
  params: {
    id: string;
  };
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    startup?: string;
    sort_by?: string;
    sort_order?: string;
  };
}

const GetDados = async (startupId: number, filters?: StartupFilters) => {
  // Encontrar a startup específica pelo ID
  const startups: Startup[] = [...mockStartups];
  await Delay(500);

  const startup = startups.find((s) => s.id === startupId);

  if (!startup) {
    return {
      campanhas: {
        campanhas: [],
        pagination: {
          current_page: 1,
          total_pages: 0,
          per_page: 10,
          total_items: 0,
          has_next: false,
          has_previous: false,
        },
        totalCount: 0,
      },
      allCampanhas: [],
      startup: null,
    };
  }

  // Obter apenas as campanhas desta startup
  const campanhasDaStartup: CampanhaComStartup[] = startup.campanha.map(
    (campanha) => ({
      ...campanha,
      startup: {
        id: startup.id,
        nome: startup.nome,
        area_atuacao: startup.area_atuacao,
        status: startup.status,
      },
    }),
  );

  // Apply pagination
  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedCampanhas = campanhasDaStartup.slice(startIndex, endIndex);
  const totalCount = campanhasDaStartup.length;

  const pagination = {
    current_page: page,
    total_pages: Math.ceil(totalCount / limit),
    per_page: limit,
    total_items: totalCount,
    has_next: endIndex < totalCount,
    has_previous: page > 1,
  };

  const DataRetorno = {
    campanhas: paginatedCampanhas,
    pagination,
    totalCount,
  };

  return { campanhas: DataRetorno, allCampanhas: campanhasDaStartup, startup };
};

export default async function DashboardCampanhasPage({
  params,
  searchParams,
}: {
  params: Promise<PageProps['params']>;
  searchParams: Promise<PageProps['searchParams']>;
}) {
  const awaitedParams = await params;
  const awaitedSearchParams = await searchParams;
  const startupId = parseInt(awaitedParams.id);

  // Processar parâmetros de busca
  const filters = {
    page: parseInt(awaitedSearchParams.page || '1'),
    limit: parseInt(awaitedSearchParams.limit || '10'),
    search: awaitedSearchParams.search,
    status: awaitedSearchParams.status,
    startup: awaitedSearchParams.startup,
    sort_by: awaitedSearchParams.sort_by || 'dt_inicio',
    sort_order: (awaitedSearchParams.sort_order as 'asc' | 'desc') || 'desc',
  };

  // Obter dados da startup e suas campanhas
  const data = await GetDados(startupId, filters);

  // Se a startup não for encontrada, mostrar página de erro
  if (!data.startup) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto space-y-8 px-6 py-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-foreground text-3xl font-bold tracking-tight">
              Startup Não Encontrada
            </h1>
            <p className="text-muted-foreground text-lg">
              A startup com ID {startupId} não foi encontrada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto space-y-8 px-6 py-8">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Campanhas - {data.startup.nome}
          </h1>
          <p className="text-muted-foreground text-lg">
            Gerenciamento de Campanhas de Captação - {data.startup.area_atuacao}
          </p>
        </div>

        {/* Stats Cards */}
        <Suspense fallback={<CampanhaStatsCardsSkeleton />}>
          <CampanhaStatsCardsWrapper startupId={startupId} />
        </Suspense>

        {/* Data Table */}
        <Suspense fallback={<CampanhaDataTableSkeleton />}>
          <CampanhaDataTableWrapper startupId={startupId} filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}

async function CampanhaStatsCardsWrapper({ startupId }: { startupId: number }) {
  const data = await GetDados(startupId);
  return <CampanhaStatsCards campanhas={data.allCampanhas} />;
}

async function CampanhaDataTableWrapper({
  startupId,
  filters,
}: {
  startupId: number;
  filters: StartupFilters;
}) {
  const data = await GetDados(startupId, filters);
  return (
    <CampanhaDataTableClient
      initialData={data.campanhas.campanhas}
      totalCount={data.campanhas.totalCount}
      initialFilters={filters}
      startupId={startupId}
      startupNome={data.startup?.nome || ''}
    />
  );
}
