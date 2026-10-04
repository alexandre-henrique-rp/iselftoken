import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json();

  const totalAmount = body.products?.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) ?? body.amount;

  const items = body.products?.map((p: { purpose: string; amount: number }) => ({
    name: p.purpose === "TOKEN_RESERVATION"
      ? "Reserva de Tokens"
      : p.purpose === "FAST_TRACK_REVIEW"
        ? "Fast Track Review"
        : p.purpose,
    description: p.purpose,
    quantity: 1,
    unitPrice: p.amount,
  }));

  const requestBody = {
    amount: totalAmount,
    method: body.method,
    purpose: body.purpose ?? body.products?.[0]?.purpose ?? "TOKEN_RESERVATION",
    campaignId: body.campaignId,
    items,
  };

  const res = await fetch(`${BACKEND_URL}/payment/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(requestBody),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
