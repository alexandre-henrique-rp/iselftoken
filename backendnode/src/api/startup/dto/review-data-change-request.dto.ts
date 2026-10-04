import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DataChangeStatus } from '@prisma/client';

/**
 * Tipo de decisão de revisão (APPROVED ou REJECTED).
 * Não inclui PENDING — essa é apenas transição válida.
 */
type ReviewDecision = 'APPROVED' | 'REJECTED';

/**
 * DTO para revisão de solicitação de alteração de dados bloqueados.
 *
 * Usado pela equipe de compliance para aprovar ou rejeitar uma solicitação.
 * reviewNote é obrigatório e deve ter no mínimo 10 caracteres.
 */
export class ReviewDataChangeRequestDto {
  @ApiProperty({
    description: 'Decisão da revisão',
    enum: ['APPROVED', 'REJECTED'],
    example: 'APPROVED',
  })
  @IsEnum(DataChangeStatus, {
    message: 'decision deve ser APPROVED ou REJECTED',
  })
  @IsNotEmpty({ message: 'decision é obrigatório' })
  decision!: ReviewDecision;

  @ApiPropertyOptional({
    description:
      'Nota do revisor (obrigatório, mínimo 10 caracteres). Ao rejeitar, descreva o motivo.',
    example: 'CNPJ informado não corresponde ao documento enviado',
  })
  @IsString()
  @IsNotEmpty({ message: 'reviewNote é obrigatório' })
  @MinLength(10, {
    message: 'reviewNote deve ter no mínimo 10 caracteres',
  })
  reviewNote!: string;
}
