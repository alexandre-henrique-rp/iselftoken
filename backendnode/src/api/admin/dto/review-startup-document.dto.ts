import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO para revisão (aprovar/reprovar) de um documento individual de startup
 * no fluxo §2 (Compliance/Admin). Rejeição exige justificativa >=20 chars
 * e <=500 (LGPD). Validação adicional aplicada no service (snapshot pré-delete).
 */
export class ReviewStartupDocumentDto {
  @ApiProperty({
    required: true,
    description: 'Decisão do admin sobre o documento',
    enum: ['APPROVED', 'REJECTED'],
    example: 'APPROVED',
  })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiProperty({
    required: false,
    description:
      'Justificativa obrigatória quando decision=REJECTED (>=20 chars, <=500). ' +
      'Para APPROVED é ignorada.',
    example:
      'CNPJ divergente do cartão CNPJ da empresa — favor reenviar o cartão CNPJ correto.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
