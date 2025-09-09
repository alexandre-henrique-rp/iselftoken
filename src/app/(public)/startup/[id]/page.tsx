import { featuredStartups } from '@/data/startups';
import { notFound } from 'next/navigation';
import StartupHeader from '@/components/StartupHeader';
import FinancialInfo from '@/components/FinancialInfo';
import EquityCard1 from '@/components/EquityCard1';
import EquityCard2 from '@/components/EquityCard2';
import PitchVideo from '@/components/PitchVideo';
import AnalysisVideo from '@/components/AnalysisVideo';
import StartupSummary from '@/components/StartupSummary';
import { GetSessionServer } from '@/context/auth';

// Tipos
type Startup = (typeof featuredStartups)[0];

interface StartupPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }> | null;
}


// Função para buscar os dados da startup (mock)
const getStartupData = async (id: string): Promise<Startup | undefined> => {
  const request = await fetch(`http://localhost:3000/api/startup/${id}`);
  const response = await request.json();
  return response;
};

export default async function StartupPage({ params, searchParams }: StartupPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : null;
  
  const startup = await getStartupData(resolvedParams.id);
  const session = await GetSessionServer();

  if (!startup) {
    notFound();
  }

  // Adaptação dos dados mock para os componentes
  const parseCurrency = (value: string) => {
    return parseFloat(value.replace(/[^0-9,-]+/g, "").replace(',', '.'));
  }

  const targetAmount = parseCurrency(startup.fundingGoal) * 1000000;
  const currentAmount = parseCurrency(startup.raised) * 1000;

  return (
    <div className="container mx-auto px-4 py-8">
      <main className="flex flex-col gap-12">
        {/* Seção 1: Apresentação da Startup */}
        <StartupHeader
          logo={startup.image}
          name={startup.name}
          subtitle={startup.description}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-8 lg:col-span-2">
            {/* Seção 5: Pitch de Vendas - Usando um ID de vídeo placeholder */}
            <PitchVideo youtubeVideoId="dQw4w9WgXcQ" />

            {/* Seção 6: Análise da Startup - Usando um ID de vídeo placeholder */}
            <AnalysisVideo
              thumbnailUrl={startup.image}
              youtubeVideoId="L_LUpnjgPso"
            />
          </div>

          <aside className="flex flex-col gap-8">
            {/* Seção 2: Informações Financeiras */}
            <FinancialInfo
              targetAmount={targetAmount}
              currentAmount={currentAmount}
              percentage={startup.percentage}
            />

            {/* Seção 3: Informações de Equity - Card 1 - Usando dados mock */}
            <EquityCard1
              totalEquity={15} // Mock
              remainingTokens={50000} // Mock
              investedEquity={currentAmount} // Mock
              totalInvestors={startup.investors}
            />

            {/* Seção 4: Informações de Equity - Card 2 */}
            <EquityCard2
              affiliateToken={resolvedSearchParams?.token}
              userRole={
                !session?.user.role
                  ? 'investidor'
                  : session?.user.role === 'fundador'
                    ? 'startup'
                    : session?.user.role
              }
              isAuthenticated={session?.user ? true : false}
            />
          </aside>
        </div>

        {/* Seção 7: Resumo da Startup (Privada) - Usando dados mock */}
        <StartupSummary
          markdownContent={
            session?.user
              ? startup.markdownContent
              : `## Sobre a ${startup.name}\n\n${startup.description}\n\n### Estágio\n${startup.stage}\n\n### Valuation\n${startup.valuation}\n\n## Sobre a ${startup.name}\n\n${startup.description}\n\n### Estágio\n${startup.stage}\n\n### Valuation\n${startup.valuation}\n\n## Sobre a ${startup.name}\n\n${startup.description}\n\n### Estágio\n${startup.stage}\n\n### Valuation\n${startup.valuation}\n\n## Sobre a ${startup.name}\n\n${startup.description}\n\n### Estágio\n${startup.stage}\n\n### Valuation\n${startup.valuation}\n\n## Sobre a ${startup.name}\n\n${startup.description}\n\n### Estágio\n${startup.stage}\n\n### Valuation\n${startup.valuation}\n\n## Sobre a ${startup.name}\n\n${startup.description}\n\n### Estágio\n${startup.stage}\n\n### Valuation\n${startup.valuation}\n\n## Sobre a ${startup.name}\n\n${startup.description}\n\n### Estágio\n${startup.stage}\n\n### Valuation\n${startup.valuation}\n\n## Sobre a ${startup.name}\n\n${startup.description}\n\n### Estágio\n${startup.stage}\n\n### Valuation\n${startup.valuation}`
          }
          isAuthenticated={session?.user ? true : false}
        />
      </main>
    </div>
  );
}
