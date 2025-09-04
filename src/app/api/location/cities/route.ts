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

    // Validação das variáveis de ambiente
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const rapidApiHost = process.env.COUNTRIES_API_HOST;
    const baseUrl = process.env.COUNTRIES_API_BASE;

    if (!rapidApiKey || !rapidApiHost || !baseUrl) {
      return NextResponse.json(
        {
          error: true,
          message:
            'Configuração de API incompleta. Verifique as variáveis de ambiente.',
          data: null,
        },
        { status: 500 },
      );
    }

    const url = `${baseUrl}/cities?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost,
      },
    });
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

    return NextResponse.json({ error: false, message: 'ok', data: cities });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao listar cidades';
    return NextResponse.json(
      { error: true, message: errorMessage, data: null },
      { status: 500 },
    );
  }
}
