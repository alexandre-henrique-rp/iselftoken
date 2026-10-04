import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para o fundador solicitar uma parcela de repasse.
 * Contém a alocação de recursos (como o valor será utilizado)
 * e observação livre opcional.
 *
 * Regra: soma de todos os campos de alocação DEVE ser igual ao valor da parcela.
 */
export class RequestInstallmentDto {
  @ApiProperty({
    description: 'Valor destinado a Marketing (R$)',
    example: 5000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'marketing deve ser um número' })
  @Min(0, { message: 'marketing não pode ser negativo' })
  marketing: number;

  @ApiProperty({
    description: 'Valor destinado a Desenvolvimento/Tecnologia (R$)',
    example: 15000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'desenvolvimento deve ser um número' })
  @Min(0, { message: 'desenvolvimento não pode ser negativo' })
  desenvolvimento: number;

  @ApiProperty({
    description: 'Valor destinado a Infraestrutura (R$)',
    example: 3000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'infraestrutura deve ser um número' })
  @Min(0, { message: 'infraestrutura não pode ser negativo' })
  infraestrutura: number;

  @ApiProperty({
    description: 'Valor destinado a Pessoal/RH (R$)',
    example: 10000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'pessoal deve ser um número' })
  @Min(0, { message: 'pessoal não pode ser negativo' })
  pessoal: number;

  @ApiProperty({
    description: 'Valor destinado a Jurídico/Compliance (R$)',
    example: 2000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'juridico deve ser um número' })
  @Min(0, { message: 'juridico não pode ser negativo' })
  juridico: number;

  @ApiProperty({
    description: 'Valor destinado a Operacional (R$)',
    example: 3000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'operacional deve ser um número' })
  @Min(0, { message: 'operacional não pode ser negativo' })
  operacional: number;

  @ApiProperty({
    description: 'Valor destinado a Reserva de Caixa (R$)',
    example: 2000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'reservaCaixa deve ser um número' })
  @Min(0, { message: 'reservaCaixa não pode ser negativo' })
  reservaCaixa: number;

  @ApiPropertyOptional({
    description: 'Observação livre descrevendo como o valor será utilizado',
    example:
      'Nesta parcela priorizamos marketing digital para lançamento do MVP.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Observação deve ter no máximo 1000 caracteres' })
  observacao?: string;
}
