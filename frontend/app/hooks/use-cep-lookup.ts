import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

/**
 * Hook: useCepLookup
 *
 * Consulta ViaCEP via BFF `/api/geral/cep/:cep` e retorna os campos
 * de endereço normalizados. Apenas dispara quando o CEP tem exatamente
 * 8 dígitos (sem máscara).
 *
 * @returns useQuery com:
 *   data: { cep, logradouro, bairro, cidade, uf } | undefined
 *   isLoading, isError, error
 */
export interface CepLookupResult {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

async function fetchCep(digits: string): Promise<CepLookupResult | null> {
  const res = await fetch(`/api/geral/cep/${digits}`, {
    credentials: "include",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (body as { message?: string })?.message ?? "Falha ao consultar CEP.",
    );
  }
  if (!body || (body as { error?: string }).error) {
    throw new Error(
      (body as { message?: string })?.message ?? "CEP não encontrado.",
    );
  }
  return body as CepLookupResult;
}

/**
 * Consulta imperativa de CEP (fora do ciclo do React Query) — usada por
 * componentes que preenchem campos de endereço no evento de blur/change do
 * input, sem depender do estado reativo de `useCepLookup`.
 *
 * @param cepRaw CEP com ou sem máscara. Deve conter 8 dígitos.
 * @throws Error com mensagem clara em caso de CEP inválido/não encontrado.
 */
export async function fetchCepLookup(
  cepRaw: string,
): Promise<CepLookupResult | null> {
  const digits = cepRaw.replace(/\D/g, "");
  if (digits.length !== 8) {
    throw new Error("O CEP deve ter 8 dígitos.");
  }
  return fetchCep(digits);
}

export function useCepLookup(cepRaw: string) {
  const digits = cepRaw.replace(/\D/g, "");
  return useQuery<CepLookupResult | null, Error>({
    queryKey: queryKeys.geral.cep(digits),
    queryFn: () => fetchCep(digits),
    enabled: digits.length === 8,
    staleTime: 1000 * 60 * 60 * 24, // 24h — CEP raramente muda
    retry: false,
  });
}
