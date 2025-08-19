import StartupHome from '@/components/startupHome';
import dados from '@/data/data.json';

export default function Dashboard() {
  return (
    <>
      <StartupHome data={dados} />
    </>
  );
}
