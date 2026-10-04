import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

async function proxy(request: Request, method: string) {
  const cookie = request.headers.get("cookie") ?? "";
  const body = method === "GET" ? undefined : await request.text();
  const res = await fetch(`${BACKEND_URL}/admin/config/categories`, {
    method,
    headers: {
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body,
  });
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}

export async function loader({ request }: LoaderFunctionArgs) {
  return proxy(request, "GET");
}

export async function action({ request }: ActionFunctionArgs) {
  return proxy(request, request.method);
}
