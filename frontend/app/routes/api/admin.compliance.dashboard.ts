import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/** BFF para o resumo operacional do dashboard de Compliance. */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const cookie = request.headers.get("cookie");
  const response = await fetch(`${BACKEND_URL}/admin/compliance/dashboard`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(cookie && { cookie }),
    },
    credentials: "include",
  });

  const body = await response.json().catch(() => ({ error: true }));
  return Response.json(body, { status: response.status });
}
