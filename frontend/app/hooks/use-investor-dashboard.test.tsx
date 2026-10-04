/**
 * Testes do hook `useInvestorDashboardQuery` (STATE-02E).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useInvestorDashboardQuery } from "./use-investor-dashboard";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockData = {
  total: 2,
  investments: [
    {
      id: 1,
      campaignTitle: "Acme",
      amount: 1000,
      tokensQty: 10,
      status: "CONFIRMED" as const,
      paymentStatus: "PAID",
      createdAt: "2026-01-01",
      currentValue: 1100,
    },
    {
      id: 2,
      campaignTitle: "Beta",
      amount: 500,
      tokensQty: 5,
      status: "PENDING" as const,
      paymentStatus: "PENDING",
      createdAt: "2026-01-02",
      currentValue: null,
    },
  ],
};

describe("useInvestorDashboardQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/investments retorna data + contas calculadas manualmente", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockData }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInvestorDashboardQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/investments");
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.investments).toHaveLength(2);
  });

  it("retorna shape vazio quando backend responde 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInvestorDashboardQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ total: 0, investments: [] });
  });
});
