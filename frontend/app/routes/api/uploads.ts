import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");
  const search = new URL(request.url).search;

  const res = await fetch(`${BACKEND_URL}/uploads${search}`, {
    method: "POST",
    headers: {
      ...(contentType && { "Content-Type": contentType }),
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: request.body,
    // @ts-ignore
    duplex: "half",
  });

  const raw = await res.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {
      message:
        res.status === 413
          ? "O vídeo excede o limite de upload. Tente novamente com uma gravação mais curta."
          : raw || "Resposta inválida do servidor de upload.",
    };
  }

  return Response.json(data, { status: res.status });
}
