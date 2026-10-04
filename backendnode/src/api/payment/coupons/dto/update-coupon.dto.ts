/**
 * DTO para atualização de cupom (PATCH).
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsCouponCode, IsCouponPercent } from './coupon-custom-validators';

export class UpdateCouponDto {
  @ApiPropertyOptional({
    description: 'Código único do cupom (3-32 caracteres alfanuméricos)',
  })
  @IsOptional()
  @IsString()
  @IsCouponCode()
  code?: string;

  @ApiPropertyOptional({
    description: 'Percentual de desconto (apenas: 20, 30, 50, 60 ou 100)',
  })
  @IsOptional()
  @IsCouponPercent()
  percent?: number;

  @ApiPropertyOptional({
    description: 'Número máximo de usos (null = ilimitado)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  maxUses?: number | null;

  @ApiPropertyOptional({
    description: 'Data de início de validade',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional({
    description: 'Data de expiração',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @ApiPropertyOptional({
    description: 'Descrição do cupom',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Se o cupom está ativo',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
