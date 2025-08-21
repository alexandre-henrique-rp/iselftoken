import { NextResponse } from 'next/server';

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
    } = body;
    const data = {
      nome: nome,
      cpf: cpf,
      email: email,
      telefone: telefone,
      cep: cep,
      endereco: endereco,
      bairro: bairro,
      cidade: cidade,
      numero: numero,
      pais: pais,
      uf: uf,
      senha: senha,
      confirmacaoSenha: confirmacaoSenha,
      termo: termo,
    };
    const response = await fetch(
      `${process.env.NEXTAUTH_API_URL}/register-startup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      },
    );
    const result = await response.json();
    console.log(result);
    if (!response.ok) {
      return NextResponse.json(
        { error: result.message || 'Erro ao registrar fundador' },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: 'Fundador registrado com sucesso' },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao registrar fundador' },
      { status: 500 },
    );
  }
}
