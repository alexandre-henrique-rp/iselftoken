import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: PATCH /api/admin/payments/:id
 *
 * Proxy para `PATCH /admin/payments/:id` no backend (AdminPaymentsController.
 * update). Auth + role ADMIN garantidos pelo backend.
 */
export async function action({
  params,
  request,
}: ActionFunctionArgs): Promise<Response> {
  const { id } = params;

  if (!id) {
    return Response.json(
      { error: true, message: "ID do pagamento nao fornecido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.text();

  try {
    const res = await fetch(`${BACKEND_URL}/admin/payments/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body,
    });

    const data = await res.json().catch(() => ({
      error: true,
      message: "Resposta invalida do backend.",
    }));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      { error: true, message: "Servico de pagamentos indisponivel." },
      { status: 502 },
    );
  }
}
