import { featuredStartups } from '@/data/startups';
import { StartupTypes } from '@/types/ProfileTypes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
    const startup = featuredStartups.find(
    (s: StartupTypes.getStartupById) => s.id === +id,
  );
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return NextResponse.json(startup);
}
