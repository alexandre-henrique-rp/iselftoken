import { useEffect, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "~/lib/api-config";
import { useUser } from "./use-user";

/**
 * Hook ÚNICO de conexão realtime (socket.io, namespace `/notifications`).
 *
 * ## Por que existe
 * Antes havia DOIS singletons de socket desalinhados
 * (`use-notifications-socket` e `use-payment-confirmed`), cada um com seu
 * próprio `Map`. Na prática isso abria DUAS conexões WS por usuário,
 * estourando o `MAX_CONNECTIONS_PER_USER` do backend em reconexões e
 * causando corridas que derrubavam o socket de notificações.
 *
 * Este hook consolida tudo em UMA conexão por `userId` (um único `Map`
 * global com ref-count). Todos os conectores (notificações, pagamento,
 * KYC, transações, perfil) se inscrevem via `subscribe(event, handler)`.
 *
 * ## Reconciliação robusta (sem reload)
 * O manager reconcilia os caches "realtime" em três gatilhos:
 *  - `connect`/reconnect do socket (pushes perdidos enquanto offline);
 *  - `window.focus` (voltar para a aba);
 *  - `document.visibilitychange` → visible (aba volta a ficar visível).
 * Um debounce leve evita refetch duplicado quando focus+visibility
 * disparam juntos.
 *
 * ## Transport/config
 * `transports: ['polling', 'websocket']` — ALINHADO ao backend
 * (`socket-io.adapter.ts`). Long-poll primeiro garante conexão atrás de
 * qualquer proxy que bloqueie o header `Upgrade`; o upgrade para `ws`
 * acontece em seguida quando possível. Isso evita a latência inicial de
 * tentar `ws` e cair para polling (o que acontecia com a ordem invertida).
 *
 * URL: `VITE_WS_URL` (produção atrás de proxy/CDN) com fallback para
 * `BACKEND_URL` (dev). Cookie HTTP-only `session_id` viaja via
 * `withCredentials: true`.
 *
 * Ver `docs/superpowers/specs/2026-09-26-notifications-websocket-design.md`.
 */

type EventHandler = (payload: unknown) => void;

type RealtimeManager = {
  socket: Socket;
  count: number;
  /** Handlers registrados por evento (multiplos subscribers por evento). */
  handlers: Map<string, Set<EventHandler>>;
  /** Cleanup dos listeners de janela (focus/visibility). */
  teardownWindow: (() => void) | null;
  /** Timer de debounce da reconciliação. */
  reconcileTimer: ReturnType<typeof setTimeout> | null;
};

const managers = new Map<number, RealtimeManager>();

/**
 * Query keys que devem ser revalidadas em cada gatilho de reconciliação.
 * Centralizado aqui para que connect/focus/visibilitychange reconciliem
 * exatamente o mesmo conjunto. Mantido como prefixos — o TanStack Query
 * invalida por prefixo (partial match).
 */
export const REALTIME_RECONCILE_KEYS: readonly (readonly unknown[])[] = [
  ["notifications-unread-count"],
  ["notifications"],
  ["me"],
  ["wallet"],
  ["transactions"],
  ["admin-financeiro-transactions"],
];

const RECONCILE_DEBOUNCE_MS = 150;

function resolveWsUrl(): string {
  const base =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: Record<string, string | undefined> }).env
        ?.VITE_WS_URL) ||
    BACKEND_URL;
  return `${base}/notifications`;
}

/**
 * Revalida (invalidateQueries) todas as REALTIME_RECONCILE_KEYS. Com
 * debounce para coalescer focus + visibilitychange que disparam juntos.
 */
function scheduleReconcile(
  manager: RealtimeManager,
  queryClient: QueryClient,
): void {
  if (manager.reconcileTimer) {
    clearTimeout(manager.reconcileTimer);
  }
  manager.reconcileTimer = setTimeout(() => {
    manager.reconcileTimer = null;
    for (const queryKey of REALTIME_RECONCILE_KEYS) {
      queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
    }
  }, RECONCILE_DEBOUNCE_MS);
}

function createManager(
  userId: number,
  queryClient: QueryClient,
): RealtimeManager {
  const socket = io(resolveWsUrl(), {
    withCredentials: true,
    // Alinhado ao backend (polling → upgrade ws). Ver docstring.
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  const manager: RealtimeManager = {
    socket,
    count: 0,
    handlers: new Map(),
    teardownWindow: null,
    reconcileTimer: null,
  };

  // Reconciliação ao (re)conectar: pushes podem ter acontecido enquanto
  // o socket estava offline (socket.io não faz replay).
  socket.on("connect", () => {
    scheduleReconcile(manager, queryClient);
  });

  // Listeners de janela: reconciliam ao voltar o foco/visibilidade.
  // Resolvem o "precisa dar reload" quando a aba fica em background e o
  // socket é suspenso pelo browser sem disparar reconnect imediato.
  if (typeof window !== "undefined") {
    const onFocus = () => scheduleReconcile(manager, queryClient);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleReconcile(manager, queryClient);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    manager.teardownWindow = () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }

  managers.set(userId, manager);
  return manager;
}

function destroyManager(userId: number): void {
  const manager = managers.get(userId);
  if (!manager) return;
  if (manager.reconcileTimer) clearTimeout(manager.reconcileTimer);
  manager.teardownWindow?.();
  manager.socket.disconnect();
  managers.delete(userId);
}

export interface RealtimeConnection {
  /** `true` quando o socket está conectado. */
  connected: boolean;
  /**
   * Registra um handler para um evento WS. Retorna uma função de cleanup
   * (unsubscribe). Múltiplos subscribers do mesmo evento compartilham o
   * MESMO socket; o listener real no socket é registrado uma única vez por
   * evento e faz fan-out para todos os handlers.
   */
  subscribe: (event: string, handler: EventHandler) => () => void;
}

/**
 * Testabilidade: expõe o Map de managers para asserts em testes unitários.
 * Não use em código de produção.
 */
export function __getRealtimeManagers(): Map<number, RealtimeManager> {
  return managers;
}

export function useRealtimeConnection(): RealtimeConnection {
  const { user, isAuthorized } = useUser();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const subscribedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthorized) return;
    const userId = user?.id;
    if (userId == null) return;

    let manager = managers.get(userId);
    if (!manager) {
      manager = createManager(userId, queryClient);
    }
    manager.count += 1;
    setConnected(manager.socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = () => setConnected(false);
    manager.socket.on("connect", onConnect);
    manager.socket.on("disconnect", onDisconnect);
    manager.socket.on("connect_error", onConnectError);

    const capturedSubscribed = subscribedRef.current;

    return () => {
      const current = managers.get(userId);
      if (!current) return;
      current.socket.off("connect", onConnect);
      current.socket.off("disconnect", onDisconnect);
      current.socket.off("connect_error", onConnectError);
      capturedSubscribed.clear();
      current.count -= 1;
      if (current.count <= 0) {
        destroyManager(userId);
      }
      setConnected(false);
    };
  }, [isAuthorized, user?.id, queryClient]);

  const subscribe: RealtimeConnection["subscribe"] = (event, handler) => {
    const userId = user?.id;
    if (userId == null) return () => undefined;
    const manager = managers.get(userId);
    if (!manager) return () => undefined;

    let set = manager.handlers.get(event);
    if (!set) {
      set = new Set<EventHandler>();
      manager.handlers.set(event, set);
      // Registra UM listener real no socket por evento; faz fan-out para
      // todos os handlers inscritos.
      manager.socket.on(event, (payload: unknown) => {
        const current = managers.get(userId);
        current?.handlers.get(event)?.forEach((h) => {
          try {
            h(payload);
          } catch {
            // Handler nunca derruba o fan-out dos demais.
          }
        });
      });
    }
    set.add(handler);

    return () => {
      const current = managers.get(userId);
      current?.handlers.get(event)?.delete(handler);
    };
  };

  return { connected, subscribe };
}
