// import AffiliateHome from '@/components/affiliateHome';
// import { GetSessionServer } from '@/context/auth';
// import { FourSquareLoader } from '@/components/ui/four-square-loader';
// import dados from '@/data/data.json';
//
export const dynamic = 'force-dynamic';
//
// export default async function Dashboard() {
//   const session = await GetSessionServer();
//
//   // Mostra um loader enquanto a sessão não está disponível
//   if (!session?.user) {
//     return <FourSquareLoader className="h-full w-full" />;
//   }
//
//   return <AffiliateHome userName={session.user.name ?? undefined} data={dados} />;
// }


// app/afiliado-dashboard/page.tsx

// Esta função GetSessionServer() é um exemplo, use a sua real
import { GetSessionServer } from '@/context/auth';

import AffiliateHome from '@/components/affiliateHome';
import { z } from 'zod';
import { schema } from '@/components/data-table';

// Busque a sessão do usuário para obter o ID e o token.
export default async function AffiliateDashboardPage() {
  const sessionData = await GetSessionServer();

  // Se a sessão ou o usuário não existirem, exibe a mensagem de acesso negado.
  if (!sessionData?.user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground mt-2">Dados de usuário não encontrados. Por favor, faça login novamente.</p>
      </div>
    );
  }

  // Dados fictícios para o DataTable (substituir por chamada à API no futuro)
  const fakeData: z.infer<typeof schema>[] = [];

  // O token de sessão é o próprio objeto da sessão, que será usado para as chamadas da API.
  return (
    <AffiliateHome
      userId={sessionData.user.id}
      token={sessionData.token} // Passa o token de sessão para o componente
      data={fakeData}
    />
  );
}