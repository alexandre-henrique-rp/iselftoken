import type { LoaderFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function loader({ request }: LoaderFunctionArgs) {
  const headers = createSessionHeaders(request);

  const api = await fetch(`${process.env.API_URL}/users/me`, {
    method: "GET",
    headers,
  });

  const data = await api.json();

  if (!api.ok || data.error) {
    return new Response(
      JSON.stringify({
        error: true,
        message: data?.message ?? "Não autenticado",
      }),
      {
        status: api.status || 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const user = data.data ?? data;

  return new Response(
    JSON.stringify({
      id: user.id,
      publicId: user.publicId,
      email: user.email,
      nome: user.nome,
      role: user.role,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
