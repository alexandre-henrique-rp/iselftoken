/**
 * Testes do hook `useStartupDetailQuery` (STATE-02E).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStartupDetailQuery } from "./use-startup-detail";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockStartup = {
  id: 7,
  name: "Acme",
  logo: "https://x/logo.png",
  description: "Lider",
  category: "Tech",
  stage: "Seed",
  metrics: {
    valuation: "R$ 1M",
    tokenPrice: "R$ 100",
    tokensAvailable: "500",
    investors: "10",
  },
  campaign: {
    raised: "R$ 50k",
    goal: "R$ 200k",
    percentage: 25,
    equity: "5%",
    minInvestment: "R$ 100",
    remainingDays: 30,
  },
  investment: null,
};

describe("useStartupDetailQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/startup/:id retorna dados tipados", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStartup,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStartupDetailQuery("7"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/startup/7");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
    expect(result.current.data?.name).toBe("Acme");
  });

  it("joga erro com mensagem legível quando 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: "Não encontrada" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStartupDetailQuery("999"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain("404");
  });

  it("não dispara fetch quando id é vazio", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStartupDetailQuery(""), {
      wrapper: makeWrapper(),
    });

    // Sem fetch — enabled:false
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
  });
});
