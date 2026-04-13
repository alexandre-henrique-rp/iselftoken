import { newPasswordSchema, NewPasswordType } from "@/schemas/forgotPasswordValid-schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/reload-password/[id]'>
) {
  return req.json()
    .then(async (body) => {
      console.log("🚀 ~ POST ~ body:", body)
      const { id } = await ctx.params;

      const validate: NewPasswordType = newPasswordSchema.parse(body)
      console.log("🚀 ~ POST ~ validate:", validate)

      return fetch(`${process.env.NEXTAUTH_API_URL}/change-password/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validate),
      });
    })
    .then(async (api) => {
      console.log("🚀 ~ POST ~ api:", api)

      const data = await api.json();
      console.log("🚀 ~ POST ~ data:", data)

      if (!api.ok) {
        throw new Error('Erro ao processar solicitação na API externa');
      }

      return NextResponse.json({ message: 'Solicitação processada com sucesso' }, { status: 200 })
    })
    .catch((error) => {
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
    });
}
