/**
 * Tipos compartilhados entre as páginas e componentes de afiliados.
 */

export type CandidaturaStatus =
  | "PENDING_FOUNDER"
  | "PENDING_ADMIN"
  | "ACTIVE"
  | "REJECTED"
  | "SUSPENDED";

export interface Candidatura {
  id: number;
  status: CandidaturaStatus;
  code: string;
  tokensAllocated: number | null;
  appliedAt: string;
  rejectionReason: string | null;
  user: { id: number; nome: string; email: string; role: string };
  startup: { id: number; nome: string };
  comissaoPct: string | number;
  tokensAvailable: number;
}
