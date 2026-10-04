import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request, params }: ActionFunctionArgs) {
  const id = params.id;
  if (!id) {
    return Response.json({ error: true, message: "ID da startup obrigatório" }, { status: 400 });
  }

  const cookie = request.headers.get("cookie") ?? "";
  const res = await fetch(`${BACKEND_URL}/startup/${id}/complete-stage2`, {
    method: "POST",
    headers: { accept: "application/json", ...(cookie ? { cookie } : {}) },
  });
  const body = await res.json().catch(() => null);
  return Response.json(body ?? { error: true }, { status: res.status });
}
