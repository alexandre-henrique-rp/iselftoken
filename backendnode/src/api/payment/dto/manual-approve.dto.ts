import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ManualApproveDto {
  @ApiProperty({
    description: 'Justificativa para aprovação manual (mínimo 20 caracteres)',
  })
  @IsString()
  @MinLength(20, { message: 'justification deve ter no mínimo 20 caracteres' })
  @MaxLength(1000, {
    message: 'justification deve ter no máximo 1000 caracteres',
  })
  justification: string;

  @ApiPropertyOptional({
    description: 'Chave do comprovante de pagamento off-platform (opcional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comprovanteKey?: string;
}
