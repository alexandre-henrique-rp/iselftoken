import { A2FPageClient } from '@/components/A2FPageClient';

interface AuthParams {
  params: Promise<{
    token: string;
  }>;
}

export default async function A2FPage({ params }: AuthParams) {
  const resolvedParams = await params;
  
  return <A2FPageClient token={resolvedParams.token} />;
}
