/**
 * BFF: POST /api/payment/startup-checkout — Cria checkout de reserva de tokens.
 *
 * O backend cria Payment PENDING + StartupDraft persistente em uma única
 * transação. O payload não é logado nem devolvido na resposta.
 */
import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/payment/checkout-draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify({
      amount: Number(body?.amount ?? 0),
      method: body?.method,
      payload: body?.payload ?? {},
    }),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
