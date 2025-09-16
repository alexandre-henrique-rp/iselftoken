import { mockStartups } from '@/data/mock/startups-mock';
import { Delay } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const {searchParams} = new URL(request.url);
    const filters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      area_atuacao: searchParams.get('area_atuacao'),
      estagio: searchParams.get('estagio'),
      meta_min: searchParams.get('meta_min') ? parseFloat(searchParams.get('meta_min') || '0') : undefined,
      meta_max: searchParams.get('meta_max') ? parseFloat(searchParams.get('meta_max') || '0') : undefined,
      sort_by: searchParams.get('sort_by') || 'nome',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc',
    }
   
    const startups = [...mockStartups];
    await Delay(500)

    // Apply pagination
  const page = filters.page
  const limit = filters.limit || 10
  const startIndex = (filters.page - 1) * limit
  const endIndex = startIndex + limit
  
  const paginatedStartups = startups.slice(startIndex, endIndex)
  const totalCount = startups.length
  
  const pagination = {
    current_page: page,
    total_pages: Math.ceil(totalCount / limit),
    per_page: limit,
    total_items: totalCount,
    has_next: endIndex < totalCount,
    has_previous: page > 1
  }
    return NextResponse.json({
      startups: paginatedStartups,
      totalCount,
      pagination
    }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao buscar startups' },
      { status: 500 },
    );
  }
}
