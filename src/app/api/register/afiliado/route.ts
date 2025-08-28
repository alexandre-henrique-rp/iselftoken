import generateA2fCode from '@/modules/codigo/a2f';
import { NextResponse } from 'next/server';
import * as jose from 'jose';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nome,
      cpf,
      telefone,
      cep,
      endereco,
      bairro,
      cidade,
      uf,
      pais,
      numero,
      email,
      senha,
      confirmacaoSenha,
      termo,
      redirectPath,
    } = body;
    const data = {
      nome: nome.trim(),
      cpf: cpf.replace(/\D/g, '').trim(),
      email: email.trim(),
      telefone: telefone.replace(/\D/g, '').trim(),
      cep: cep.replace(/\D/g, '').trim(),
      endereco: endereco.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      numero: numero.trim(),
      pais: pais.trim(),
      uf: uf.trim(),
      senha: senha.trim(),
      confirmacaoSenha: confirmacaoSenha.trim(),
      termo: termo,
    };

    const codigo = generateA2fCode();

    const response = await fetch(
      `${process.env.NEXTAUTH_API_URL}/register/afiliado`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ...data, codigo: codigo }),
      },
    );
    const result = await response.json();
    console.log(result);
    if (!response.ok) {
      return NextResponse.json(
        { error: result.message || 'Erro ao registrar afiliado' },
        { status: 500 },
      );
    }
    const payload = {
      codigo: codigo,
      redirectPath: redirectPath,
      usuario_id: result.data.usuario_id,
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

    return NextResponse.json(
      { message: 'Afiliado registrado com sucesso', url: url },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao registrar afiliado' },
      { status: 500 },
    );
  }
}
