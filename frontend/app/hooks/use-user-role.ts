import { useUser } from "./use-user";

export type UserRole = "USER" | "ADMIN" | "FINANCEIRO" | "COMPLIANCE";

/**
 * Hook de affordance visual: nunca substitui autorizacao server-side.
 * Toda operacao protegida deve ser revalidada pelo backend com AuthGuard e o
 * guard de dominio apropriado.
 *
 * @returns role do usuario ou null se nao autenticado
 * @example
 * const role = useUserRole();
 * if (role === 'COMPLIANCE') { ... }
 */
export function useUserRole(): UserRole | null {
  const { user } = useUser();
  return user?.role ?? null;
}

/**
 * Helper de affordance visual: nunca autoriza uma operacao no backend.
 * A permissao efetiva deve ser validada pelo endpoint protegido.
 *
 * @param allowedRoles - array de roles permitidos para a UI
 * @returns true se o role atual estiver na lista
 * @example
 * if (hasRole(['COMPLIANCE', 'ADMIN'])) { ... }
 */
export function hasRole(allowedRoles: UserRole[]): boolean {
  const role = useUserRole();
  return role !== null && allowedRoles.includes(role);
}
