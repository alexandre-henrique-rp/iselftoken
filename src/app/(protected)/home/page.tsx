import InvestorHome from '@/components/investorHome';
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

export const dynamic = 'force-dynamic';

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
}
