import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy: registra a telemetria da prova de vida (Fase 2).
 * Encaminha o cookie httpOnly para o backend NestJS.
 */
export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const userAgent = request.headers.get("user-agent");
  const body = await request.text();

  try {
    const res = await fetch(`${BACKEND_URL}/users/me/liveness-telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
        ...(userAgent && { "user-agent": userAgent }),
      },
      body,
    });

    const data = await res.json().catch(() => null);
    return Response.json(data ?? { success: res.ok }, { status: res.status });
  } catch {
    return Response.json(
      { error: true, message: "Falha ao registrar telemetria", codigo: 502 },
      { status: 502 },
    );
  }
}
