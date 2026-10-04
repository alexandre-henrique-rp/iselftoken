import type { AuthResponse } from "~/types/auth";

import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request }: { request: Request }) {
  const body = await request.json();
  const cookieHeader = request.headers.get("cookie");

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Backend indisponível (ex.: ECONNREFUSED). Retorna 503 com mensagem
    // amigável em vez de estourar 500 "Unexpected Server Error".
    return Response.json(
      {
        error: true,
        message: "Serviço de autenticação indisponível no momento. Tente novamente em instantes.",
        codigo: 503,
      },
      { status: 503 }
    );
  }

  const data = await res.json();

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  const headers = new Headers();
  const setCookies = res.headers.getSetCookie();
  for (const cookie of setCookies) {
    headers.append("set-cookie", cookie);
  }

  return Response.json(
    {
      error: false,
      message: "Login realizado com sucesso",
      codigo: 200,
      data: data.data as AuthResponse,
    },
    { headers }
  );
}