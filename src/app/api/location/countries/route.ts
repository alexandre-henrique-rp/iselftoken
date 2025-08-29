import { NextResponse } from 'next/server';
import { locationService } from '@/modules/location/service';

export async function GET() {
  try {
    const countries = await locationService.getCountries();
    return NextResponse.json({ status: 'success', message: 'ok', data: countries });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar países';
    return NextResponse.json({ status: 'error', message: errorMessage, data: null }, { status: 500 });
  }
}
