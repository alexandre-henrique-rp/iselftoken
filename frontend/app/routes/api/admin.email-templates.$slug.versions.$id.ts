import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

function makeHeaders(request: Request) {
  const cookie = request.headers.get("cookie");
  return {
    accept: "application/json",
    "content-type": "application/json",
    ...(cookie && { cookie }),
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { slug, id } = params;
  if (request.method !== "PATCH") {
    return Response.json({ error: true, message: "Método não permitido" }, { status: 405 });
  }
  const body = await request.json().catch(() => null);
  const res = await fetch(`${BACKEND_URL}/api/admin/email-templates/${slug}/versions/${id}`, {
    method: "PATCH",
    headers: makeHeaders(request),
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
