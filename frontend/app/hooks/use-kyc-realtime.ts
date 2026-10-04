import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { meQueryOptions } from "~/lib/queries";
import { useRealtimeConnection } from "./use-realtime-connection";

interface KycDecidedPayload {
  decision: string;
  kycStatus: string;
}

/**
 * Conector de KYC realtime.
 *
 * Consome o socket ÚNICO (`useRealtimeConnection`) e se inscreve em
 * `kyc.decided` (relayado pelo backend quando o admin/compliance decide o
 * KYC do usuário — ver `NotificationsGateway.onKycDecided`).
 *
 * Comportamento:
 *  - `kyc.decided` → refetch imediato de `[me]` (o perfil do usuário
 *    carrega `documento.status`/`avatar.status`; o backend já sincronizou
 *    a sessão Redis antes de emitir) + invalida queries de KYC.
 *
 * Resultado: o painel do usuário reflete a aprovação/rejeição de KYC em
 * tempo real, sem exigir reload (resolve o problema original).
 *
 * Não cria conexão própria — reusa o singleton por userId.
 */
export function useKycRealtime(): void {
  const { connected, subscribe } = useRealtimeConnection();
  const queryClient = useQueryClient();

  useEffect(() => {
    const off = subscribe("kyc.decided", (_payload: unknown) => {
      const _p = _payload as KycDecidedPayload;
      void _p;
      // Perfil (/users/me) carrega o status de KYC — força refetch.
      void queryClient.refetchQueries({ queryKey: meQueryOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey });
      // Queries de KYC (admin/compliance e do próprio usuário).
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, queryClient]);
}
