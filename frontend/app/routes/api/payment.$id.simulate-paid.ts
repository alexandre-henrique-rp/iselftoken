import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `POST /payment/:id/dev/simulate-paid` no backend NestJS.
 *
 * Endpoint dev-only: dispara o mesmo path do webhook PIX_RECEIVED, marcando
 * o Payment como PAID e ativando a Subscription quando `purpose=SUBSCRIPTION`.
 * O backend retorna 403 quando `NODE_ENV=production`, então o botão de
 * simulação na UI fica disponível em qualquer ambiente — só funciona em dev.
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID do pagamento não fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/payment/${id}/dev/simulate-paid`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
