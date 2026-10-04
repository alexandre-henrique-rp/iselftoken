import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `DELETE /subscriptions/:id` no backend NestJS.
 *
 * Usado pelo rollback em `/pricing` quando a criação da Subscription PENDING
 * deu certo mas o POST `/api/payment` falhou — limpa a Subscription órfã
 * pra não acumular lixo a cada retry.
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "DELETE") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da assinatura não fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/subscriptions/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { ok: true }, { status: res.status });
}
