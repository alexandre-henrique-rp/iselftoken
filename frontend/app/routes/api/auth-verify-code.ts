import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request }: { request: Request }) {
  const body = await request.json();

  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/auth/verify-code`, {
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

  const headers = new Headers();
  const setCookies = res.headers.getSetCookie();
  for (const cookie of setCookies) {
    headers.append("set-cookie", cookie);
  }

  return Response.json(data, { headers });
}