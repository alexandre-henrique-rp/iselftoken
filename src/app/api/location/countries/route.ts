import { NextResponse } from 'next/server';

export async function GET() {
  try {

    const url = `${process.env.NEXTAUTH_API_URL}/countries`;
    const response = await fetch(url);
    const countries = await response.json();
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
    return NextResponse.json({ error: false, message: 'ok', data: countries.data});
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao listar países';
    return NextResponse.json(
      { error: true, message: errorMessage, data: null },
      { status: 500 },
    );
  }
}
