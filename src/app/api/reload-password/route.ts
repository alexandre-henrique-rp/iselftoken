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
    const data = await api.json()
    console.log("🚀 ~ POST ~ data:", data)
    if (!api.ok) {
      throw new Error(data.message)
    }

    return NextResponse.json({ message: 'codigo solicitado com sucesso', data: data }, { status: 200 })

  } catch (error) {
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
      { error: error instanceof Error ? error.message : 'Erro interno ao solicitar alteração de senha' },
      { status: error ? (error as any).status : 500 }
    );
  }
}


