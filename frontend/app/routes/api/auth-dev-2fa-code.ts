import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF DEV-ONLY: retorna o codigo 2FA atual para a sessao do usuario.
 *
 * FRONTEND E2E: usado por testes Playwright para capturar o codigo 2FA
 * gerado pelo backend (impossivel de acessar via browser sem acesso ao Redis).
 *
 * GATE: retorna 403 se NODE_ENV === 'production'.
 * AUTH: requer cookie session_id.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: true, message: "Endpoint dev-only desabilitado em producao", codigo: 403 },
      { status: 403 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return Response.json(
      { error: true, message: "Sessao nao fornecida", codigo: 401 },
      { status: 401 },
    );
  }

  const res = await fetch(`${BACKEND_URL}/auth/dev/2fa-code`, {
    method: "GET",
    headers: { cookie: cookieHeader },
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  return Response.json(data);
}
