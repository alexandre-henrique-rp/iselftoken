/**
 * Tipos para a pagina publica de verificacao de documento assinado.
 *
 * Baseado na resposta real do backend GET /verificar/:documentId (sem auth).
 * O backend ja sanitiza dados sensiveis (CPF/CNPJ mascarados, IPs omitidos).
 */

/**
 * Status de validacao do documento (derivado da resposta do backend).
 */
export type DocumentoStatus = "valido" | "invalido" | "atencao" | "nao_encontrado";

/**
 * Informacoes do certificado digital.
 */
export interface InfoCertificado {
  serialNumber: string;
  fingerprint: string;
  issuedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  status: "active" | "revoked" | "expired";
}

/**
 * Informacoes do documento mascarado.
 */
export interface InfoDocumentoMascarado {
  type: string;
  masked: string;
}

/**
 * Signatario do documento (founder ou startup).
 */
export interface Signatario {
  role: "founder" | "startup";
  displayName: string;
  document: InfoDocumentoMascarado;
  certificate: InfoCertificado;
}

/**
 * Resultado da validacao tecnica.
 */
export interface Validacao {
  hashMatches: boolean;
  certificatesActive: boolean;
  signedWithinValidity: boolean;
}

/**
 * Informacoes basicas do documento.
 */
export interface InfoDocumento {
  type: string;
  signedAt: string; // ISO 8601
  templateVersion: string;
}

/**
 * Entrada do log de auditoria (sem IPs).
 */
export interface LogAuditoria {
  action: string;
  createdAt: string; // ISO 8601
}

/**
 * Resposta da API publica de verificacao (formato exato do backend).
 */
export interface DocumentoVerificacao {
  exists: boolean;
  valid: boolean;
  validation: Validacao;
  document: InfoDocumento;
  signataries: Signatario[];
  audits: LogAuditoria[];
  /** URL para download do PDF (disponivel apenas se valido) */
  presignedUrl?: string;
}
