import { newPasswordSchema, NewPasswordType } from "@/schemas/forgotPasswordValid-schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json()
    const { id } = await params;

    const validate: NewPasswordType = newPasswordSchema.parse(body)

    const api = await fetch(`${process.env.NEXTAUTH_API_URL}/change-password/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validate),
    });
    
    const data = await api.json()
    
    if (!api.ok) {
      throw new Error(data.message || 'Erro ao processar solicitação na API externa')
    }

    return NextResponse.json({ message: 'Solicitação processada com sucesso', data: data }, { status: 200 })

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

    console.error('Erro na alteração de senha:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao solicitar alteração de senha' },
      { status: 500 }
    );
  }
}
