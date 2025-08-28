import {
  CreateSessionToken,
  DeleteSession,
  GetSessionServer,
} from '@/context/auth';
import generateA2fCode from '@/modules/codigo/a2f';
import { NextResponse } from 'next/server';
import * as jose from 'jose';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const codigo = generateA2fCode();
    const payload = {
      codigo: codigo,
    };
    // codificar url com codigo com jwt
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    // expirar em 20 minutos
    const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('20m')
      .sign(secret);
    const url = `/auth/${token}`;

    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

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
      { message: 'Autenticado com sucesso', url: url },
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
