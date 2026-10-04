import {
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para atualizar uma configuracao de parcelamento (uso futuro).
 */
export class UpdateInstallmentConfigDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  interestRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(18)
  maxInstallments?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minInstallmentAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
