import { mockStartupHistory } from "@/data/mock/startups-mock";
import { Delay } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";



export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/startup/dashboard/[id]/historico'>,
) {
  try {
    const { id } = await ctx.params;

    console.log('API Call: GET /api/startups/' + id + '/historico', {
      timestamp: new Date().toISOString(),
    });

    await Delay(800);

    return NextResponse.json(mockStartupHistory, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao buscar histórico' },
      { status: 500 },
    );
  }
}