/**
 * Tipos compartilhados para a timeline de decisões e aba de documentos.
 */

export interface AuditLogEntry {
  id: number;
  action: string;
  entity: string;
  entityId: string;
  userId: number | null;
  userName: string | null;
  oldValue: unknown;
  newValue: unknown;
  ip: string | null;
  createdAt: string;
}

export type StartupDocumentCategory =
  | "MIE"
  | "CONTRATO_SOCIAL"
  | "CARTAO_CNPJ"
  | "BALANCO"
  | "DECLARACAO_VERACIDADE"
  | "ATA_ELEICAO"
  | "PITCH_DECK"
  | "PROJECOES_FINANCEIRAS"
  | "OTHER";

export interface StartupDocumentItem {
  id: number;
  categoria: StartupDocumentCategory | string;
  nome: string;
  s3Key: string;
  mimetype: string;
  sizeBytes: number;
  uploadedById: number;
  createdAt: string;
}
