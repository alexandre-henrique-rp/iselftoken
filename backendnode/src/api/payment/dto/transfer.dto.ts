import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para requisição de cash-out (saque) via PIX ou TED.
 *
 * Requer 2FA recente (TwoFactorGuard).
 *
 * @param method           - PIX ou TED
 * @param amount           - Valor do saque (mínimo R$ 0,01)
 * @param destinationBankCode    - Código do banco destinatário (ex: "0001")
 * @param destinationAccountNumber - Número da conta destinatário
 * @param destinationBranchNumber  - Número da agência destinatário
 * @param destinationHolderName   - Nome do titular da conta
 * @param destinationHolderDocument - CPF (11 dígitos) ou CNPJ (14 dígitos)
 * @param description       - Descrição opcional (máx 140 caracteres)
 */
export class TransferDto {
  @ApiProperty({ enum: ['PIX', 'TED'], description: 'Método de transferência' })
  @IsEnum(['PIX', 'TED'])
  method: 'PIX' | 'TED';

  @ApiProperty({ minimum: 0.01, description: 'Valor do saque (R$)' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Código do banco destinatário' })
  @IsString()
  destinationBankCode: string;

  @ApiProperty({ description: 'Número da conta destinatário' })
  @IsString()
  destinationAccountNumber: string;

  @ApiProperty({ description: 'Número da agência destinatário' })
  @IsString()
  destinationBranchNumber: string;

  @ApiProperty({ description: 'Nome do titular da conta destinatário' })
  @IsString()
  destinationHolderName: string;

  @ApiProperty({
    description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) do titular',
    pattern: '^\d{11}$|^\d{14}$',
  })
  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'destinationHolderDocument must be 11 (CPF) or 14 (CNPJ) digits',
  })
  destinationHolderDocument: string;

  @ApiPropertyOptional({
    description: 'Descrição opcional da transferência',
    maxLength: 140,
  })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  description?: string;
}
