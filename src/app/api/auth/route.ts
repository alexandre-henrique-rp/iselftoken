import {
  CreateSessionToken,
  DeleteSession,
  GetSession2fa,
  GetSessionServer,
} from '@/context/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

  

    // autenticar com api
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    // verificar resposta
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Erro ao autenticar', error: null },
        { status: response.status },
      );
    }

    // criar sessão
    await CreateSessionToken({
      user: data.data.user,
      token: data.data.token,
      refreshToken: data.data.refreshToken,
    });

    const af2 = await GetSession2fa();

    // retornar resposta
    return NextResponse.json(
      { message: 'Autenticado com sucesso', data: data.data.user, Af2: af2 },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Erro ao autenticar',
        error: JSON.stringify(error, null, 2) || null,
      },
      { status: 500 },
    );
  }
}

// GET /api/auth -> retorna a sessão atual (payload do JWT) ou null
export async function GET() {
  try {
    const session = await GetSessionServer();
    return NextResponse.json({ session: session ?? null }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao obter sessão' },
      { status: 500 },
    );
  }
}

// DELETE /api/auth -> destrói a sessão (deleta cookie)
export async function DELETE() {
  try {
    await DeleteSession();
    return NextResponse.json({ message: 'Sessão finalizada' }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Erro ao finalizar sessão',
        error: JSON.stringify(error, null, 2) || null,
      },
      { status: 500 },
    );
  }
}
