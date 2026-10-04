import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `POST /admin/withdrawals/:id/approve` no backend NestJS.
 *
 * Aceita POST e encaminha o body. Backend valida role (AdminGuard) e
 * transita o status REQUESTED → PROCESSING, gravando `approvedBy`.
 */
export async function action({ params, request }: ActionFunctionArgs): Promise<Response> {
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(`${BACKEND_URL}/admin/withdrawals/${params.id}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

// Loader stub — método GET não é suportado pelo backend; responde 405.
export async function loader(_args: LoaderFunctionArgs): Promise<Response> {
  return new Response("Method Not Allowed", { status: 405 });
}