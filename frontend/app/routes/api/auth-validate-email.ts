import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request }: { request: Request }) {
  const body = await request.json();
  const token = body.token;

  if (!token) {
    return Response.json(
      { error: true, message: "Token não fornecido", codigo: 400 },
      { status: 400 }
    );
  }

  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/auth/validate-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify({ token }),
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  return Response.json(data);
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return Response.json(
      { error: true, message: "Token não fornecido", codigo: 400 },
      { status: 400 }
    );
  }

  return action({ request } as any);
}