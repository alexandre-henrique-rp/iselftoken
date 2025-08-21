import { NextResponse } from "next/server";

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
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/register/afiliado`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    console.log(result);
    if (!response.ok) {
      return NextResponse.json(
        { error: result.message || 'Erro ao registrar afiliado' },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: 'Afiliado registrado com sucesso' },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: 'Erro ao registrar afiliado' }, { status: 500 });
  }
}
