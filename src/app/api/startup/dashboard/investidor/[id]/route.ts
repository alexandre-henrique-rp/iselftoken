import { mockStartupInvestors } from '@/data/mock/startups-mock';
import { Delay } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/startup/dashboard/investidor/[id]'>,
) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('API Call: GET /api/startups/' + id + '/investors', {
      page,
      limit,
      timestamp: new Date().toISOString(),
    });

    await Delay(1000);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedInvestors = mockStartupInvestors.slice(startIndex, endIndex);

    const resposta = {
      investidores: paginatedInvestors,
      estatisticas: {
        total_investidores: mockStartupInvestors.length,
        total_publicos: mockStartupInvestors.filter((i) => i.perfil_publico)
          .length,
        total_anonimos: mockStartupInvestors.filter((i) => !i.perfil_publico)
          .length,
        ticket_medio: 30000,
        investimento_total: 1250000,
        distribuicao_geografica: {
          SP: 15,
          RJ: 8,
          MG: 3,
          Outros: 4,
        },
      },
      pagination: {
        current_page: page,
        total_pages: Math.ceil(mockStartupInvestors.length / limit),
        per_page: limit,
        total_items: mockStartupInvestors.length,
      },
    };

    return NextResponse.json(resposta, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao buscar investidores' },
      { status: 500 },
    );
  }
}
