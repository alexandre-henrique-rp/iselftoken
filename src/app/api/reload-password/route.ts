import { forgotPasswordValidSchema, PasswordValidType } from "@/schemas/forgotPasswordValid-schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const validate: PasswordValidType = forgotPasswordValidSchema.parse(body)

    const api = await fetch(`${process.env.NEXTAUTH_API_URL}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validate),
    });

    let data;
    try {
      data = await api.json();
    } catch {
      data = { message: 'Erro ao processar resposta da API externa' };
    }

    console.log("🚀 ~ POST ~ data:", data)

    if (!api.ok) {
      return NextResponse.json(
        { message: data.message || data.error || 'Erro interno ao solicitar alteração de senha' },
        { status: api.status >= 200 && api.status <= 599 ? api.status : 500 }
      );
    }

    return NextResponse.json({ message: 'codigo solicitado com sucesso', data: data }, { status: 200 })

  } catch (error: any) {
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

    const status = error?.status && typeof error.status === 'number' && error.status >= 200 && error.status <= 599
      ? error.status
      : 500;

    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno ao solicitar alteração de senha' },
      { status }
    );
  }
}


