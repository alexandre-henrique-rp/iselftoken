import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: true, message: "Método não permitido" }, { status: 405 });
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token) return Response.json({ error: true, message: "Token ausente" }, { status: 400 });
  const response = await fetch(`${BACKEND_URL}/auth/confirm-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: body.token }) });
  const data = await response.json().catch(() => ({ error: true, message: "Falha ao processar a confirmação" }));
  return Response.json(data, { status: response.status });
}
