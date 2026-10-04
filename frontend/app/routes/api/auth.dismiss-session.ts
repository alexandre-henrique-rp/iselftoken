import type { ActionFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: proxy para `POST /auth/dismiss-session` no backend NestJS.
 * Chamado pela landing page /auth/dismiss-session quando o user clica
 * em "Nao fui eu" no email de alerta de login novo.
 *
 * M4 (audit): token vem via body (POST application/json) em vez de query.
 * Email aponta para #fragment (sem leak em logs), frontend extrai do
 * hash e envia no body — nada passa em query string.
 */
export async function action({
  request,
}: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }

  const body = await request.json().catch(() => null) as { token?: string } | null;
  const token = body?.token;
  if (!token) {
    return Response.json(
      { error: true, message: "Token ausente" },
      { status: 400 },
    );
  }

  // Encaminha como body JSON para o backend (que tambem passa via body).
  const res = await fetch(`${BACKEND_URL}/auth/dismiss-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true, message: "Falha" }, {
    status: res.status,
  });
}