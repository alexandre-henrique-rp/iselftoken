import type { UserData } from "~/types/auth";

// IDs dos planos (mesma convenção do sidebar): 1 = AFILIADO, 2 = INVESTIDOR, 3 = FUNDADOR.
export const AFFILIATE_PLAN_ID = 1;
export const INVESTOR_PLAN_ID = 2;
export const FOUNDER_PLAN_ID = 3;

export const AFFILIATE_PLAN_SLUG = "plano-afiliado";

export function activePlanIds(user: UserData | null | undefined): number[] {
  return (user?.subscriptions ?? [])
    .filter((s) => s.status === "ACTIVE")
    .map((s) => s.planId);
}

/**
 * Verdadeiro quando o usuário é exclusivamente AFILIADO: plano AFILIADO ativo e
 * SEM plano investidor/fundador ativo (e não é perfil interno). O afiliado faz
 * KYC no cadastro, mas ele só é exigido no primeiro crédito de comissão — este
 * helper serve para adaptar mensagens ao contexto do afiliado.
 */
export function isAfiliado(user: UserData | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "FINANCEIRO" || user.role === "COMPLIANCE") {
    return false;
  }
  const ids = activePlanIds(user);
  return (
    ids.includes(AFFILIATE_PLAN_ID) &&
    !ids.includes(INVESTOR_PLAN_ID) &&
    !ids.includes(FOUNDER_PLAN_ID)
  );
}
