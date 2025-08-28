import { NextRequest, NextResponse } from 'next/server';
import { GetSessionServer } from '@/context/auth';
import * as jose from 'jose';
import generateA2fCode from '@/modules/codigo/a2f';

/*
 * POST /api/auth/a2f
 * Lê a sessão no servidor e envia (simulado) um código A2F para o e-mail do usuário.
 * Body opcional: { email?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await GetSessionServer();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const body = await request.json();
    const { token, client_code } = body;
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 },
      );
    }
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const { codigo, redirectPath } = payload;
    if (client_code !== codigo) {
      return NextResponse.json({ message: 'Código inválido' }, { status: 400 });
    }

    if (!redirectPath) {
      const role = session.user.role;
      if (role === 'fundador') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (role === 'investidor') {
        return NextResponse.redirect(new URL('/home', request.url));
      }
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      if (role === 'afiliado') {
        return NextResponse.redirect(new URL('/afiliado', request.url));
      }
    }

    return NextResponse.redirect(new URL(redirectPath as string, request.url));
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao solicitar A2F' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await GetSessionServer();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const body = await request.json();
    const { TokenClient } = body;
    const codigo = generateA2fCode();
    const { red, id } = await VerifyToken(TokenClient);

    const req = await fetch(`${process.env.NEXTAUTH_API_URL}/retoken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        codigo: codigo,
        usuario_id: id,
      }),
    });
    const data = await req.json();
    if (!req.ok) {
      return NextResponse.json(
        { error: data.message || 'Erro ao solicitar A2F' },
        { status: 500 },
      );
    }

    const payload = {
      codigo: codigo,
      redirectPath: red || '',
      usuario_id: id,
    };
    // codificar url com codigo com jwt
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    // expirar em 20 minutos
    const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('20m')
      .sign(secret);

    return NextResponse.json(
      { message: 'Email enviada', token: token },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao solicitar A2F' },
      { status: 500 },
    );
  }
}


async function VerifyToken(token: string) {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  const { payload } = await jose.jwtVerify(token, secret);
  const { codigo, redirectPath, usuario_id } = payload;
  return { cog: codigo, red: redirectPath, id: usuario_id };
}