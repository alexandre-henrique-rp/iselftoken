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
      `${process.env.NEXTAUTH_API_URL}/register/investor`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...data,
          codigo: codigo,
        }),
      },
    );

    // Captura a resposta como texto primeiro para debug
    const responseText = await response.text();
    console.log("🚀 ~ POST ~ responseText:", responseText);
    console.log("🚀 ~ POST ~ response.status:", response.status);
    console.log("🚀 ~ POST ~ response.headers:", Object.fromEntries(response.headers.entries()));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("🚀 ~ POST ~ JSON Parse Error:", parseError);
      console.error("🚀 ~ POST ~ Raw response:", responseText);
      return NextResponse.json(
        {
          message: 'Erro na resposta da API externa',
          error: `Resposta inválida: ${responseText.substring(0, 200)}...`,
        },
        { status: 500 },
      );
    }
    console.log("🚀 ~ POST ~ result:", result)

    if (!response.ok || result.status === 'error') {
      return NextResponse.json(
        {
          message: result.message || 'Erro ao registrar investidor',
          error: null,
        },
        { status: response.ok ? 400 : response.status },
      );
    }

    const payload = {
      codigo: codigo,
      redirectPath: redirectPath,
      usuario_id: result.data.usuario_id,
    };

    if (result.data.usuario_id) {
      const request = await fetch(
        `${process.env.NEXTAUTH_API_URL}/activate/investor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            "usuario_id": result.data.usuario_id,
          }),
        },
      );
      const result2 = await request.json();
      console.log("🚀 ~ POST ~ result2:", result2)
      
    }

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
      { message: 'Investidor registrado com sucesso', url: url },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro ao registrar investidor', error: JSON.stringify(error, null, 2) || null },
      { status: 500 },
    );
  }
}
