import { NextResponse } from 'next/server';
import { locationService } from '@/modules/location/service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const state = searchParams.get('state');
    if (!country || !state) {
      return NextResponse.json({ status: 'error', message: 'Parametros country e state são obrigatórios', data: null }, { status: 400 });
    }
    const cities = await locationService.getCities(country, state);
    return NextResponse.json({ status: 'success', message: 'ok', data: cities });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar cidades';
    return NextResponse.json({ status: 'error', message: errorMessage, data: null }, { status: 500 });
  }
}
