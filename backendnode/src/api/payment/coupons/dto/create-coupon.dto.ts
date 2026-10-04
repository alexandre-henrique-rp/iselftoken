/**
 * DTO para criação de cupom de desconto.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsCouponCode, IsCouponPercent } from './coupon-custom-validators';

export class CreateCouponDto {
  @ApiProperty({
    description: 'Código único do cupom (3-32 caracteres alfanuméricos)',
    example: 'DESCONTO20',
  })
  @IsString()
  @IsCouponCode()
  code: string;

  @ApiProperty({
    description: 'Percentual de desconto (apenas: 20, 30, 50, 60 ou 100)',
    example: 20,
    enum: [20, 30, 50, 60, 100],
  })
  @IsCouponPercent()
  percent: number;

  @ApiPropertyOptional({
    description: 'Número máximo de usos (null = ilimitado)',
    example: 100,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  maxUses?: number | null;

  @ApiPropertyOptional({
    description: 'Data de início de validade (null = válido desde sempre)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional({
    description: 'Data de expiração (null = nunca expira)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @ApiPropertyOptional({
    description: 'Descrição do cupom (opcional)',
    example: 'Cupom de desconto para新年促销活动',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
