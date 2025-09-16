import { StartupTypes } from '@/types/ProfileTypes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    console.log('🚀 ~ GET ~ id:', id);
    const startup: StartupTypes.getStartupById[] = [];
    return NextResponse.json(startup, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao buscar startup' },
      { status: 500 },
    );
  }
}
