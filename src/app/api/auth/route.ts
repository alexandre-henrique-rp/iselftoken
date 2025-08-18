import {
  CreateSessionToken,
  DeleteSession,
  GetSessionServer,
} from '@/context/auth';
import { mockLogin } from '@/mock/mock-login';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Substituído mockLogin por chamada ao adaptador de autenticação
    const response = await mockLogin({
      email: body.email,
      password: body.password,
    });
    // Garante que só prosseguimos quando a resposta for de sucesso e com dados presentes
    if (!response || response.status !== 'success' || !response.data) {
      return NextResponse.json(
        { error: response.message || 'Erro ao autenticar' },
        { status: 500 },
      );
    }

    const { user, token, refresh_token } = response.data;

    // Mapeia para o tipo SessionNext.Session esperado por CreateSessionToken
    await CreateSessionToken({
      user: {
        ...user,
        id: Number(user.id), // Conversão de string para number para compatibilidade com o tipo esperado
      },
      token,
      refreshToken: refresh_token,
    });

    return NextResponse.json(
      { message: 'Autenticado com sucesso' },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: 'Erro ao autenticar' }, { status: 500 });
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
      { error: 'Erro ao finalizar sessão' },
      { status: 500 },
    );
  }
}
