import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para o financeiro configurar o repasse de uma campanha FUNDED.
 * Define a quantidade de parcelas e o intervalo entre elas.
 */
export class ConfigureRepasseDto {
  @ApiProperty({
    description: 'Número de parcelas do repasse (mínimo 12)',
    example: 12,
    minimum: 12,
  })
  @IsInt()
  @Min(12, { message: 'O número mínimo de parcelas é 12' })
  numeroParcelas: number;

  @ApiProperty({
    description: 'Intervalo em dias entre cada parcela (15 a 60)',
    example: 30,
    minimum: 15,
    maximum: 60,
  })
  @IsInt()
  @Min(15, { message: 'O intervalo mínimo entre parcelas é 15 dias' })
  @Max(60, { message: 'O intervalo máximo entre parcelas é 60 dias' })
  intervaloDias: number;

  @ApiPropertyOptional({
    description: 'Observação do financeiro sobre a configuração',
    example: 'Repasse configurado conforme análise de risco da campanha.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacaoFinanceiro?: string;
}
