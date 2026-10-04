import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `POST /payment/:id/card` no backend NestJS.
 *
 * Recebe do frontend o `payment_token` (gerado no navegador pela lib
 * payment-token-efi) + parcelas, e repassa ao backend, que cria a cobrança
 * one-step na EFI. Os dados do cartão NUNCA passam por aqui — só o token.
 */
export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<Response> {
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
  const body = await request.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/payment/${id}/card`, {
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
