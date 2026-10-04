import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
} from 'class-validator';

export enum PaymentPurpose {
  SUBSCRIPTION = 'SUBSCRIPTION',
  INVESTMENT = 'INVESTMENT',
  TOKEN_RESERVATION = 'TOKEN_RESERVATION',
  EARLY_ACCESS = 'EARLY_ACCESS',
  P2P_BUY = 'P2P_BUY',
}

export enum PaymentMethod {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  BOLETO = 'BOLETO',
  WALLET = 'WALLET',
}

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Método de pagamento',
    example: PaymentMethod.PIX,
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod, { message: 'Método de pagamento inválido' })
  method: PaymentMethod;

  @ApiProperty({
    description: 'Propósito da transação',
    example: PaymentPurpose.SUBSCRIPTION,
    enum: PaymentPurpose,
  })
  @IsEnum(PaymentPurpose, { message: 'Propósito inválido' })
  purpose: PaymentPurpose;

  @ApiProperty({
    description: 'ID do plano (obrigatório para SUBSCRIPTION)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'planId deve ser um número' })
  planId?: number;

  @ApiProperty({
    description:
      'ID da campanha (obrigatório para INVESTMENT e TOKEN_RESERVATION)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'campaignId deve ser um número' })
  campaignId?: number;

  @ApiProperty({
    description: 'Quantidade de tokens (obrigatório para INVESTMENT)',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'tokensQty deve ser um número' })
  @IsPositive({ message: 'tokensQty deve ser maior que zero' })
  tokensQty?: number;

  @ApiProperty({
    description: 'Metadados do serviço avulso (EARLY_ACCESS)',
    example: { product: 'EARLY_ACCESS' },
    required: false,
    type: Object,
  })
  @IsOptional()
  @IsObject({ message: 'serviceDetails deve ser um objeto' })
  serviceDetails?: Record<string, any>;

  @ApiProperty({
    description: 'ID da ordem P2P (quando purpose = P2P_BUY)',
    example: 55,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'p2pOrderId deve ser um número' })
  p2pOrderId?: number;
}
