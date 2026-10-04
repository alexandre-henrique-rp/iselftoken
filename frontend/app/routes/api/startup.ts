import type { ActionFunctionArgs } from "react-router";
import type { FounderStartupResponse } from "~/types/founder-startup";

import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/startup`, {
    method: "GET",
    headers: {
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  return Response.json(data as FounderStartupResponse);
}

/**
 * BFF proxy para POST /startup no backend.
 * Usado pelo form inline de cadastro rápido no founder-dashboard.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json();

  const res = await fetch(`${BACKEND_URL}/startup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  return Response.json(data, { status: 201 });
}
