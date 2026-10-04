/**
 * useCouponPermissions — Helper para checagem de permissões client-side
 * na Central de Cupons.
 *
 * ADMIN: CRUD completo (criar, editar, ativar/desativar) + auditoria
 * COMPLIANCE / FINANCEIRO: read-only + histórico de uso
 */

import { useUser } from "./use-user";

export const COUPON_ADMIN_ROLES = ["ADMIN", "COMPLIANCE", "FINANCEIRO"] as const;
export type CouponAdminRole = (typeof COUPON_ADMIN_ROLES)[number];

export interface CouponPermissions {
  /** Pode acessar a Central de Cupons */
  canAccess: boolean;
  /** Pode criar/editar/desativar cupons (somente ADMIN) */
  canManage: boolean;
  /** Pode visualizar histórico de uso (todos os perfis administrativos) */
  canViewHistory: boolean;
  role: CouponAdminRole | null;
}

export function useCouponPermissions(): CouponPermissions {
  const { user } = useUser();

  const role = (user?.role ?? null) as CouponAdminRole | null;
  const isAdminRole = role !== null && COUPON_ADMIN_ROLES.includes(role);

  return {
    canAccess: isAdminRole,
    canManage: role === "ADMIN",
    canViewHistory: isAdminRole,
    role,
  };
}
