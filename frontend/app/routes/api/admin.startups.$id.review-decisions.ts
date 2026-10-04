import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF: GET /api/admin/startups/:id/review-decisions
 *
 * Proxy para `GET /admin/startups/:id/review-decisions` no backend
 * (AdminStartupsController). Retorna o histórico de decisões de
 * auditoria (aprovar/rejeitar) tomadas pelos admins sobre a startup.
 *
 * Query params:
 *   - phase?: filtra por fase específica (1, 2 ou 3). Sem filtro retorna
 *     todas as fases, ordenadas por phase asc, createdAt desc.
 *
 * Cada entrada inclui `rejectedSnapshot` (JSON) quando decision='REJECTED'
 * — usado pelo frontend para diff field-by-field no admin quando o
 * founder atualizou o cadastro após uma rejeição.
 *
 * Auth: ADMIN guard no backend (cookie session propagada).
 */
export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: true, message: "ID da startup é obrigatório" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const phase = url.searchParams.get("phase");

  const queryString = phase ? `?phase=${encodeURIComponent(phase)}` : "";

  const cookieHeader = request.headers.get("cookie");

  try {
    const res = await fetch(
      `${BACKEND_URL}/admin/startups/${encodeURIComponent(id)}/review-decisions${queryString}`,
      {
        headers: {
          ...(cookieHeader && { cookie: cookieHeader }),
        },
      },
    );

    const json = await res.json().catch(() => ({
      error: true,
      message: "Resposta inválida do backend.",
    }));

    if (!res.ok) {
      return Response.json(
        {
          error: true,
          message: json?.message ?? `Backend ${res.status}`,
        },
        { status: res.status },
      );
    }

    // Desembrulha o envelope ResponseDto ({ error, message, codigo, data }).
    const payload = json?.data !== undefined ? json.data : json;
    return Response.json(payload ?? (phase ? null : []));
  } catch {
    return Response.json(
      { error: true, message: "Serviço de decisões indisponível." },
      { status: 502 },
    );
  }
}
