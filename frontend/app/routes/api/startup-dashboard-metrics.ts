import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/startup/dashboard/metrics`, {
    method: "GET",
    headers: {
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  return Response.json(data);
}
