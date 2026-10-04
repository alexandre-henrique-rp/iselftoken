/**
 * Testes para `useComplianceStartupDetailQuery` (STATE-02C).
 * Cobre: sucesso, enabled gate (id inválido), erro, queryKey parametrizado.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useComplianceStartupDetailQuery } from "~/hooks/use-compliance-startup-detail";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useComplianceStartupDetailQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna startup detail com campanhas e fundador em sucesso", async () => {
    const payload = {
      data: {
        id: 7,
        nome: "Acme",
        status: "PENDING_CURATOR_REVIEW",
        cnpj: "00.000.000/0001-00",
        campaigns: [{ id: 1, title: "Rodada 1", status: "OPEN", totalTokens: 1000, tokensSold: 100, targetAmount: 50000, investments: [] }],
        founder: { id: 2, nome: "Bob", email: "bob@x.com" },
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useComplianceStartupDetailQuery(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.nome).toBe("Acme");
    expect(result.current.data?.campaigns).toHaveLength(1);
    expect(result.current.data?.founder?.email).toBe("bob@x.com");
  });

  it("chama endpoint correto com credentials include", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 7 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useComplianceStartupDetailQuery(42), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/admin/compliance/startup/42");
    expect(call[1]).toEqual(expect.objectContaining({ credentials: "include" }));
  });

  it("não faz fetch quando id <= 0 (enabled gate)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useComplianceStartupDetailQuery(0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("não faz fetch quando id é undefined", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useComplianceStartupDetailQuery(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lança Error com mensagem do backend em falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: true, message: "Startup inexistente" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useComplianceStartupDetailQuery(99), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Startup inexistente");
  });

  it("aceita id como string e converte para number", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 7 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useComplianceStartupDetailQuery("7"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/compliance/startup/7");
  });
});