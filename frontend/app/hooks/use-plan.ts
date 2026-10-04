import { useMemo } from "react";
import type { UserData } from "~/types/auth";

interface PlanData {
  id: number;
  planId: number;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  expiresAt: string;
  nome: string;
  slug: string;
  descricao: string;
  preco: string;
  periodoMeses: number;
  periodo: "Mensal" | "Trimestral" | "Anual";
  diasRestantes: number;
}

function derivePeriodo(
  raw: string | undefined,
  meses: number | undefined,
): PlanData["periodo"] {
  if (raw === "Mensal" || raw === "Trimestral" || raw === "Anual") return raw;
  if (meses === 12) return "Anual";
  if (meses === 3) return "Trimestral";
  return "Mensal";
}

export function usePlan(user: UserData | null) {
  return useMemo<{ plan: PlanData | null; plans: PlanData[] }>(() => {
    const active = user?.subscriptions?.filter((s) => s.status === "ACTIVE") ?? [];
    const plans = active
      .filter((subscription) => subscription.plan)
      .map((subscription) => {
        const plan = subscription.plan!;
        const expiresAt = new Date(subscription.expiresAt);
        const ms = expiresAt.getTime() - Date.now();
        const diasRestantes = Number.isFinite(ms)
          ? Math.ceil(ms / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: subscription.id,
          planId: subscription.planId,
          status: subscription.status,
          expiresAt: subscription.expiresAt,
          nome: plan.nome ?? "Plano Desconhecido",
          slug: plan.slug ?? "",
          descricao: plan.descricao ?? "Sem descrição",
          preco: String(plan.preco ?? "0"),
          periodoMeses: plan.periodoMeses ?? 1,
          periodo: derivePeriodo(plan.periodo, plan.periodoMeses),
          diasRestantes,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime(),
      );

    return { plan: plans[0] ?? null, plans };
  }, [user]);
}
