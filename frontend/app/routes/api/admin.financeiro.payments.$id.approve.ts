import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `POST /admin/financeiro/payments/:id/approve`.
 * Body esperado: `{ justification: string, comprovanteKey: string }`.
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
  const body = await request.json();

  const res = await fetch(`${BACKEND_URL}/admin/financeiro/payments/${id}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
