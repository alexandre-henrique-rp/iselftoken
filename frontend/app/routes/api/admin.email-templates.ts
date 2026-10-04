import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

function makeHeaders(request: Request) {
  const cookie = request.headers.get("cookie");
  return {
    accept: "application/json",
    "content-type": "application/json",
    ...(cookie && { cookie }),
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const res = await fetch(
    `${BACKEND_URL}/api/admin/email-templates${qs ? `?${qs}` : ""}`,
    { method: "GET", headers: makeHeaders(request), credentials: "include" },
  );
  const data = await res.json().catch(() => null);
  return Response.json({ data: data?.data ?? [] }, { status: res.status });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }

  const body = await request.json().catch(() => null);
  const res = await fetch(`${BACKEND_URL}/api/admin/email-templates`, {
    method: "POST",
    headers: makeHeaders(request),
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
