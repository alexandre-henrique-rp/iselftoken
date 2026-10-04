import { BACKEND_URL } from "~/lib/api-config";

export async function loader({
  params,
  request,
}: {
  params: { id?: string };
  request: Request;
}) {
  if (!params.id) {
    return Response.json(
      { error: true, message: "Identificador do upload inválido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const res = await fetch(
    `${BACKEND_URL}/uploads/${encodeURIComponent(params.id)}/status`,
    {
      headers: {
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    },
  );

  const data = await res.json().catch(() => null);
  if (!data) {
    return Response.json(
      { error: true, message: "Resposta inválida do servidor de upload" },
      { status: 502 },
    );
  }

  return Response.json(data, { status: res.status });
}
