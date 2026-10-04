import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: aplica cupom ao pagamento e, quando necessário, devolve a nova
 * cobrança PIX emitida pelo backend.
 */
export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json().catch(() => null);

  const { couponCode, paymentId } = body ?? {};
  if (!couponCode || !paymentId) {
    return Response.json(
      { error: true, message: "couponCode e paymentId são obrigatórios" },
      { status: 400 },
    );
  }

  const res = await fetch(`${BACKEND_URL}/payment/checkout/apply-coupon`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify({ couponCode, paymentId }),
  });

  const data = await res.json().catch(() => ({
    error: true,
    message: "Resposta inválida do backend.",
  }));
  return Response.json(data, { status: res.status });
}
