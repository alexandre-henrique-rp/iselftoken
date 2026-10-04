import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * POST /api/notifications/mark-all-as-read — BFF proxy para marcar todas as
 * notificações do usuário como lidas.
 */
export async function action({ request }: ActionFunctionArgs) {
  const cookie = request.headers.get("cookie") ?? "";
  const res = await fetch(`${BACKEND_URL}/notifications/mark-all-as-read`, {
    method: "POST",
    headers: {
      accept: "application/json",
      ...(cookie && { cookie }),
    },
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? {}, { status: res.status });
}
