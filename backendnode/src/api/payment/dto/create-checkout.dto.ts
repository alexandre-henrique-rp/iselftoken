import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  Min,
  IsArray,
} from 'class-validator';
import { PaymentMethod, PaymentPurpose } from '@prisma/client';

/**
 * DTO para itens do checkout
 */
export class CheckoutItemDto {
  @ApiProperty({ description: 'Nome do produto', example: 'Plano Fundador' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Descrição do produto',
    example: 'Acesso completo ao plano fundador',
  })
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Quantidade', example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Valor unitário em centavos', example: 10000 })
  @IsNumber()
  @Min(1)
  unitPrice: number;
}

/**
 * DTO para criar checkout de pagamento (cria Payment + gera checkout em uma única chamada)
 */
export class CreateCheckoutDto {
  @ApiProperty({
    description: 'Valor do pagamento (em centavos)',
    example: 10000,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Método de pagamento',
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description: 'Propósito do pagamento',
    enum: PaymentPurpose,
    example: PaymentPurpose.SUBSCRIPTION,
  })
  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;

  @ApiPropertyOptional({
    description: 'Itens do checkout (para registro)',
    type: [CheckoutItemDto],
  })
  @IsArray()
  @IsOptional()
  items?: CheckoutItemDto[];

  @ApiPropertyOptional({
    description: 'ID da assinatura (quando purpose=SUBSCRIPTION)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  subscriptionId?: number;

  @ApiPropertyOptional({
    description: 'ID do investimento (quando purpose=INVESTMENT)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  investmentId?: number;

  @ApiPropertyOptional({
    description: 'ID da campanha (quando purpose=INVESTMENT)',
    example: 1,
  })
  @Transform(({ value }) => (value != null ? Number(value) : value))
  @IsNumber()
  @IsOptional()
  campaignId?: number;

  @ApiPropertyOptional({
    description: 'Descrição personalizada do pagamento',
    example: 'Pagamento do plano Fundador',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Obrigatório se method=CREDIT_CARD (1..18)',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  installments?: number;

  @ApiPropertyOptional({
    description: 'Segundos até expirar (default 1800, máx 86400)',
    example: 1800,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  expiresIn?: number;
}
