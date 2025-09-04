import { NextResponse } from 'next/server';

export async function GET() {
  try {
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

    const url = `${baseUrl}/countries`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost,
      },
    });
    const countries = await response.json();
    console.log("🚀 ~ GET ~ countries:", countries)
    if (!response.ok) {
      return NextResponse.json(
        {
          error: true,
          message: countries.message || 'Erro ao listar países',
          data: null,
        },
        { status: response.status },
      );
    }
    return NextResponse.json({ error: false, message: 'ok', data: countries});
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao listar países';
    return NextResponse.json(
      { error: true, message: errorMessage, data: null },
      { status: 500 },
    );
  }
}
