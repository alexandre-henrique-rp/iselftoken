import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';


export async function PUT(request: NextRequest) {
  try {

    const body = await request.json();
    console.log("🚀 ~ PUT ~ body:", body)

    const TokenClient = body.token;

    // Validar se TokenClient foi fornecido
    if (!TokenClient) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 400 },
      );
    }

    // Tentar verificar o token com tratamento de erro específico
    const tokenData = await VerifyToken(TokenClient);
    console.log("🚀 ~ PUT ~ tokenData:", tokenData)

    const { cog, red, Id } = tokenData;

    if (!cog || !red || !Id) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 },
      );
    }

    if (cog !== body.client_code) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 },
      );
    }
    // Validar se o redirectPath é uma string válida
    if (!red || typeof red !== 'string') {

      return NextResponse.json(
        { error: 'Caminho de redirecionamento inválido' },
        { status: 400 },
      );
    }
    
    return NextResponse.json(
      { message: 'Código verificado', url: red },
      { status: 200 },
    );

  } catch (error) {
    console.error('Erro geral no PUT A2F:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

async function VerifyToken(token: string) {
  // Validar se o token existe e não está vazio
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Token inválido ou não fornecido');
  }

  // Validar se o token tem o formato JWT básico (3 partes separadas por ponto)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    throw new Error('Token JWT deve ter 3 partes separadas por ponto');
  }

  // Validar se o secret existe
  const secretKey = process.env.NEXTAUTH_SECRET;
  if (!secretKey) {
    throw new Error('NEXTAUTH_SECRET não configurado');
  }

  try {
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jose.jwtVerify(token, secret);
    const { codigo, redirectPath, usuario_id } = payload;
    return { cog: codigo, red: redirectPath, Id: usuario_id || null };
  } catch (error) {
    console.error('Erro ao verificar JWT:', error);
    throw new Error('Token JWT inválido ou expirado');
  }
}
