/**
 * BFF: GET /api/transparency/featured/:startupId
 *   -> backend /transparency/startups/:startupId/featured-report
 *
 * Retorna 200 com o post vigente do mes atual ou 204 se nao houver.
 * Frontend trata 204 como "nao renderizar nada" (sem placeholder).
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md (TRANSP-03)
 */
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { startupId: string };
}) {
  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(
    `${BACKEND_URL}/transparency/startups/${params.startupId}/featured-report`,
    {
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  // 204 No Content => devolve 200 com data: null pro frontend nao precisar tratar vazio
  if (res.status === 204) {
    return Response.json({ data: null }, { status: 200 });
  }

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}