import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/** BFF para remover a marcação "Não se aplica". */
export async function action({ request, params }: ActionFunctionArgs) {
  const { id, categoria } = params;
  if (!id || !categoria || request.method !== "DELETE") {
    return Response.json(
      { error: true, message: "Requisição inválida", codigo: 400 },
      { status: 400 },
    );
  }

  const cookie = request.headers.get("cookie");
  const response = await fetch(
    `${BACKEND_URL}/startup/${id}/documents/na/${encodeURIComponent(categoria)}`,
    {
      method: "DELETE",
      headers: cookie ? { cookie } : undefined,
    },
  );
  const data = await response.json().catch(() => ({ error: true }));
  return Response.json(data, { status: response.status });
}
