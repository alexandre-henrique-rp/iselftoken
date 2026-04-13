import { NextRequest, NextResponse } from 'next/server';



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, codigo } = body;

    const req = await fetch(
      `${process.env.NEXTAUTH_API_URL}/messagewithnewcode`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ nome, email, codigo }),
      },
    );
    const data = await req.json();
    if (!req.ok) {
      return NextResponse.json(
        { message: data.message || 'Erro ao gerar código', error: null },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: 'Código gerado com sucesso' },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Erro ao gerar código',
        error: JSON.stringify(error, null, 2) || null,
      },
      { status: 500 },
    );
  }
}
