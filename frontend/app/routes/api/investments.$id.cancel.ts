import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request, params }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID do investimento não fornecido" },
      { status: 400 },
    );
  }

  const cookie = request.headers.get("cookie");
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${BACKEND_URL}/investments/${id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  return Response.json(data, { status: response.status });
}
