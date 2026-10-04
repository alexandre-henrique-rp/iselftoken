import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import {
  adminStartupPaymentStatusQueryOptions,
  type PhaseGate,
} from "~/lib/queries";

interface CrownActionProps {
  startupId: number | string;
  startupName: string;
  onClick: () => void;
}

/**
 * CrownAction — botão "Coroar" para a ação "Coroar" do /admin/startups.
 *
 * Renderiza APENAS quando a startup tem a Fase 3 (Detalhes de Captação)
 * APROVADA. Reusa o `queryKey` de `adminStartupPaymentStatusQueryOptions`,
 * que já é consumido por `PhaseActions` — TanStack Query dedup e nenhuma
 * requisição HTTP extra é disparada por startup.
 *
 * Regra de segurança: a validação real acontece no backend
 * (`AdminService.incrementStartupScore`), que re-checa `phase 3 reviewStatus
 * APPROVED` e devolve 403 caso o gating do frontend seja bypassado.
 *
 * @see CASE.md §Curadoria Premium
 * @see admin-premium-seal-dialog.tsx (modal aberto por este botão)
 */
export function CrownAction({ startupId, startupName, onClick }: CrownActionProps) {
  const { data, isLoading } = useQuery(
    adminStartupPaymentStatusQueryOptions(startupId),
  );

  if (isLoading) {
    return (
      <span
        className="h-7 w-7 animate-pulse rounded-lg border border-white/10 bg-white/5"
        aria-hidden="true"
      />
    );
  }

  const phase3: PhaseGate | undefined = data?.phases?.[3];
  const phase3Approved = phase3?.reviewStatus === "APPROVED";
  if (!phase3Approved) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      title="Coroar — incrementar score e atribuir selos premium (pós-Fase 3)"
      aria-label={`Coroar ${startupName}`}
      data-testid="crown-action"
      className="rounded-lg p-2 text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      <Crown className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
