import {
  CreateSessionToken,
  DeleteSession,
<<<<<<< Updated upstream
  GetSessionServer,
} from '@/context/auth';
import { mockLogin } from '@/mock/mock-login';
=======
  GetSession2fa,
  GetSessionServer,
  SetUserCookie,
} from '@/context/auth';
>>>>>>> Stashed changes
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
<<<<<<< Updated upstream
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
=======

    // autenticar com api
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/login`, {
>>>>>>> Stashed changes
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
<<<<<<< Updated upstream
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Erro ao autenticar' },
        { status: 500 },
      );
    }
    await CreateSessionToken({
      user: {
        ...data.user,
        id: Number(data.user.id),
      },
      token: data.token,
      refreshToken: data.refreshToken,
    });

    return NextResponse.json(
      { message: 'Autenticado com sucesso' },
=======

    // verificar resposta
    console.log("🚀 ~ POST ~ data:", response)
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

    // Buscar dados completos do usuário da API e cachear
    try {
      const userDataResponse = await fetch(
        `${process.env.NEXTAUTH_API_URL}/users/${data.data.user.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      if (userDataResponse.ok) {
        const userData = await userDataResponse.json();
        // Cachear dados do usuário nos cookies
        await SetUserCookie(userData.data);
      }
    } catch (error) {
      // Falha ao cachear não deve impedir o login
      console.log('Erro ao cachear dados do usuário:', error);
    }

    const af2 = await GetSession2fa();

    // retornar resposta
    return NextResponse.json(
      { message: 'Autenticado com sucesso', data: data.data.user, Af2: af2 },
>>>>>>> Stashed changes
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
<<<<<<< Updated upstream
    return NextResponse.json({ error: 'Erro ao autenticar' }, { status: 500 });
=======
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Erro ao autenticar',
        error: JSON.stringify(error, null, 2) || null,
      },
      { status: 500 },
    );
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      { error: 'Erro ao finalizar sessão' },
=======
      {
        message:
          error instanceof Error ? error.message : 'Erro ao finalizar sessão',
        error: JSON.stringify(error, null, 2) || null,
      },
>>>>>>> Stashed changes
      { status: 500 },
    );
  }
}
