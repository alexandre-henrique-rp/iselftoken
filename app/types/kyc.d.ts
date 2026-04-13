/**
 * @file kyc.d.ts
 * @description Tipos e interfaces para verificação KYC
 */

export type DocType = "documento" | "comprovante" | "biofacial";

export type UploadStatus = "pendente" | "enviado" | "aprovado" | "rejeitado";

export interface UploadDoc {
  tipo: DocType;
  arquivo?: File;
  preview?: string;
  status: UploadStatus;
  motivoRejeicao?: string;
}

export interface UploadResponse {
  id: number;
  url: string;
  status: string;
}

export interface KycStatus {
  status: "pendente" | "em_analise" | "aprovado" | "reprovado";
  documentos: Array<{
    tipo: DocType;
    status: UploadStatus;
  }>;
  observacoes?: string;
}
