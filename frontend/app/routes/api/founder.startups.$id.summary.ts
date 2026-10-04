import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ error: true, message: "Startup inválida" }, { status: 400 });
  }

  const cookie = request.headers.get("cookie") ?? "";
  const res = await fetch(`${BACKEND_URL}/startup/${id}`, {
    headers: { accept: "application/json", ...(cookie ? { cookie } : {}) },
  });
  const body = await res.json().catch(() => null);
  const data = body?.data ?? body;
  return Response.json(data ?? { error: true }, { status: res.status });
}
