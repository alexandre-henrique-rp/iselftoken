/**
 * @name action
 * @description Solicita um novo token usando o refreshToken.
 *
 * @param {import("react-router").ActionFunctionArgs} args - Dados da requisição.
 * @returns {Promise<Response>} Resposta da API externa.
 */
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";

const newTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token é obrigatório"),
});

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  const payload = await request.json();
  const result = newTokenSchema.safeParse(payload);

  if (!result.success) {
    return Response.json(
      {
        error: true,
        message: "Refresh token inválido",
        detalhe: result.error.flatten(),
      },
      { status: 400 }
    );
  }

  const response = await fetch(`${process.env.API_URL}/auth/newtoken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: result.data.refreshToken }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    return Response.json(data, { status: 400 });
  }

  return Response.json(data, { status: 200 });
}
