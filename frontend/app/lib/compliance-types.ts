/**
 * Tipos compartilhados para a página /compliance/users.
 *
 * O contrato da listagem é o mesmo usado por /admin/users. Mantemos este
 * alias para evitar duas representações incompatíveis do payload da API.
 */
export type {
  AdminUser as ComplianceUser,
  AdminUsersList as ComplianceUsersList,
} from "./queries";

export type UserRole = "USER" | "ADMIN" | "FINANCEIRO" | "COMPLIANCE";
export type KycStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_RESUBMISSION";
