import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/perfil/[id]'>,
) {
  try {
    const { id } = await ctx.params;

    const user = await fetch(`${process.env.NEXTAUTH_API_URL}/users/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const userData = await user.json();
    if (!user.ok) {
      return NextResponse.json(
        {
          message: userData.message || 'Erro ao buscar perfil',
          error: null,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(userData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Erro ao buscar perfil',
        error: JSON.stringify(error, null, 2) || null,
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  ctx: RouteContext<'/api/perfil/[id]'>,
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const {
      // nome,
      // email,
      role,
      // telefone,
      // cep,
      // endereco,
      // bairro,
      // cidade,
      // uf,
      // pais,
      // numero,
      // avatar,
      // documento,
      // reg_documento,
      // tipo_documento,
      // status,
      // termos,
      // bio_facial,
      // fundador,
      // afiliado,
      // dt_nascimento,
    } = body;

    let url;
    switch (role) {
      case 'fundador':
        url = `${process.env.NEXTAUTH_API_URL}/users/${id}`;
        break;
      case 'afiliado':
        url = `${process.env.NEXTAUTH_API_URL}/affiliate/${id}`;
        break;
      case 'investidor':
        url = `${process.env.NEXTAUTH_API_URL}/investidor/${id}`;
        break;
      case 'admin':
        url = `${process.env.NEXTAUTH_API_URL}/users/${id}`;
        break;
      default:
        url = `${process.env.NEXTAUTH_API_URL}/users/${id}`;
        break;
    }

    const user = await fetch(url, {
      method: 'PUT',
      body,
    });
    const userData = await user.json();
    console.log('🚀 ~ PUT response ~ userData:', userData);
    if (!user.ok) {
      return NextResponse.json(
        {
          status: 'error',
          message: userData.message || 'Erro ao atualizar perfil',
          error: userData.error || null,
        },
        { status: user.status },
      );
    }
    return NextResponse.json(
      {
        status: 'success',
        message: 'Perfil atualizado com sucesso',
        data: userData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("🚀 ~ PUT ~ error:", error)
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Erro ao atualizar perfil',
        error: JSON.stringify(error, null, 2) || null,
      },
      { status: 500 },
    );
  }
}
