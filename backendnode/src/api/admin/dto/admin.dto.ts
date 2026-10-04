import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO para parâmetros de listagem paginada
 */
export class UpdatePayoutInstallmentDateDto {
  @ApiProperty({
    description: 'Nova data prevista de pagamento em formato ISO 8601',
    example: '2026-10-15T00:00:00.000Z',
  })
  @IsDateString()
  scheduledDate!: string;
}

export class PaginationQueryDto {
  @ApiProperty({ required: false, description: 'Número da página', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Itens por página',
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 25;
}

/**
 * DTO para busca com filtros
 */
export class SearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    required: false,
    description: 'Termo de busca',
    example: 'Tecnologia',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * DTO para filtros de startup
 */
export class StartupFilterQueryDto extends SearchQueryDto {
  @ApiProperty({
    required: false,
    description: 'Status da startup',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    example: 'PENDING',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Segmento/área de atuação da startup',
    example: 'Fintech',
  })
  @IsOptional()
  @IsString()
  segmento?: string;
}

/**
 * DTO para filtros de usuário
 */
export class UserFilterQueryDto extends SearchQueryDto {
  @ApiProperty({
    required: false,
    description: 'Role do usuário',
    enum: ['USER', 'ADMIN', 'FINANCEIRO', 'COMPLIANCE', 'INVESTOR', 'FOUNDER'],
    example: 'USER',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    required: false,
    description: 'Status KYC',
    enum: [
      'PENDING',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'NEEDS_RESUBMISSION',
    ],
    example: 'PENDING',
  })
  @IsOptional()
  @IsString()
  kycStatus?: string;
}

/**
 * DTO para keputusan KYC
 */
export class KycDecisionDto {
  @ApiProperty({
    required: true,
    description: 'Decisão do KYC',
    enum: ['APPROVED', 'REJECTED', 'NEEDS_RESUBMISSION', 'REVOKE'],
    example: 'APPROVED',
  })
  @IsString()
  decision!: string;

  @ApiProperty({
    required: false,
    description:
      'Motivo da decisão (obrigatório para rejeição ou reenvio; não usado em revogação)',
    example: 'Documento ilegível',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO para atualização de status de startup
 */
export class UpdateStartupStatusDto {
  @ApiProperty({
    required: true,
    description: 'Novo status da startup',
    enum: ['APPROVED', 'REJECTED', 'PENDING'],
    example: 'APPROVED',
  })
  @IsString()
  status!: string;

  @ApiProperty({
    required: false,
    description: 'Justificativa da decisão',
    example: 'Todos os documentos verificados com sucesso',
  })
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiProperty({
    required: false,
    description:
      'Fase do fluxo admin que originou a decisão (1, 2 ou 3). ' +
      'Quando ausente (legado), fica registrado como 0.',
    enum: [1, 2, 3],
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  phase?: number;
}

/**
 * DTO para toggle de status de usuário
 */
export class ToggleUserStatusDto {
  @ApiProperty({
    required: true,
    description: 'Status ativo',
    example: true,
  })
  @IsOptional()
  isActive?: boolean;
}

/**
 * DTO para incremento de score de marketplace (ação "Coroar").
 *
 * Endpoint exclusivo para uso APÓS aprovação da Fase 3 (`phase 3 reviewStatus
 * === "APPROVED"`). Soma `delta` ao score atual da startup e clampa em 0..100.
 * Aceita delta negativo para permitir reduzir score via curadoria.
 *
 * Regra de negócio (CASE.md §Curadoria Premium): apenas ADMIN pode incrementar;
 * a checagem de fase é feita no service para garantir defesa em profundidade
 * contra bypass de frontend.
 */
export class IncrementScoreDto {
  @ApiProperty({
    required: true,
    description:
      'Pontos a somar ao score atual (pode ser negativo). ' +
      'O resultado final é clampado em 0..100.',
    example: 10,
    minimum: -100,
    maximum: 100,
  })
  @IsInt()
  @Min(-100)
  @Max(100)
  delta!: number;

  @ApiProperty({
    required: false,
    description:
      'Justificativa textual (opcional, mas recomendada). Gravada no AuditLog.',
    example: 'Performance Q3 validada pela curadoria',
    maxLength: 280,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
