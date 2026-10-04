import { renderHook, act } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  useRealtimeConnection,
  __getRealtimeManagers,
  REALTIME_RECONCILE_KEYS,
} from "./use-realtime-connection";
import { useUser } from "./use-user";
import { io } from "socket.io-client";

vi.mock("./use-user");
vi.mock("socket.io-client", () => ({ io: vi.fn() }));
vi.mock("~/lib/api-config", () => ({ BACKEND_URL: "http://localhost:7077" }));

const mockUseUser = useUser as unknown as ReturnType<typeof vi.fn>;
const mockIo = io as unknown as ReturnType<typeof vi.fn>;

type MockFn = ReturnType<typeof vi.fn>;

interface MockSocket {
  on: MockFn;
  off: MockFn;
  disconnect: MockFn;
  emit: MockFn;
  connected: boolean;
  id: string;
  __fire: (event: string, payload?: unknown) => void;
}

function buildSocket(): MockSocket {
  const handlers: Record<string, Array<(...a: unknown[]) => void>> = {};
  const socket = {
    id: "mock",
    connected: false,
    on: vi.fn((event: string, handler: (...a: unknown[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...a: unknown[]) => void) => {
      handlers[event] = (handlers[event] ?? []).filter((h) => h !== handler);
    }),
    disconnect: vi.fn(),
    emit: vi.fn(),
    __fire: (event: string, payload?: unknown) => {
      (handlers[event] ?? []).forEach((h) => h(payload));
    },
  };
  return socket as unknown as MockSocket;
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

function mockAuthorizedUser(id = 42) {
  mockUseUser.mockReturnValue({
    user: { id, nome: "Test", role: "USER" },
    isLoading: false,
    isAuthorized: true,
    isAuthenticated: true,
    error: null,
  });
}

describe("useRealtimeConnection", () => {
  let socket: MockSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    socket = buildSocket();
    mockIo.mockReturnValue(socket as unknown as ReturnType<typeof io>);
    mockAuthorizedUser();
    __getRealtimeManagers().clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("não conecta quando usuário não autorizado", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthorized: false,
      isAuthenticated: false,
      error: null,
    });
    const { wrapper } = buildWrapper();
    renderHook(() => useRealtimeConnection(), { wrapper });
    expect(mockIo).not.toHaveBeenCalled();
  });

  it("abre UMA conexão no namespace /notifications com transports alinhados", () => {
    const { wrapper } = buildWrapper();
    renderHook(() => useRealtimeConnection(), { wrapper });
    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(mockIo).toHaveBeenCalledWith(
      "http://localhost:7077/notifications",
      expect.objectContaining({
        withCredentials: true,
        transports: ["polling", "websocket"],
      }),
    );
  });

  it("múltiplos hooks do mesmo userId compartilham UM socket (ref-count)", () => {
    const { wrapper } = buildWrapper();
    renderHook(() => useRealtimeConnection(), { wrapper });
    renderHook(() => useRealtimeConnection(), { wrapper });
    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(__getRealtimeManagers().get(42)?.count).toBe(2);
  });

  it("só desconecta o socket quando o último consumidor desmonta", () => {
    const { wrapper } = buildWrapper();
    const a = renderHook(() => useRealtimeConnection(), { wrapper });
    const b = renderHook(() => useRealtimeConnection(), { wrapper });

    a.unmount();
    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(__getRealtimeManagers().has(42)).toBe(true);

    b.unmount();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(__getRealtimeManagers().has(42)).toBe(false);
  });

  it("subscribe compartilha um único listener por evento e faz fan-out", () => {
    const { wrapper } = buildWrapper();
    const { result } = renderHook(() => useRealtimeConnection(), { wrapper });

    const h1 = vi.fn();
    const h2 = vi.fn();
    act(() => {
      result.current.subscribe("notification", h1);
      result.current.subscribe("notification", h2);
    });

    // Um único listener real registrado no socket para 'notification'
    const notifListeners = (socket.on as MockFn).mock.calls.filter(
      ([e]) => e === "notification",
    );
    expect(notifListeners).toHaveLength(1);

    act(() => socket.__fire("notification", { id: 1 }));
    expect(h1).toHaveBeenCalledWith({ id: 1 });
    expect(h2).toHaveBeenCalledWith({ id: 1 });
  });

  it("unsubscribe remove apenas o handler alvo", () => {
    const { wrapper } = buildWrapper();
    const { result } = renderHook(() => useRealtimeConnection(), { wrapper });

    const h1 = vi.fn();
    const h2 = vi.fn();
    let off1!: () => void;
    act(() => {
      off1 = result.current.subscribe("kyc.decided", h1);
      result.current.subscribe("kyc.decided", h2);
    });
    act(() => off1());
    act(() => socket.__fire("kyc.decided", { decision: "APPROVED" }));
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledWith({ decision: "APPROVED" });
  });

  it("reconcilia caches realtime ao conectar (connect)", () => {
    const { wrapper, queryClient } = buildWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => useRealtimeConnection(), { wrapper });

    act(() => socket.__fire("connect"));
    act(() => vi.advanceTimersByTime(200));

    for (const key of REALTIME_RECONCILE_KEYS) {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: key as unknown[],
      });
    }
  });

  it("reconcilia ao focar a janela (window focus)", () => {
    const { wrapper, queryClient } = buildWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => useRealtimeConnection(), { wrapper });

    act(() => window.dispatchEvent(new Event("focus")));
    act(() => vi.advanceTimersByTime(200));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["me"],
    });
  });

  it("reconcilia ao voltar visível (visibilitychange)", () => {
    const { wrapper, queryClient } = buildWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => useRealtimeConnection(), { wrapper });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(200));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["notifications-unread-count"],
    });
  });

  it("debounce coalesce focus + visibilitychange em uma rodada", () => {
    const { wrapper, queryClient } = buildWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => useRealtimeConnection(), { wrapper });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => vi.advanceTimersByTime(200));

    // Deve invalidar cada key exatamente 1x (coalescido), não 2x.
    const meCalls = invalidateSpy.mock.calls.filter(
      ([arg]) => JSON.stringify((arg as { queryKey: unknown }).queryKey) ===
        JSON.stringify(["me"]),
    );
    expect(meCalls).toHaveLength(1);
  });
});
