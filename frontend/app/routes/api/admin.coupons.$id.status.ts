/**
 * BFF: PATCH /api/admin/coupons/:id/status — Ativa ou desativa um cupom.
 */

import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function action({
  request,
  params,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "PATCH") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.active !== "boolean") {
    return Response.json(
      { error: true, message: "active é obrigatório (boolean)" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/admin/coupons/${params.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify({ active: body.active }),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
