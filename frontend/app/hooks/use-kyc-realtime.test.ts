import { renderHook } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useKycRealtime } from "./use-kyc-realtime";
import { useRealtimeConnection } from "./use-realtime-connection";
import { meQueryOptions } from "~/lib/queries";

vi.mock("./use-realtime-connection");

const mockUseRealtime = useRealtimeConnection as unknown as ReturnType<
  typeof vi.fn
>;

type Handler = (payload: unknown) => void;

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
  return { subscribe, fire };
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

describe("useKycRealtime", () => {
  let bus: ReturnType<typeof buildRealtimeBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    bus = buildRealtimeBus();
    mockUseRealtime.mockReturnValue({
      connected: true,
      subscribe: bus.subscribe,
    });
  });

  it("inscreve no evento kyc.decided", () => {
    const { wrapper } = buildWrapper();
    renderHook(() => useKycRealtime(), { wrapper });
    const events = bus.subscribe.mock.calls.map(([e]) => e);
    expect(events).toContain("kyc.decided");
  });

  it("kyc.decided → refetch + invalidate [me] e invalida queries de KYC", async () => {
    const { wrapper, queryClient } = buildWrapper();
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => useKycRealtime(), { wrapper });

    bus.fire("kyc.decided", { decision: "APPROVED", kycStatus: "APPROVED" });
    await Promise.resolve();

    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: meQueryOptions.queryKey,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: meQueryOptions.queryKey,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["kyc"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["admin-kyc"] });
  });
});
