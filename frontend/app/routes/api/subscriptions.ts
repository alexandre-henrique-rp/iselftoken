import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `POST /subscriptions` no backend NestJS.
 * Cria uma assinatura para o user autenticado e propaga Set-Cookie.
 *
 * Fase futura (pagamento real): substituir o status `ACTIVE` por
 * `PENDING` + integração com gateway (Asaas) emitindo token de checkout.
 */
export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json();

  const res = await fetch(`${BACKEND_URL}/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
