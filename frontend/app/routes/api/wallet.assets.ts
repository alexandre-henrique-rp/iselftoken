import { BACKEND_URL } from "~/lib/api-config";

/**
 * GET /api/wallet/assets
 *
 * BFF proxy para o backend NestJS `GET /wallet/assets`.
 * Retorna os ativos de tokens do investidor autenticado, agrupados por
 * (startupId, campaignId, investmentId) — cada asset traz a lista de Token
 * IDs individuais emitidos para aquele aporte, com `shortCode` (últimos
 * 8 chars do hash), `purchaseVal`, `currentVal` e `acquiredAt`.
 *
 * Auth: cookie de sessão propagado automaticamente (AuthGuard no backend).
 */
export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/wallet/assets`, {
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