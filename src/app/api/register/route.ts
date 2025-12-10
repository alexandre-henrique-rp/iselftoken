import { registerSchema } from "@/schemas/register-schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Rota para registro de novo usuário
 * Recebe os dados do formulário, valida utilizando Zod e processa o registro.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validação dos dados recebidos
    const validatedData = registerSchema.parse(body);

    const cadastro = await fetch(`${process.env.NEXTAUTH_API_URL}/register/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedData),
    });

    if (!cadastro.ok) {
      // const user = await cadastro.json() || await cadastro.text();
      return NextResponse.json(
        {
          error: 'Erro ao registrar usuário',
          details: 'não foi possível registrar o usuário'
        },
        { status: 400 }
      );
    }

    const resp = await cadastro.text();
    const user = JSON.parse(resp)
    console.log('________________________________________________________')
    console.log("🚀 ~ POST ~ user:", user)

    await fetch(`${process.env.NEXTAUTH_API_URL}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usuario_id: user.data.usuario_id }),
    });

    // Simulação de sucesso
    return NextResponse.json(
      {
        message: 'Usuário registrado com sucesso',
      },
      { status: 201 }
    );

  } catch (error) {
    // Tratamento de erros de validação do Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    console.error('Erro no registro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao processar registro' },
      { status: error ? (error as any).status : 500 }
    );
  }
}