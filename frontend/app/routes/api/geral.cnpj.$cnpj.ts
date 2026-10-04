import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";
import { getAlphanumeric } from "~/lib/cnpj-format";

/**
 * BFF: proxy para `GET /geral/cnpj/:cnpj` no backend NestJS.
 *
 * O backend consulta a BrasilAPI com cache Redis (24h) e tratamento de
 * rate limit. Este BFF apenas encaminha a requisição e propaga a resposta,
 * mantendo o contrato consumido pelo `<CorporateIdentity>`:
 * { cnpj, razaoSocial, nomeFantasia, cached? }.
 *
 * Suporta CNPJ numérico legado e alfanumérico novo (IN RFB 2.229/2024).
 */
export async function loader({ params, request }: LoaderFunctionArgs): Promise<Response> {
  const raw = params.cnpj;
  if (!raw) {
    return Response.json({ error: "missing_cnpj" }, { status: 400 });
  }

  const chars = getAlphanumeric(raw);
  if (chars.length !== 14) {
    return Response.json(
      { error: "invalid_cnpj", message: "CNPJ deve ter 14 caracteres alfanuméricos" },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/geral/cnpj/${chars}`, {
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
      },
    });
    const body = (await upstream.json()) as
      | { error: boolean; data?: unknown; detalhe?: { error?: string; message?: string }; message?: string }
      | Record<string, unknown>;

    // Backend NestJS embrulha em { error, message, codigo, data } via ResponseEntity.
    // Achatamos para o contrato consumido pelo <CorporateIdentity>:
    //   sucesso  → o objeto data direto;
    //   falha    → { error, message } com o status original do upstream.
    if (upstream.ok && body && typeof body === "object" && "data" in body) {
      return Response.json((body as { data: unknown }).data);
    }
    const detail =
      (body as { detalhe?: { error?: string; message?: string } }).detalhe ?? {};
    return Response.json(
      {
        error: detail.error ?? "upstream_error",
        message: detail.message ?? (body as { message?: string }).message ?? "Falha ao consultar CNPJ",
      },
      { status: upstream.status },
    );
  } catch {
    return Response.json(
      {
        error: "fetch_failed",
        message: "Não foi possível consultar o CNPJ no momento. Preencha manualmente.",
      },
      { status: 502 },
    );
  }
}
