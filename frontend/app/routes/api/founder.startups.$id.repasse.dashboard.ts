import { BACKEND_URL } from "~/lib/api-config";

/**
 * GET /api/founder/startups/:id/repasse/dashboard
 * Proxy BFF para o endpoint do founder: dashboard de repasse da startup.
 */
export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(
    `${BACKEND_URL}/api/founder/startups/${params.id}/repasse/dashboard`,
    {
      headers: {
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
