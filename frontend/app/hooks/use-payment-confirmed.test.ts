import { renderHook } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { usePaymentConfirmedSocket } from "./use-payment-confirmed";
import { useRealtimeConnection } from "./use-realtime-connection";
import { meQueryOptions } from "~/lib/queries";

vi.mock("./use-realtime-connection");

const mockUseRealtime = useRealtimeConnection as unknown as ReturnType<
  typeof vi.fn
>;

type Handler = (payload: unknown) => void;

/**
 * Barramento de subscribe fake: captura os handlers registrados por
 * evento para que o teste possa dispará-los manualmente.
 */
function buildRealtimeBus() {
  const handlers = new Map<string, Set<Handler>>();
  const subscribe = vi.fn((event: string, handler: Handler) => {
    const set = handlers.get(event) ?? new Set<Handler>();
    set.add(handler);
    handlers.set(event, set);
    return () => set.delete(handler);
  });
  const fire = (event: string, payload?: unknown) =>
    handlers.get(event)?.forEach((h) => h(payload));
  return { subscribe, fire, handlers };
}

function buildWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  }
  return { wrapper: Wrapper, queryClient };
}

describe("usePaymentConfirmedSocket", () => {
  let bus: ReturnType<typeof buildRealtimeBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    bus = buildRealtimeBus();
    mockUseRealtime.mockReturnValue({
      connected: true,
      subscribe: bus.subscribe,
    });
  });

  it("inscreve em payment.confirmed e payment.cancelled", () => {
    const { wrapper } = buildWrapper();
    renderHook(() => usePaymentConfirmedSocket(), { wrapper });
    const events = bus.subscribe.mock.calls.map(([e]) => e);
    expect(events).toContain("payment.confirmed");
    expect(events).toContain("payment.cancelled");
  });

  it("payment.confirmed → refetch + invalidate [me] e invalida transações", async () => {
    const { wrapper, queryClient } = buildWrapper();
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => usePaymentConfirmedSocket(), { wrapper });

    bus.fire("payment.confirmed", {
      paymentId: 1,
      purpose: "SUBSCRIPTION",
      subscriptionId: 99,
      investmentId: null,
    });
    await Promise.resolve();

    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: meQueryOptions.queryKey,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: meQueryOptions.queryKey,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["wallet"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin-financeiro-transactions"],
    });
  });

  it("payment.cancelled → invalida [me]", () => {
    const { wrapper, queryClient } = buildWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => usePaymentConfirmedSocket(), { wrapper });

    bus.fire("payment.cancelled", { paymentId: 1, purpose: "SUBSCRIPTION" });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: meQueryOptions.queryKey,
    });
  });
});
