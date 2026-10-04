import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationsUnreadCountQueryOptions, queryKeys } from "~/lib/queries";
import { useRealtimeConnection } from "./use-realtime-connection";

/**
 * Conector de notificações realtime.
 *
 * Consome o socket ÚNICO (`useRealtimeConnection`) e se inscreve no evento
 * `notification`. Não cria conexão própria — o singleton por userId é
 * compartilhado com os demais conectores (pagamento, KYC, transações).
 *
 * Comportamento no evento `notification`:
 *  - incrementa o badge de não lidas de forma OTIMISTA (update direto no
 *    cache, sem round-trip HTTP) → badge atualiza instantaneamente;
 *  - invalida a lista de notificações (`queryKeys.notifications.all`) para
 *    o próximo reader hidratar;
 *  - adiciona o item otimisticamente na primeira página se já cacheada.
 *
 * A reconciliação pós-reconexão/foco (invalidação do unread-count) é feita
 * centralmente pelo `useRealtimeConnection` — aqui focamos só o push.
 *
 * API pública estável: retorna `{ connected }` (usado pelo `top-navbar`
 * para parar/retomar o polling do badge).
 *
 * Ver `docs/superpowers/specs/2026-09-26-notifications-websocket-design.md`.
 */
export function useNotificationsSocket() {
  const { connected, subscribe } = useRealtimeConnection();
  const queryClient = useQueryClient();

  useEffect(() => {
    const off = subscribe("notification", (payload: unknown) => {
      // Incremento otimista do badge (sem refetch HTTP).
      queryClient.setQueryData(
        notificationsUnreadCountQueryOptions.queryKey,
        (old: unknown) => {
          const current = typeof old === "number" ? old : 0;
          return current + 1;
        },
      );
      // Invalida a lista para o próximo reader.
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      // Adiciona otimisticamente na primeira página se estiver cacheada.
      queryClient.setQueryData(
        ["notifications", "all", 1],
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const o = old as { items?: unknown[]; totalPages?: number };
          const items = Array.isArray(o.items) ? o.items : [];
          return { ...o, items: [payload, ...items] };
        },
      );
    });
    return off;
    // `subscribe` é estável enquanto o userId não muda; incluímos
    // queryClient por lint. O connected muda não deve re-inscrever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, queryClient]);

  return { connected };
}
