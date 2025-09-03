import generateA2fCode from '@/modules/codigo/a2f';
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { GetSessionServer } from '@/context/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email } = body;
    const session = await GetSessionServer();
    const codigo = generateA2fCode();

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

    const role = session?.user.role;
    const red =
      role === 'fundador'
        ? '/dashboard'
        : role === 'admin'
          ? '/admin'
          : role === 'afiliado'
            ? '/afiliado'
            : '/home';

    // gerar payload
    const payload = {
      codigo: codigo,
      redirectPath: red,
      usuario_id: session?.user.id,
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

    return NextResponse.json(
      { message: 'Código gerado com sucesso', token: token, url: url },
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
