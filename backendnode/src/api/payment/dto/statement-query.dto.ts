import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de consulta de extrato.
 *
 * @param startDate - Data inicial do período (ISO 8601)
 * @param endDate   - Data final do período (ISO 8601)
 * @param format    - Formato de saída: JSON (default) ou CNAB240
 */
export class StatementQueryDto {
  @ApiPropertyOptional({ description: 'Data inicial do período (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final do período (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['JSON', 'CNAB240'],
    default: 'JSON',
    description: 'Formato de saída do extrato',
  })
  @IsOptional()
  @IsEnum(['JSON', 'CNAB240'])
  format?: 'JSON' | 'CNAB240';
}
