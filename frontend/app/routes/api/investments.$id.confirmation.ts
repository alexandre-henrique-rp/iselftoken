import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID do investimento não fornecido" },
      { status: 400 },
    );
  }

  const cookie = request.headers.get("cookie");
  const response = await fetch(`${BACKEND_URL}/investments/${id}/confirmation`, {
    headers: {
      accept: "application/json",
      ...(cookie ? { cookie } : {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return Response.json(data, { status: response.status });
}
