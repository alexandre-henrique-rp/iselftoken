import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { id } = params;
  const cookieHeader = request.headers.get("cookie");

  if (!id) {
    return Response.json({ message: "ID do plano não fornecido" }, { status: 400 });
  }

  const res = await fetch(`${BACKEND_URL}/plans/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
