import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Validation result for a signed document.
 */
export class ValidationDto {
  @ApiProperty({
    description: 'Indica se o hash SHA-256 do PDF confere com o armazenado',
    example: true,
  })
  hashMatches: boolean;

  @ApiProperty({
    description: 'Indica se ambos os certificados estao ativos e validos',
    example: true,
  })
  certificatesActive: boolean;

  @ApiProperty({
    description:
      'Indica se a assinatura foi feita dentro do periodo de validade dos certificados',
    example: true,
  })
  signedWithinValidity: boolean;
}

/**
 * Document metadata information.
 */
export class DocumentInfoDto {
  @ApiProperty({
    description: 'Tipo de documento',
    example: 'termo_adesao',
  })
  type: string;

  @ApiProperty({
    description: 'Data/hora da assinatura em formato ISO-8601',
    example: '2024-01-15T10:30:00.000Z',
  })
  signedAt: string;

  @ApiProperty({
    description: 'Versao do template do documento',
    example: '1.0.0',
  })
  templateVersion: string;
}

/**
 * Masked document identifier (CPF or CNPJ).
 */
export class DocumentMaskedDto {
  @ApiProperty({
    description: 'Tipo de documento',
    enum: ['CPF', 'CNPJ', 'DOCUMENT'],
    example: 'CPF',
  })
  type: string;

  @ApiProperty({
    description:
      'Documento com revelacao parcial (apenas 2 ultimos digitos visiveis)',
    example: '***.***.***-57',
  })
  masked: string;
}

/**
 * Certificate information for a signatory.
 */
export class CertificateInfoDto {
  @ApiProperty({
    description: 'Numero de serie do certificado',
    example: 'A1B2C3D4E5F6789012345678901234567890ABCD',
  })
  serialNumber: string;

  @ApiProperty({
    description: 'Impressao digital SHA-256 da chave publica',
    example:
      'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678',
  })
  fingerprint: string;

  @ApiProperty({
    description: 'Data de emissao do certificado em formato ISO-8601',
    example: '2024-01-15T00:00:00.000Z',
  })
  issuedAt: string;

  @ApiProperty({
    description: 'Data de expiracao do certificado em formato ISO-8601',
    example: '2025-01-15T00:00:00.000Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Status do certificado',
    enum: ['active', 'revoked', 'expired'],
    example: 'active',
  })
  status: 'active' | 'revoked' | 'expired';
}

/**
 * Information about a signatory (founder or startup).
 */
export class SignataryDto {
  @ApiProperty({
    description: 'Papel do signatario',
    enum: ['founder', 'startup'],
    example: 'founder',
  })
  role: 'founder' | 'startup';

  @ApiProperty({
    description:
      'Nome de exibicao (primeiro nome + inicial + sobrenome para pessoas)',
    example: 'F. Silva',
  })
  displayName: string;

  @ApiProperty({
    description: 'Documento mascarado do signatario',
    type: DocumentMaskedDto,
  })
  document: DocumentMaskedDto;

  @ApiProperty({
    description: 'Informacoes do certificado digital',
    type: CertificateInfoDto,
  })
  certificate: CertificateInfoDto;
}

/**
 * Audit log entry (public info only).
 */
export class AuditDto {
  @ApiProperty({
    description: 'Acao realizada',
    example: 'documento_assinado',
  })
  action: string;

  @ApiProperty({
    description: 'Data/hora da acao em formato ISO-8601',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;
}

/**
 * Response DTO for successful document verification.
 */
export class VerificarResponseDto {
  @ApiProperty({
    description: 'Indica se o documento existe',
    example: true,
  })
  exists: true;

  @ApiProperty({
    description:
      'Indica se o documento eh valido (hash + certificados + prazo)',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Detalhes da validacao',
    type: ValidationDto,
  })
  validation: ValidationDto;

  @ApiProperty({
    description: 'Metadados do documento',
    type: DocumentInfoDto,
  })
  document: DocumentInfoDto;

  @ApiProperty({
    description: 'Lista de signatarios com dados mascarados',
    type: [SignataryDto],
  })
  signataries: SignataryDto[];

  @ApiProperty({
    description: 'Log de auditoria (sem dados sensiveis)',
    type: [AuditDto],
  })
  audits: AuditDto[];

  @ApiPropertyOptional({
    description: 'Header Cache-Control (se aplicavel)',
    example: 'public, max-age=300',
  })
  'Cache-Control'?: string;
}

/**
 * Response DTO for document not found.
 */
export class VerificarNotFoundResponseDto {
  @ApiProperty({
    description: 'Indica que o documento nao existe',
    example: false,
  })
  exists: false;

  @ApiProperty({
    description: 'Mensagem de erro',
    example: 'Documento nao encontrado',
  })
  message: string;
}

/**
 * Response DTO for download redirect.
 */
export class VerificarDownloadResponseDto {
  @ApiProperty({
    description: 'URL para download do documento',
    example: 'https://s3.example.com/bucket/key.pdf?signature=...',
  })
  url: string;
}
