import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Dados do certificado digital no response.
 */
export class CertInfoResponseDto {
  @ApiProperty({
    description: 'Numero de serie do certificado',
    example: 'A1B2C3D4E5F6...',
  })
  serialNumber: string;

  @ApiProperty({
    description: 'Fingerprint SHA-256 do certificado',
    example: 'a1b2c3d4e5f6...',
  })
  fingerprint: string;
}

/**
 * Response do documento assinado.
 */
export class SignedDocumentResponseDto {
  @ApiProperty({
    description: 'ID do documento assinado',
    example: 'clx1234abcd',
  })
  id: string;

  @ApiProperty({
    description: 'Hash SHA-256 do documento',
    example: 'abc123def456...',
  })
  documentHash: string;

  @ApiProperty({
    description: 'Data/hora da assinatura ISO-8601',
    example: '2026-07-10T15:30:00.000Z',
  })
  signedAt: string;

  @ApiProperty({
    description: 'URL para download do PDF (presigned, TTL 7 dias)',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'Dados do certificado do founder',
    type: CertInfoResponseDto,
  })
  founderCert: CertInfoResponseDto;

  @ApiProperty({
    description: 'Dados do certificado da startup',
    type: CertInfoResponseDto,
  })
  startupCert: CertInfoResponseDto;
}

/**
 * Metadados do documento assinado (para GET).
 */
export class TermoAdesaoMetadataDto {
  @ApiProperty({ description: 'ID do documento assinado' })
  id: string;

  @ApiProperty({ description: 'Hash SHA-256 do documento' })
  documentHash: string;

  @ApiProperty({ description: 'Data/hora da assinatura ISO-8601' })
  signedAt: string;

  @ApiProperty({
    description: 'Dados do certificado do founder',
    type: CertInfoResponseDto,
  })
  founderCert: CertInfoResponseDto;

  @ApiProperty({
    description: 'Dados do certificado da startup',
    type: CertInfoResponseDto,
  })
  startupCert: CertInfoResponseDto;
}

/**
 * Response do GET /founder/startups/:startupId/termo-adesao
 */
export class GetTermoAdesaoResponseDto {
  @ApiProperty({ description: 'Se existe documento assinado', example: true })
  exists: boolean;

  @ApiPropertyOptional({
    description: 'Metadados do documento (se existe)',
    type: TermoAdesaoMetadataDto,
    nullable: true,
  })
  document: TermoAdesaoMetadataDto | null;

  @ApiPropertyOptional({
    description: 'URL para download (presigned, TTL 7 dias)',
    nullable: true,
  })
  downloadUrl: string | null;

  @ApiPropertyOptional({
    description: 'URL para visualizacao (presigned, TTL 7 dias)',
    nullable: true,
  })
  readUrl: string | null;
}
