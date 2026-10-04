import { renderHook } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useNotificationsSocket } from "./use-notifications-socket";
import { useRealtimeConnection } from "./use-realtime-connection";
import {
  notificationsUnreadCountQueryOptions,
  queryKeys,
} from "~/lib/queries";

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

describe("useNotificationsSocket", () => {
  let bus: ReturnType<typeof buildRealtimeBus>;

  beforeEach(() => {
    vi.clearAllMocks();
    bus = buildRealtimeBus();
    mockUseRealtime.mockReturnValue({
      connected: true,
      subscribe: bus.subscribe,
    });
  });

  it("inscreve no evento notification", () => {
    const { wrapper } = buildWrapper();
    renderHook(() => useNotificationsSocket(), { wrapper });
    const events = bus.subscribe.mock.calls.map(([e]) => e);
    expect(events).toContain("notification");
  });

  it("retorna connected do socket único", () => {
    const { wrapper } = buildWrapper();
    const { result } = renderHook(() => useNotificationsSocket(), { wrapper });
    expect(result.current.connected).toBe(true);
  });

  it("notification → incrementa o badge otimisticamente (sem refetch)", () => {
    const { wrapper, queryClient } = buildWrapper();
    queryClient.setQueryData(
      notificationsUnreadCountQueryOptions.queryKey,
      3,
    );
    renderHook(() => useNotificationsSocket(), { wrapper });

    bus.fire("notification", { id: 10, title: "Nova" });

    expect(
      queryClient.getQueryData(
        notificationsUnreadCountQueryOptions.queryKey,
      ),
    ).toBe(4);
  });

  it("notification → invalida a lista de notificações", () => {
    const { wrapper, queryClient } = buildWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => useNotificationsSocket(), { wrapper });

    bus.fire("notification", { id: 11 });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.all,
    });
  });

  it("notification → prepend otimista na primeira página se cacheada", () => {
    const { wrapper, queryClient } = buildWrapper();
    queryClient.setQueryData(["notifications", "all", 1], {
      items: [{ id: 1 }],
      totalPages: 1,
    });
    renderHook(() => useNotificationsSocket(), { wrapper });

    bus.fire("notification", { id: 99 });

    const page = queryClient.getQueryData(["notifications", "all", 1]) as {
      items: Array<{ id: number }>;
    };
    expect(page.items[0]).toEqual({ id: 99 });
    expect(page.items).toHaveLength(2);
  });
});
