import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for signing the Termo de Adesao.
 *
 * @description Request body for PATCH /founder/startups/:startupId/termo-adesao
 */
export class SignTermoAdesaoDto {
  @ApiProperty({
    description: 'Confirma o aceite do Termo de Adesao',
    example: true,
  })
  @IsBoolean()
  aceite: boolean;

  @ApiPropertyOptional({
    description:
      'Motivo da assinatura (opcional, usado na assinatura digital PAdES)',
    example: 'Assinatura do Termo de Adesao Digital',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
