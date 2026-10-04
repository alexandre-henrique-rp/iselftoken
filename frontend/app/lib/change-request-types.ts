/** Status possíveis de uma solicitação de alteração de dados. */
export type ChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Campo-alvo de uma solicitação de alteração (acesso bloqueado pós-rodada). */
export type ChangeRequestField = "cnpj" | "razaoSocial" | "paisIso3";

/** Mapping label amigável para cada campo. */
export const FIELD_LABELS: Record<ChangeRequestField, string> = {
  cnpj: "CNPJ",
  razaoSocial: "Razão Social",
  paisIso3: "País",
};

/** Mapping label para status de solicitação. */
export const STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

/** Cor de fundo + texto para cada status. */
export const STATUS_STYLES: Record<ChangeRequestStatus, { color: string; bg: string }> = {
  PENDING: { color: "text-amber-400", bg: "bg-amber-500/10" },
  APPROVED: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  REJECTED: { color: "text-red-400", bg: "bg-red-500/10" },
};

/** Uma solicitação de alteração retornada pela API. */
export interface ChangeRequest {
  id: string;
  startupId: string;
  startupName?: string;
  field: ChangeRequestField;
  currentValue: string;
  requestedValue: string;
  justification: string;
  status: ChangeRequestStatus;
  reviewerNote?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Payload para criar uma nova solicitação de alteração. */
export interface CreateChangeRequestPayload {
  startupId: string;
  field: ChangeRequestField;
  requestedValue: string;
  justification: string;
}

/** Payload para aprovar/rejeitar uma solicitação (compliance). */
export interface ReviewChangeRequestPayload {
  status: "APPROVED" | "REJECTED";
  reviewerNote: string;
}
