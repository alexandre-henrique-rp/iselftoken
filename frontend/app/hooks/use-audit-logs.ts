import { useQuery } from "@tanstack/react-query";
import type { AuditLogEntry } from "~/lib/audit-types";
import { queryKeys } from "~/lib/queries";

async function fetchAuditLogs(params: {
  entity: string;
  entityId: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const qs = new URLSearchParams({
    entity: params.entity,
    entityId: params.entityId,
    ...(params.limit && { limit: String(params.limit) }),
  });
  const res = await fetch(`/api/admin/audit-logs?${qs}`);
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  return (json?.data ?? []) as AuditLogEntry[];
}

/**
 * Hook para buscar AuditLogs de uma entidade (Startup ou Campaign).
 * Cache automático via TanStack Query (staleTime 60s).
 */
export function useAuditLogsQuery(
  entity: string | undefined,
  entityId: string | number | undefined,
  limit = 50,
) {
  return useQuery({
    queryKey: queryKeys.auditLogs(entity as string, entityId as string | number, limit),
    queryFn: () =>
      fetchAuditLogs({ entity: entity!, entityId: String(entityId!), limit }),
    enabled: Boolean(entity && entityId),
    staleTime: 60_000,
  });
}
