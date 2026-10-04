import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethodDto {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  BOLETO = 'BOLETO',
  WALLET = 'WALLET',
}

export enum PaymentPurposeDto {
  SUBSCRIPTION = 'SUBSCRIPTION',
  INVESTMENT = 'INVESTMENT',
  TOKEN_RESERVATION = 'TOKEN_RESERVATION',
  EARLY_ACCESS = 'EARLY_ACCESS',
  P2P_BUY = 'P2P_BUY',
  VERIFICATION_SEAL = 'VERIFICATION_SEAL',
  /**
   * Taxa de compliance da startup — criada automaticamente após o founder
   * salvar a captação completa. Idempotente (uma campanha só pode ter 1
   * Payment PENDING/PAID COMPLIANCE_FEE). Ver LGPD-FIND-S01-001: termo
   * de aceite formal Art. 7º V é tracked em sprint dedicada; por ora o
   * aceite é implícito (founder clica "Salvar" → cobrança é gerada).
   */
  COMPLIANCE_FEE = 'COMPLIANCE_FEE',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Valor do pagamento', example: 100.0 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Método de pagamento', enum: PaymentMethodDto })
  @IsEnum(PaymentMethodDto)
  method: PaymentMethodDto;

  @ApiProperty({
    description: 'Finalidade do pagamento',
    enum: PaymentPurposeDto,
  })
  @IsEnum(PaymentPurposeDto)
  purpose: PaymentPurposeDto;

  @ApiPropertyOptional({ description: 'ID da assinatura (se aplicável)' })
  @IsOptional()
  @IsNumber()
  subscriptionId?: number;

  @ApiPropertyOptional({ description: 'ID do investimento (se aplicável)' })
  @IsOptional()
  @IsNumber()
  investmentId?: number;

  @ApiPropertyOptional({ description: 'ID da campanha (para taxa de reserva)' })
  @IsOptional()
  @IsNumber()
  campaignId?: number;
}

export class GeneratePixDto {
  @ApiProperty({ description: 'ID do pagamento para gerar PIX' })
  @IsNumber()
  paymentId: number;

  @ApiProperty({ description: 'Descrição do pagamento para o QR Code' })
  @IsString()
  description: string;
}
