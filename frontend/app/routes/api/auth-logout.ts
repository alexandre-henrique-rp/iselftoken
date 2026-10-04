import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/auth/logout`, {
    method: "POST",
    headers: {
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json().catch(() => ({
    error: true,
    message: "Não foi possível concluir o logout.",
  }));

  const headers = new Headers();
  const setCookies = res.headers.getSetCookie();
  for (const cookie of setCookies) {
    headers.append("set-cookie", cookie);
  }

  return Response.json(data, { status: res.status, headers });
}