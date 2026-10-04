/**
 * BFF: POST /api/startups — Cria startup.
 *
 * Backend real: POST /startup (singular, em startup.controller.ts).
 * O BFF `routes/api/startup.ts` já cobre GET e POST. Este é mantido
 * como alias para compatibilidade com hooks legados.
 */
import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/startup`, {
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