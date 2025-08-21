import {
  CreateSessionToken,
  DeleteSession,
  GetSessionServer,
} from '@/context/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const url = `${process.env.NEXTAUTH_API_URL}/login`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    console.log("🚀 ~ POST ~ data:", data)
    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Erro ao autenticar' },
        { status: 500 },
      );
    }
    await CreateSessionToken({
      user: data.data.user,
      token: data.data.token,
      refreshToken: data.data.refreshToken,
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
