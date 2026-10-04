/**
 * DTO para criar uma NOVA RODADA de captacao (T032).
 * Regra M5-S09 B05: so pode iniciar nova rodada se a anterior foi
 * 100% vendida + 3 meses de intervalo.
 *
 * S01.2a: removidos `@Min` hardcoded de campos numericos (targetAmount,
 * minInvestment, valuation, tokenPrice, totalTokens, faturamentoMinimoLucros).
 * Validacao de REGRA (min/max) migrara para SystemConfig no service em S01.2b.
 * Mantidos: `@IsNumber`/`@IsInt` (forma) e `@MaxLength`/`@MinLength` em textos.
 *
 * R1-D2 (S01.3a): Adicionados `@Min`/`@Max` hardcoded em targetAmount e
 * totalTokens como defesa em profundidade (DTO-level). A validacao dinamica
 * via SystemConfig continua no service via CampaignFinancialHelper.
 */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ArrayMinSize,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ResourceAllocationDto,
  ValidateSum100,
} from './resource-allocation.dto';

export class CreateNewRoundDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'targetAmount deve ser numero finito' },
  )
  @Min(1000, { message: 'Valor mínimo de captação é R$ 1.000,00' })
  @Max(10_000_000, { message: 'Valor máximo de captação é R$ 10.000.000,00' })
  targetAmount!: number;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'minInvestment deve ser numero finito' },
  )
  minInvestment!: number;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'Valuation deve ser numero finito (sem NaN/Infinity)' },
  )
  @Min(0, { message: 'Valuation deve ser >= 0' })
  valuation!: number;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'tokenPrice deve ser numero finito' },
  )
  tokenPrice!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Quantidade mínima de tokens é 1' })
  @Max(100_000_000, { message: 'Quantidade máxima de tokens é 100.000.000' })
  totalTokens!: number;

  @Type(() => Date)
  @IsDate()
  deadline!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @ApiPropertyOptional({
    type: [ResourceAllocationDto],
    description:
      'Alocação de recursos por categoria. Soma dos percentuais deve ser exatamente 100%.',
    example: [
      { categoria: 'FUNDADOR', percentual: 40 },
      { categoria: 'DESENVOLVIMENTO', percentual: 30 },
      { categoria: 'MARKETING', percentual: 20 },
      { categoria: 'RESERVA_CAIXA', percentual: 10 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Deve haver pelo menos 1 alocação de recurso' })
  @ValidateNested({ each: true })
  @Type(() => ResourceAllocationDto)
  @ValidateSum100()
  @IsOptional()
  resourceAllocations?: ResourceAllocationDto[];

  // === CAMPOS CVM/COMPLIANCE (M7-S22) ===

  @ApiPropertyOptional({
    description: 'Data de lançamento da rodada (ISO 8601)',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Data de lançamento deve ser uma data válida (ISO 8601).' },
  )
  dataLancamentoRodada?: string;

  @ApiPropertyOptional({
    description: 'Objetivo da captação (10-500 caracteres)',
  })
  @IsOptional()
  @MinLength(10, {
    message: 'Objetivo da captação deve ter no mínimo 10 caracteres.',
  })
  @MaxLength(500, {
    message: 'Objetivo da captação deve ter no máximo 500 caracteres.',
  })
  @IsString()
  objetivoCaptacao?: string;

  @ApiPropertyOptional({
    description: 'O que espera alcançar com a captação (10-500 caracteres)',
  })
  @IsOptional()
  @MinLength(10, {
    message: 'O que espera alcançar deve ter no mínimo 10 caracteres.',
  })
  @MaxLength(500, {
    message: 'O que espera alcançar deve ter no máximo 500 caracteres.',
  })
  @IsString()
  oQueEsperaAlcancar?: string;

  @ApiPropertyOptional({ description: 'Participação nos lucros' })
  @IsOptional()
  @IsBoolean()
  participacaoLucros?: boolean;

  @ApiPropertyOptional({
    description: 'Faturamento mínimo para participação nos lucros',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  faturamentoMinimoLucros?: number;

  @ApiPropertyOptional({ description: 'Há benefícios adicionais' })
  @IsOptional()
  @IsBoolean()
  beneficiosAdicionais?: boolean;

  @ApiPropertyOptional({
    description: 'Descrição dos benefícios adicionais (10-500 caracteres)',
  })
  @IsOptional()
  @MinLength(10, {
    message: 'Descrição dos benefícios deve ter no mínimo 10 caracteres.',
  })
  @MaxLength(500, {
    message: 'Descrição dos benefícios deve ter no máximo 500 caracteres.',
  })
  @ValidateIf((o: any) => o.beneficiosAdicionais === true)
  @IsString()
  beneficiosDescricao?: string;

  @ApiPropertyOptional({ description: 'Aceite do termo de repasse' })
  @IsOptional()
  @IsBoolean()
  aceiteTermoRepasse?: boolean;

  @ApiPropertyOptional({
    description: 'Declaração de veracidade das informações',
  })
  @IsOptional()
  @IsBoolean()
  declaracaoVeracidade?: boolean;

  @ApiPropertyOptional({
    description: 'Percentual de comissão para afiliados (0-100)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  affiliateCommissionPct?: number;
}
