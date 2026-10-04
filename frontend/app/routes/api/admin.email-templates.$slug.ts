import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

function makeHeaders(request: Request) {
  const cookie = request.headers.get("cookie");
  return {
    accept: "application/json",
    "content-type": "application/json",
    ...(cookie && { cookie }),
  };
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { slug } = params;
  const res = await fetch(
    `${BACKEND_URL}/api/admin/email-templates/${slug}`,
    { method: "GET", headers: makeHeaders(request), credentials: "include" },
  );
  const data = await res.json().catch(() => null);
  return Response.json({ data: data?.data ?? null }, { status: res.status });
}
