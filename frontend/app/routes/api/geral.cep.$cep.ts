import type { LoaderFunctionArgs } from "react-router";

/**
 * BFF: proxy para ViaCEP (`https://viacep.com.br/ws/:cep/json`).
 *
 * Não passa pelo backend NestJS — ViaCEP é público e não tem auth/cache.
 * Apenas normaliza o shape para o cliente:
 *   sucesso → { cep, logradouro, bairro, cidade, uf, erro? }
 *   erro    → { error, message }
 *
 * O endpoint é público (sem auth), mas o loader roda no servidor e não
 * vaza o `User-Agent` do browser. O frontend consome via fetch("/api/geral/cep/:cep").
 */
export async function loader({ params }: LoaderFunctionArgs): Promise<Response> {
  const raw = params.cep;
  if (!raw) {
    return Response.json({ error: "missing_cep" }, { status: 400 });
  }

  // ViaCEP aceita apenas 8 dígitos (sem máscara).
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) {
    return Response.json(
      {
        error: "invalid_cep",
        message: "CEP deve ter 8 dígitos.",
      },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      headers: { Accept: "application/json" },
    });
    const body = (await upstream.json()) as {
      cep?: string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      erro?: boolean;
    };

    if (!upstream.ok || body?.erro) {
      return Response.json(
        {
          error: "not_found",
          message: "CEP não encontrado. Preencha o endereço manualmente.",
        },
        { status: 404 },
      );
    }

    return Response.json({
      cep: body.cep ?? digits,
      logradouro: body.logradouro ?? "",
      bairro: body.bairro ?? "",
      cidade: body.localidade ?? "",
      uf: body.uf ?? "",
    });
  } catch {
    return Response.json(
      {
        error: "fetch_failed",
        message:
          "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
      },
      { status: 502 },
    );
  }
}
