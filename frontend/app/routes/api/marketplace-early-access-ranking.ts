import type { LoaderFunctionArgs } from "react-router";

import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "10";

  try {
    const res = await fetch(`${BACKEND_URL}/marketplace/early-access/ranking?limit=${limit}`);
    const data = await res.json().catch(() => null);
    return Response.json(data ?? {
      error: false,
      codigo: 200,
      data: { ranking: [], totalReservations: 0, lastUpdated: new Date().toISOString() },
    });
  } catch {
    return Response.json({
      error: false,
      message: "Ranking indisponível no momento",
      codigo: 200,
      data: {
        ranking: [],
        totalReservations: 0,
        lastUpdated: new Date().toISOString(),
      },
    });
  }
}
