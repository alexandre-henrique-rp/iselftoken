import { BACKEND_URL } from "~/lib/api-config";

/**
 * Registra o acesso concluído no backend. O IP público do navegador é
 * encaminhado somente como fallback; o backend valida e decide se o usa.
 */
export async function action({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");
  const body = await request.json().catch(() => ({}));

  try {
    const response = await fetch(`${BACKEND_URL}/auth/access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    const responseBody = await response.json().catch(() => ({}));

    return Response.json(responseBody, { status: response.status });
  } catch {
    // O registro de acesso é best-effort e nunca deve impedir a navegação.
    return Response.json(
      { error: true, message: "Registro de acesso indisponível" },
      { status: 503 },
    );
  }
}
