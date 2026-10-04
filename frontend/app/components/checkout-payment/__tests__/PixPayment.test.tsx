/**
 * Testes do `PixPayment` — STATE-02A.
 *
 * Foco: polling adaptativo via `refetchInterval` do TanStack Query.
 *  - Status terminal (PAID/CANCELED/REFUNDED) → polling desligado
 *  - Status pendente → polling continua a cada 4s
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { paymentStatusQueryOptions } from "~/lib/queries";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("paymentStatusQueryOptions — polling adaptativo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("refetchInterval retorna 4000 quando status é PENDING", () => {
    const opts = paymentStatusQueryOptions(123);
    const result = opts.refetchInterval({
      state: { data: { id: 123, status: "PENDING", amount: 100 } },
    } as Parameters<typeof opts.refetchInterval>[0]);
    expect(result).toBe(4000);
  });

  it("refetchInterval retorna false quando status é PAID", () => {
    const opts = paymentStatusQueryOptions(123);
    const result = opts.refetchInterval({
      state: { data: { id: 123, status: "PAID", amount: 100 } },
    } as Parameters<typeof opts.refetchInterval>[0]);
    expect(result).toBe(false);
  });

  it("refetchInterval retorna false quando status é CANCELED", () => {
    const opts = paymentStatusQueryOptions(123);
    const result = opts.refetchInterval({
      state: { data: { id: 123, status: "CANCELED", amount: 100 } },
    } as Parameters<typeof opts.refetchInterval>[0]);
    expect(result).toBe(false);
  });

  it("refetchInterval retorna false quando status é REFUNDED", () => {
    const opts = paymentStatusQueryOptions(123);
    const result = opts.refetchInterval({
      state: { data: { id: 123, status: "REFUNDED", amount: 100 } },
    } as Parameters<typeof opts.refetchInterval>[0]);
    expect(result).toBe(false);
  });

  it("useQuery carrega status do endpoint /api/payment/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 7, status: "PENDING", amount: 250 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    function usePaymentStatus() {
      return useQuery(paymentStatusQueryOptions(7));
    }

    const { result } = renderHook(() => usePaymentStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payment/7",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result.current.data?.status).toBe("PENDING");
  });
});