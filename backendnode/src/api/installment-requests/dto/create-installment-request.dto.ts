import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * DTO para a alocacao por categoria (7 campos, soma = 100%).
 * Validador `validatePercentsSum` e cross-field: soma = 100% (tolerancia 0.01).
 */
export class AllocationPercentsDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 20 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  marketing!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 20 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  desenvolvimento!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 10 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  infraestrutura!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 20 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  pessoal!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 5 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  juridico!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 15 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  operacional!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 10 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  reservaCaixa!: number;
}

/**
 * DTO para criar uma InstallmentRequest (POST /request).
 *
 * Inclui o "Relatorio do Mes" (FIN-11 §8.2) — campos opcionais
 * que serao publicados na pagina de Transparencia caso a solicitacao
 * seja APROVADA. Se REJEITADA, o relatorio NAO e publicado.
 *
 * Validacoes:
 * - Soma allocationPercents = 100 (tolerancia 0.01, no service).
 * - marcoDescricao so permitido se marcoAlcancado === true (cross-field).
 * - LGPD: bankInfoSnapshot vem da Startup (server-side), nunca do client.
 */
export class CreateInstallmentRequestDto {
  @ApiProperty({ type: AllocationPercentsDto })
  allocationPercents!: AllocationPercentsDto;

  @ApiPropertyOptional({
    description: 'Observacao livre do fundador (max 1000 chars)',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacao?: string;

  @ApiPropertyOptional({
    description:
      'Mensagem do mes para os investidores. Publicada na Transparencia se aprovada. Max 5000 chars.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  mensagemInvestidores?: string;

  @ApiPropertyOptional({
    description:
      'Para onde o recurso sera utilizado. Publicada na Transparencia se aprovada. Max 2000 chars.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  usoRecurso?: string;

  @ApiPropertyOptional({
    description: 'A startup teve lucro neste periodo?',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  teveLucro?: boolean;

  @ApiPropertyOptional({
    description: 'A startup atingiu algum marco do produto neste periodo?',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  marcoAlcancado?: boolean;

  @ApiPropertyOptional({
    description:
      'Detalhe do marco atingido. OBRIGATORIO se marcoAlcancado === true. Max 2000 chars.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ValidateIf((o) => o.marcoAlcancado === true)
  marcoDescricao?: string;
}
