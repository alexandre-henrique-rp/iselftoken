import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const state = searchParams.get('state');
    if (!country || !state) {
      return NextResponse.json(
        {
          error: true,
          message: 'Parametros country e state são obrigatórios',
          data: null,
        },
        { status: 400 },
      );
    }

    const url = `${process.env.NEXTAUTH_API_URL}/countries/cities/${encodeURIComponent(country)}/${encodeURIComponent(state)}`;
    const response = await fetch(url);
    const cities = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        {
          error: true,
          message: cities.message || 'Erro ao listar cidades',
          data: null,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({ error: false, message: 'ok', data: cities.data });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao listar cidades';
    return NextResponse.json(
      { error: true, message: errorMessage, data: null },
      { status: 500 },
    );
  }
}
