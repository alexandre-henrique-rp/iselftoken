import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para concessão de consentimento biométrico (LGPD Art. 11 I).
 *
 * O consentimento deve ser:
 * - Explícito (não pré-marcado)
 * - Informado (com versão do termo)
 * - Revogável (Art. 18 IX)
 */
export class GrantBiometricConsentDto {
  @ApiProperty({
    description: 'Versão do termo de consentimento biométrico',
    example: 'v1.0-2026-08-22',
  })
  @IsString()
  @IsNotEmpty()
  version: string;
}
