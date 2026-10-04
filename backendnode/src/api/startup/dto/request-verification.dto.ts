import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

/**
 * @name RequestVerificationDto
 * @description DTO para solicitação do selo "Startup Verificada".
 *
 * Requer IDs dos documentos legais já enviados via upload.
 * Gera pagamento de R$ 890,00 para a verificação documental.
 */
export class RequestVerificationDto {
  @ApiProperty({
    description: 'IDs dos documentos legais (KYCProfile IDs) para verificação',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  documentIds: number[];
}
