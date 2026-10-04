import { BACKEND_URL } from "~/lib/api-config";

/**
 * GET /api/investments/my-startups
 *
 * BFF proxy para o backend NestJS `GET /investments/my-startups`.
 * Retorna startups em que o usuário logado é investidor, agregando
 * total investido, quantidade de tokens e valor atual dos Tokens.
 *
 * Auth: cookie de sessão propagado automaticamente.
 */
export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/investments/my-startups`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return Response.json(data ?? { error: true }, { status: res.status });
  }

  return Response.json(data);
}
