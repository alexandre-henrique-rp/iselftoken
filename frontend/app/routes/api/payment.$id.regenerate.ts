import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `POST /payment/:id/regenerate` no backend NestJS.
 *
 * "Gerar Novo Pagamento" — recria a cobrança de reserva a partir de um
 * Payment TOKEN_RESERVATION EXPIRED/CANCELED, sem refazer o wizard
 * (fluxo_startup §1/§4). Retorna { paymentId, reused } para o cliente
 * navegar ao checkout.
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
  const res = await fetch(
    `${BACKEND_URL}/payment/${encodeURIComponent(id)}/regenerate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );
  const data = await res.json().catch(() => ({ error: true }));
  return Response.json(data, { status: res.status });
}
