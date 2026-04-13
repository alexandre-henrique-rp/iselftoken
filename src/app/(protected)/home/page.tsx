<<<<<<< Updated upstream
import InvestorHome from '@/components/investidorHome';
// import StartupHome from '@/components/startupHome';
// import { FourSquareLoader } from '@/components/ui/four-square-loader';
// import { GetSessionServer } from '@/context/auth';
// import dados from '@/data/data.json';

// // Busca dados do investidor com controle de cache e headers
// async function getInvestor(session: SessionNext.Session) {
//   const response = await fetch('/api/investidor', {
//     cache: 'no-store',
//     headers: {
//       Authorization: `Bearer ${session.refreshToken}`,
//     },
//   });
//   if (!response.ok) {
//     throw new Error('Falha ao carregar investidor');
//   }
//   const data = await response.json();
//   return data as { name: string };
// }

// // Busca dados da startup com controle de cache e headers
// async function getStartup(session: SessionNext.Session) {
//   const response = await fetch('/api/startup', {
//     cache: 'no-store',
//     headers: {
//       Authorization: `Bearer ${session.refreshToken}`,
//     },
//   });
//   if (!response.ok) {
//     throw new Error('Falha ao carregar startup');
//   }
//   const data = await response.json();
//   return data as { name: string };
// }

export default async function Home() {
  // const session = await GetSessionServer();

  // if (!session) {
  //   return <FourSquareLoader className="h-full w-full" />;
  // }
  
  // if (!session.refreshToken) {
  //   return <FourSquareLoader className="h-full w-full" />;
  // }

  // Busca somente os dados necessários conforme o perfil do usuário
  // if (session.user?.role === 'investidor') {
  //   const data = await getInvestor(session);
  //   return <InvestorHome />;
  // }

  // const data = await getStartup(session);
  // return <StartupHome data={dados} />;
  return <InvestorHome />;
=======
import { AdCarousel } from '@/components/home/AdCarousel';
import { MinimalStartupCard } from '@/components/home/MinimalStartupCard';
import { StartupSection } from '@/components/home/StartupSection';
import { VerifiedStartupCard } from '@/components/home/VerifiedStartupCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getBannersFromFolder } from '@/data/banner-service';
import {
  getAcceleratedStartups,
  getApprovalPhaseStartups,
  getFeaturedStartups,
  getVerifiedStartups,
} from '@/data/home-data';
import { Suspense } from 'react';

const SectionSkeleton = () => (
  <div className="space-y-6 px-4 py-8 md:px-0">
    <div className="flex justify-between">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="hidden h-8 w-32 sm:block" />
    </div>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="aspect-4/3 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

const FeaturedStartupsLoader = async () => {
  const startups = await getFeaturedStartups();
  return (
    <StartupSection
      title="Destaques da Semana"
      startups={startups}
      layout="grid"
      viewAllLink="/explorar?filter=destaques"
    />
  );
};

const VerifiedStartupsLoader = async () => {
  const startups = await getVerifiedStartups();
  return (
    <StartupSection
      title="Startups Verificadas"
      startups={startups}
      layout="carousel"
      viewAllLink="/explorar?filter=verificadas"
      renderCard={(startup) => <VerifiedStartupCard startup={startup} />}
    />
  );
};

const AcceleratedStartupsLoader = async () => {
  const startups = await getAcceleratedStartups();
  return (
    <StartupSection
      title="Em Aceleração"
      startups={startups}
      layout="grid"
      viewAllLink="/explorar?filter=aceleradas"
      renderCard={(startup) => <MinimalStartupCard startup={startup} />}
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
    />
  );
};

const ApprovalPhaseStartupsLoader = async () => {
  const startups = await getApprovalPhaseStartups();
  return (
    <StartupSection
      title="Novas Oportunidades"
      startups={startups}
      layout="grid"
      viewAllLink="/explorar?filter=aprovacao"
      renderCard={(startup) => <MinimalStartupCard startup={startup} />}
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
    />
  );
};

export default async function Home() {
  const banners = await getBannersFromFolder();

  return (
    <div className="bg-background min-h-screen w-full pb-20">
      <div className="relative w-full">
        <AdCarousel banners={banners} />
        <div className="from-background pointer-events-none absolute right-0 bottom-0 left-0 h-24 bg-linear-to-t to-transparent" />
      </div>
      <main className="relative z-10 container mx-auto mt-8 space-y-8 md:space-y-12 lg:max-w-[1400px]">
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturedStartupsLoader />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <VerifiedStartupsLoader />
        </Suspense>

        {/* Seções Empilhadas (uma abaixo da outra) com cards compactos */}
        <div className="w-full min-w-0">
          <Suspense fallback={<SectionSkeleton />}>
            <AcceleratedStartupsLoader />
          </Suspense>
        </div>

        <div className="w-full min-w-0">
          <Suspense fallback={<SectionSkeleton />}>
            <ApprovalPhaseStartupsLoader />
          </Suspense>
        </div>
      </main>
    </div>
  );
>>>>>>> Stashed changes
}
