/**
 * @file document.d.ts
 * @description Tipos e interfaces para documentos de identificação
 */

export type TipoDocumento =
  | "CPF"
  | "CNH"
  | "PASSAPORTE"
  | "CÉDULA_IDENTIDADE"
  | "CARTEIRA_MOTORISTA"
  | "DNI"
  | "CUIT"
  | "RUT"
  | "SSN"
  | "NATIONAL_ID"
  | "BIRTH_CERTIFICATE";

export interface Documentacao {
  tipo_documento: TipoDocumento;
  reg_documento: string;
}
