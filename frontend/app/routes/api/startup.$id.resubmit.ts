import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/** BFF: fundador reenvia uma startup rejeitada para nova análise. */
export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json(
      { error: true, message: "Método não permitido" },
      { status: 405 },
    );
  }

  const { id } = params;
  if (!id || !/^\d+$/.test(id)) {
    return Response.json(
      { error: true, message: "ID da startup inválido" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");

  try {
    const response = await fetch(`${BACKEND_URL}/startup/${id}/resubmit`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    });
    const body = await response.json().catch(() => ({ error: true }));

    return Response.json({
      ...body,
      ...(response.ok
        ? {}
        : {
            error: true,
            codigo: response.status,
          }),
    });
  } catch {
    return Response.json({
      error: true,
      codigo: 502,
      message: "Serviço de startups indisponível.",
    });
  }
}
