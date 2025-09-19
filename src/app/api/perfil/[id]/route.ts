import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/perfil/[id]'>,
) {
  try {
    const { id } = await ctx.params;

    const user = await fetch(`${process.env.NEXTAUTH_API_URL}/users/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const userData = await user.json();
    if (!user.ok) {
      return NextResponse.json(
        {
          message: userData.message || 'Erro ao buscar perfil',
          error: null,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(userData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Erro ao buscar perfil',
        error: JSON.stringify(error, null, 2) || null,
      },
      { status: 500 },
    );
  }
}
