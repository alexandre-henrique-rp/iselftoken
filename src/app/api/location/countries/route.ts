import { NextResponse } from 'next/server';
import { locationService } from '@/modules/location/service';

export async function GET() {
  try {
    const countries = await locationService.getCountries();
    return NextResponse.json({ status: 'success', message: 'ok', data: countries });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error?.message || 'Erro ao listar países', data: null }, { status: 500 });
  }
}
