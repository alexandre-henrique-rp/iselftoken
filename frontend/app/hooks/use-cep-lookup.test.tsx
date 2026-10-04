/**
 * Testes para use-cep-lookup.ts — hook que consulta ViaCEP via BFF.
 *
 * Cenários:
 *  - Não dispara query com CEP inválido (≠ 8 dígitos)
 *  - Dispara query com 8 dígitos e retorna data normalizada
 *  - Erro do backend → throw no queryFn (useQuery converte)
 *  - Cache key inclui os 8 dígitos do CEP
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCepLookup } from "~/hooks/use-cep-lookup";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useCepLookup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não dispara query com CEP < 8 dígitos", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCepLookup("01310"), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dispara query com 8 dígitos e retorna logradouro/bairro/cidade/uf", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          cep: "01310-100",
          logradouro: "Avenida Paulista",
          bairro: "Bela Vista",
          cidade: "São Paulo",
          uf: "SP",
        }),
      }),
    );

    const { result } = renderHook(() => useCepLookup("01310-100"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      cep: "01310-100",
      logradouro: "Avenida Paulista",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
    });
  });

  it("ignora máscara — extrai apenas dígitos para a URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useCepLookup("01310-100"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/geral/cep/01310100");
  });

  it("lança erro quando backend retorna error=true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "not_found",
          message: "CEP não encontrado",
        }),
      }),
    );

    const { result } = renderHook(() => useCepLookup("99999999"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain("CEP");
  });
});
