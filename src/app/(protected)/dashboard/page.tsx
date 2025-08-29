import StartupHome from '@/components/startupHome';
import dados from '@/data/data.json';

// Força renderização dinâmica para permitir uso de cookies na autenticação
export const dynamic = 'force-dynamic';

export default function Dashboard() {
  return (
    <>
      <StartupHome data={dados} />
    </>
  );
}
