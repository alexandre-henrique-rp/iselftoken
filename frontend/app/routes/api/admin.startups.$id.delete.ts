import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `DELETE /admin/startups/:id`.
 * Body: `{ reason: string }` (opcional, min 10 chars exige o backend).
 *
 * Responses:
 * - 204: Exclusao bem-sucedida
 * - 403: Permissao negada (role nao compliance)
 * - 404: Startup nao encontrada
 * - 400: Reason invalida (menos de 10 chars)
 */
export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "DELETE") {
    return Response.json(
      { error: true, message: "Metodo nao permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da startup nao fornecido", codigo: 400 },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body vazio
  }

  const backendRes = await fetch(`${BACKEND_URL}/admin/startups/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

  // Proxy direto do status code (204, 403, 404, 400)
  if (backendRes.status === 204) {
    return new Response(null, { status: 204 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return Response.json(data ?? { error: true }, { status: backendRes.status });
}
