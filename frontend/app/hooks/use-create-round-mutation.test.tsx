/**
 * Testes do hook `useCreateRoundMutation` (STATE-02E).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateRoundMutation } from "./use-create-round-mutation";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const validInput = {
  startupId: "42",
  title: "Rodada Seed 2026",
  targetAmount: 100000,
  minInvestment: 100,
  valuation: 1000000,
  tokenPrice: 10,
  totalTokens: 10000,
  deadline: "2026-12-31T23:59:59.000Z",
  affiliateCommissionPct: 5 as const,
  description: "Resumo",
};

describe("useCreateRoundMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/campaigns/:id/new-round com payload montado", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCreateRoundMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(validInput);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/campaigns/42/new-round");
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      title: "Rodada Seed 2026",
      targetAmount: 100000,
      minInvestment: 100,
      valuation: 1000000,
      tokenPrice: 10,
      totalTokens: 10000,
      affiliateCommissionPct: 5,
      description: "Resumo",
    });
    expect(body.deadline).toBe("2026-12-31T23:59:59.000Z");
  });

  it("joga erro do backend (message concatenada para array)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: ["campo A inválido", "campo B inválido"] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCreateRoundMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync(validInput);
      } catch {
        // esperado
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain("campo A");
    expect((result.current.error as Error).message).toContain("campo B");
  });

  it("joga erro genérico quando backend não retorna message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCreateRoundMutation(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync(validInput);
      } catch {
        // esperado
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(
      /Não foi possível abrir a rodada/,
    );
  });
});
