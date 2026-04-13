import type { ActionFunctionArgs } from "react-router";
import { encryptPayload } from "~/lib/special-functions";
import type { PayloadAf2Type } from "~/types/payloadAf2";

/**
 * @name action
 * @description Encaminha o cadastro para o serviço externo.
 *
 * @param {ActionFunctionArgs} args - Dados da requisição.
 * @returns {Promise<Response>} Resposta da API externa.
 */
export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  const payload = await request.json();

  const payloadAf2: PayloadAf2Type = {
    codigo: payload.codigo,
    path: "/login",
    email: payload.email,
    createdAt: new Date(),
    expiresAt: new Date(new Date().getTime() + 5 * 60 * 1000),
  };

  // expira em 5 minutos
  const hash = await encryptPayload(payloadAf2, { expiresIn: '5m' });

  const response = await fetch(`${process.env.API_URL}/auth/register/user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      urlRedirect: `${payload.urlRedirect}/auth/${hash}`,
    }),
  });

  const data = await response.json();

  const redirectTo = `/auth/${hash}`;

  if (!response.ok || data.error) {
    return Response.json(data, { status: 400 });
  }

  return Response.json({...data, redirectTo});
}
