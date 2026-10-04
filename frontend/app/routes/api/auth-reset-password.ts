import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request }: { request: Request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return Response.json(
      { error: true, message: "Token não fornecido", codigo: 400 },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: true, message: "Corpo da requisição inválido", codigo: 400 },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");

  try {
    const res = await fetch(
      `${BACKEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader && { cookie: cookieHeader }),
        },
        body: JSON.stringify(body),
      },
    );

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json(
      {
        error: true,
        message: "Serviço de autenticação indisponível no momento.",
        codigo: 503,
      },
      { status: 503 },
    );
  }
}
