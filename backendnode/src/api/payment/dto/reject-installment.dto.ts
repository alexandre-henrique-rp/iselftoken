import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para o financeiro rejeitar uma parcela de repasse.
 * O motivo é obrigatório para que o fundador saiba o que corrigir.
 */
export class RejectInstallmentDto {
  @ApiProperty({
    description: 'Motivo da rejeição (obrigatório)',
    example:
      'A alocação de marketing está desproporcional ao estágio atual da startup. Revise.',
    minLength: 10,
    maxLength: 500,
  })
  @IsString({ message: 'motivo deve ser uma string' })
  @MinLength(10, { message: 'O motivo deve ter pelo menos 10 caracteres' })
  @MaxLength(500, { message: 'O motivo deve ter no máximo 500 caracteres' })
  motivo: string;
}
