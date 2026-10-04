/**
 * Testes para `useTokenReserveMutation` (STATE-02D).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTokenReserveMutation } from "./use-token-reserve-mutation";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const baseInput = {
  campaignId: 42,
  startupName: "FinFlow",
  adjustedTargetAmount: 500000,
  estimatedTokenCount: 2500,
  tokenPrice: 200,
  tokenReservationFee: 10000,
  fastTrackFee: 500,
  wantsFastTrackReview: false,
  equityPercent: 10,
  equityAmount: 50000,
  campaignDurationDays: 90,
};

describe("useTokenReserveMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/payment/startup-checkout com credentials include", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ token: "opaque-token-xyz" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useTokenReserveMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/payment/startup-checkout");
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      campaignId: 42,
      startupName: "FinFlow",
    });
    expect(result.current.data?.token).toBe("opaque-token-xyz");
  });

  it("lança Error em falha sem token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: true, message: "Campanha inválida" }),
      }),
    );

    const { result } = renderHook(() => useTokenReserveMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Campanha inválida");
  });

  it("lança Error quando resposta não contém token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: false, message: "sem token" }),
      }),
    );

    const { result } = renderHook(() => useTokenReserveMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("checkout");
  });
});