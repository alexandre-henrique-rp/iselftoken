import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request, params }: ActionFunctionArgs) {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "id obrigatório" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.isActive !== "boolean") {
    return new Response(
      JSON.stringify({ error: "isActive (boolean) obrigatório" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const cookie = request.headers.get("cookie") ?? "";

  const res = await fetch(
    `${BACKEND_URL}/admin/users/${encodeURIComponent(id)}/status`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify({ isActive: body.isActive }),
    },
  );

  const data = await res.json().catch(() => null);
  return new Response(JSON.stringify(data ?? { error: true }), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}