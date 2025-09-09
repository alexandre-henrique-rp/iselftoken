import { Startup } from '@/components/startup-card';
import { featuredStartups } from '@/data/startups';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const startup = featuredStartups.find((s: Startup) => s.id === id);
  return NextResponse.json(startup);
}
