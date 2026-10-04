import { IsNumber, Max, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para criar uma nova configuracao de parcelamento.
 */
export class CreateInstallmentConfigDto {
  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'interestRate deve ser >= 0' })
  @Max(1, { message: 'interestRate deve ser <= 1 (100%)' })
  interestRate: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'maxInstallments deve ser >= 1' })
  @Max(18, { message: 'maxInstallments nao pode ser maior que 18' })
  maxInstallments: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'minInstallmentAmount deve ser >= 0' })
  minInstallmentAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
