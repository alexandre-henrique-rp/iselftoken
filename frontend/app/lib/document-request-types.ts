/**
 * Tipos compartilhados do módulo de solicitações de documentos (AC-07).
 */

export type DocumentRequestStatus = "PENDING" | "FULFILLED" | "EXPIRED" | "CANCELED";

export interface DocumentRequestItem {
  id: number;
  startupId: number;
  requestedById: number;
  requestedByName?: string | null;
  startupName?: string | null;
  type: string;
  description: string;
  deadline?: string | null;
  status: DocumentRequestStatus;
  fulfilledDocId?: number | null;
  fulfilledDocName?: string | null;
  createdAt: string;
  updatedAt: string;
}
