import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/** BFF autenticado para registrar uma indicação no detalhe da startup. */
export async function action({ request }: ActionFunctionArgs) {
  const cookie = request.headers.get("cookie") ?? "";
  const body = await request.text();

  try {
    const response = await fetch(`${BACKEND_URL}/affiliate/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body,
    });
    const json = await response.json().catch(() => null);
    return Response.json(json ?? {}, { status: response.status });
  } catch {
    return Response.json(
      { error: true, message: "Serviço de afiliados indisponível" },
      { status: 502 },
    );
  }
}
