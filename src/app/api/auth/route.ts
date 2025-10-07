import {
  CreateSessionToken,
  DeleteSession,
  GetSession2fa,
  GetSessionServer,
} from '@/context/auth';
import { NextResponse } from 'next/server';
import * as jose from 'jose';
import generateA2fCode from '@/lib/a2f';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // gerar codigo para autenticação
    const codigo = generateA2fCode();

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

    const session2fa = await GetSession2fa();
    if (session2fa) {
      const role = data.data.user.role;
      // criar sessão
      await CreateSessionToken({
        user: data.data.user,
        token: data.data.token,
        refreshToken: data.data.refreshToken,
      });
      const red = role === 'admin' ? '/admin' : '/home';
      return NextResponse.json(
        { message: 'Autenticado com sucesso', url: red },
        { status: 200 },
      );
    }
    const role = data.data.user.role;
    const red = role === 'admin' ? '/admin' : '/home';

    // gerar payload
    const payload = {
      codigo: codigo,
      redirectPath: red,
      usuario_id: data.data.user.id,
    };

    // codificar url com codigo com jwt
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

    // expirar em 20 minutos
    const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('20m')
      .sign(secret);

    // url de redirecionamento
    const url = `/auth/${token}`;

    // enviar codigo para email
    const messageResponse = await fetch(
      `${process.env.NEXTAUTH_API_URL}/messagewithnewcode`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          nome: data.data.user.nome,
          email: data.data.user.email,
          codigo: codigo,
        }),
      },
    );
    const messageData = await messageResponse.json();

    if (!messageResponse.ok) {
      return NextResponse.json(
        {
          message: messageData.message || 'Erro ao enviar codigo para email',
          error: null,
        },
        { status: messageResponse.status },
      );
    }

    // criar sessão
    await CreateSessionToken({
      user: data.data.user,
      token: data.data.token,
      refreshToken: data.data.refreshToken,
    });

    // retornar resposta
    return NextResponse.json(
      { message: 'Autenticado com sucesso', url: url },
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
