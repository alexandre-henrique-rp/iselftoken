import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get('country')
    console.log("🚀 ~ GET ~ country:", country)
    if (!country) {
      return NextResponse.json(
        { error: true, message: 'Parametro country é obrigatório', data: null },
        { status: 400 },
      );
    }

    const url = `${process.env.NEXTAUTH_API_URL}/countries/states/${encodeURIComponent(country)}`;
    const response = await fetch(url);
    const states = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        {
          error: true,
          message: states.message || 'Erro ao listar estados',
          data: null,
        },
        { status: response.status },
      );
    }
    return NextResponse.json({ error: false, message: 'ok', data: states.data });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao listar estados';
    return NextResponse.json(
      { error: true, message: errorMessage, data: null },
      { status: 500 },
    );
  }
}
