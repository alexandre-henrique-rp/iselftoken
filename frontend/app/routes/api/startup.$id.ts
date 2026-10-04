import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

/**
 * BFF proxy para o detalhe público da startup (`/startups/:id`).
 *
 * Chama `GET {backend}/marketplace/startup/:id`, que devolve o shape
 * `StartupDetailData` já montado a partir dos dados reais da startup + campanha.
 *
 * O backend envelopa a resposta em ResponseDto (`{ error, codigo, data }`) e
 * mantém HTTP 200 mesmo em "não encontrada" (codigo 404 no corpo). Aqui
 * desembrulhamos `.data` e traduzimos o erro para um status HTTP real, para o
 * loader da página cair no ErrorState corretamente.
 */
export async function loader({
  params,
}: LoaderFunctionArgs): Promise<Response> {
  const { id } = params;

  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ error: "Startup não encontrada" }, { status: 404 });
  }

  let json: any;
  try {
    const res = await fetch(`${BACKEND_URL}/marketplace/startup/${id}`);
    json = await res.json().catch(() => null);

    if (!res.ok) {
      return Response.json(
        { error: json?.message ?? "Startup não encontrada" },
        { status: res.status === 200 ? 502 : res.status },
      );
    }
  } catch {
    return Response.json({ error: "Serviço indisponível" }, { status: 502 });
  }

  // ResponseDto de erro chega com HTTP 200 mas `error: true` / `codigo != 200`.
  if (!json || json.error || (json.codigo && json.codigo >= 400)) {
    const status = json?.codigo && json.codigo >= 400 ? json.codigo : 404;
    return Response.json(
      { error: json?.message ?? "Startup não encontrada" },
      { status },
    );
  }

  return Response.json(json.data ?? json);
}

/**
 * BFF proxy para PATCH /startup/:id (atualizar startup).
 * Usado pela página de edição (branding, dados, etc.).
 */
export async function action({
  params,
  request,
}: ActionFunctionArgs): Promise<Response> {
  const { id } = params;

  if (!id) {
    return Response.json({ error: "ID não fornecido" }, { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie");
  const body = await request.json();

  const res = await fetch(`${BACKEND_URL}/startup/${id}`, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
