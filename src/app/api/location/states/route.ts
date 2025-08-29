import { NextResponse } from 'next/server';
import { locationService } from '@/modules/location/service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    if (!country) {
      return NextResponse.json({ status: 'error', message: 'Parametro country é obrigatório', data: null }, { status: 400 });
    }
    const states = await locationService.getStates(country);
    return NextResponse.json({ status: 'success', message: 'ok', data: states });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar estados';
    return NextResponse.json({ status: 'error', message: errorMessage, data: null }, { status: 500 });
  }
}
