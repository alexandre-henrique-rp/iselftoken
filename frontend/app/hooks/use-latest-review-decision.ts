import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";

/**
 * Tipo de uma decisão de auditoria sobre uma startup (admin aprovou/rejeitou).
 *
 * Espelha o model `StartupReviewDecision` do backend (Prisma). Quando
 * `decision='REJECTED'`, `rejectedSnapshot` contém os campos da startup
 * no momento da rejeição — usado pelo frontend para diff field-by-field
 * quando o founder atualizou o cadastro depois.
 */
export interface StartupReviewDecision {
  id: number;
  startupId: number;
  /** Fase do fluxo admin que originou a decisão (1, 2, 3 ou 0 = legado). */
  phase: number;
  /** 'APPROVED' | 'REJECTED' */
  decision: "APPROVED" | "REJECTED";
  justification: string | null;
  adminUserId: number | null;
  /** Desnormalizado para mostrar "Aprovado por X" mesmo se User for deletado. */
  adminName: string | null;
  adminEmail: string | null;
  /** Snapshot dos campos da startup no momento da rejeição (REJECTED only). */
  rejectedSnapshot: Record<string, unknown> | null;
  ip: string | null;
  /** ISO string. */
  createdAt: string;
}

/**
 * Hook: última decisão de auditoria para uma fase específica da startup.
 *
 * Endpoint: GET /api/admin/startups/:id/review-decisions?phase=N (BFF).
 *
 * Cache 30s. Mantém a UI sempre fresca quando o admin volta na página
 * depois de salvar uma nova decisão.
 *
 * @returns query com StartupReviewDecision | null (nunca decidida)
 */
export function useLatestReviewDecision(
  startupId: number | string | undefined | null,
  phase: number,
) {
  return useQuery<StartupReviewDecision | null>({
    queryKey: queryKeys.adminStartupReviewDecision(startupId, phase),
    queryFn: async () => {
      if (startupId == null) return null;
      const res = await fetch(
        `/api/admin/startups/${encodeURIComponent(String(startupId))}/review-decisions?phase=${phase}`,
        {
          credentials: "include",
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error === true) {
        // 404 ou rede ruim — não quebra a página, só não mostra info.
        return null;
      }
      // BFF desembrulha; pode ser `null` (nunca decidida) ou objeto.
      if (json == null || (typeof json === "object" && Object.keys(json).length === 0)) {
        return null;
      }
      return json as StartupReviewDecision;
    },
    enabled: Boolean(startupId),
    staleTime: 30 * 1_000,
  });
}

/**
 * Diff utilitário: dado um snapshot de rejeição e o estado atual, retorna
 * a lista de campos que MUDARAM. Usado para destacar visualmente no admin
 * que o founder atualizou o cadastro desde a rejeição.
 *
 * Compara apenas chaves escalares (string/number/boolean) — ignora null/undefined
 * no snapshot (significa que o campo nem existia na rejeição) e ignora
 * metadados (`_snapshotAt`).
 *
 * @returns Set<string> com os nomes dos campos alterados (em snake_case
 *          do schema Prisma, ex: 'nome', 'cnpj', 'problema').
 */
export function computeChangedFields(
  rejectedSnapshot: Record<string, unknown> | null | undefined,
  current: Record<string, unknown>,
): Set<string> {
  const changed = new Set<string>();
  if (!rejectedSnapshot) return changed;
  for (const key of Object.keys(rejectedSnapshot)) {
    if (key === "_snapshotAt") continue;
    const before = rejectedSnapshot[key];
    const now = current[key];
    // Normaliza null/undefined como "vazio" para comparação.
    const norm = (v: unknown) =>
      v == null || v === "" ? null : v;
    if (JSON.stringify(norm(before)) !== JSON.stringify(norm(now))) {
      changed.add(key);
    }
  }
  return changed;
}
