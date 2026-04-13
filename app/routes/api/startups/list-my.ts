import type { LoaderFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function loader({ request }: LoaderFunctionArgs) {
  const headers = createSessionHeaders(request);
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return new Response(
      JSON.stringify({
        data: { startups: [] },
        error: true,
        message: "API_URL não configurada",
      }),
      { status: 500, headers },
    );
  }

  const response = await fetch(`${apiUrl}/startup`, {
    method: "GET",
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (response.ok && !payload?.error) {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      data: { startups: [] },
      error: true,
      message: payload?.message ?? "Não foi possível carregar suas startups",
    }),
    { status: response.status || 502, headers },
  );
}
