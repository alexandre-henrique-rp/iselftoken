import type { AuthResponse } from "~/types/auth";

/**
 * Roles administrativas que devem aterrissar em `/admin/dashboard` após login
 * (compartilham o dashboard executivo com KPIs + split financeiro).
 *
 * Mantemos USER (default) aterrissando em `/home` (marketing/dashboard founder).
 */
const ADMIN_LANDING_ROLES = ["ADMIN", "FINANCEIRO", "COMPLIANCE"] as const;

/**
 * Resolve o caminho inicial (após login / 2FA / loader) para um usuário
 * autenticado. Função pura — fácil de testar.
 *
 * @param role - role do usuário logado
 * @returns path absoluto a ser usado em `redirect()` ou `navigate()`
 */
export function landingPathForRole(
  role: AuthResponse["role"] | string,
): string {
  if ((ADMIN_LANDING_ROLES as readonly string[]).includes(role)) {
    return "/admin/dashboard";
  }
  return "/home";
}

/**
 * Helper de compatibilidade: recebe o payload do `/api/auth` (login/2FA) e
 * decide para onde redirecionar.
 *
 * Regra de precedência:
 *  1. `requiresVerification` → `/2fa` (força o passo de 2FA antes de qualquer landing)
 *  2. ADMIN/FINANCEIRO/COMPLIANCE → `/admin/dashboard` (single source of truth
 *     para esses 3 papéis — o dashboard executivo mostra KPIs de plataforma
 *     + split financeiro, que são as métricas de interesse compartilhado)
 *  3. USER (e fallback) → `/home` (dashboard do founder/investidor)
 */
export function postAuthRedirect(
  result: Pick<AuthResponse, "role" | "requiresVerification">,
): string {
  if (result.requiresVerification) return "/2fa";
  return landingPathForRole(result.role);
}
