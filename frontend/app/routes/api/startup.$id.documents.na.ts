import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/** BFF para marcar uma categoria de documento como "Não se aplica". */
export async function action({ request, params }: ActionFunctionArgs) {
  const { id } = params;
  if (!id || request.method !== "PUT") {
    return Response.json(
      { error: true, message: "Requisição inválida", codigo: 400 },
      { status: 400 },
    );
  }

  const cookie = request.headers.get("cookie");
  const response = await fetch(`${BACKEND_URL}/startup/${id}/documents/na`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: await request.text(),
  });
  const data = await response.json().catch(() => ({ error: true }));
  return Response.json(data, { status: response.status });
}
