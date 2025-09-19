import { featuredStartups } from '@/data/startups';
import { StartupTypes } from '@/types/ProfileTypes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/startup/[id]'>,
) {
  const { id } = await ctx.params;
    const startup = featuredStartups.find(
    (s: StartupTypes.getStartupById) => s.id === +id,
  );
  // await new Promise((resolve) => setTimeout(resolve, 2000));
  return NextResponse.json(startup);
}
