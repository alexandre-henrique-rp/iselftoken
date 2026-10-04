/**
 * Testes para `useStartupIdentityQuery` (STATE-02D).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStartupIdentityQuery } from "./use-startup-identity";
import { startupIdentityQueryOptions } from "~/lib/queries";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useStartupIdentityQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("queryKey inclui startupId e staleTime = 5min", () => {
    const opts = startupIdentityQueryOptions(7);
    expect(opts.queryKey).toEqual(["startup-identity", 7]);
    expect(opts.staleTime).toBe(5 * 60_000);
  });

  it("não faz fetch quando startupId é null", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStartupIdentityQuery(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("extrai campos de identidade do payload", async () => {
    const payload = {
      data: {
        id: 7,
        nome: "FinFlow",
        nomeFantasia: "FinFlow",
        razaoSocial: "FinFlow Tecnologia S.A.",
        cnpj: "12.345.678/0001-90",
        anoFundacao: 2022,
        estagio: "tracao",
        areaAtuacao: "fintech",
        paisIso3: "BRA",
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
    );

    const { result } = renderHook(() => useStartupIdentityQuery(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.razaoSocial).toBe("FinFlow Tecnologia S.A.");
    expect(result.current.data?.cnpj).toBe("12.345.678/0001-90");
    expect(result.current.data?.paisIso3).toBe("BRA");
  });

  it("chama endpoint /api/startups/:id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: { id: 7 } }) });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useStartupIdentityQuery(42), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/startups/42");
  });

  it("lança Error em falha do backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Acesso negado" }),
      }),
    );

    const { result } = renderHook(() => useStartupIdentityQuery(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Acesso negado");
  });
});