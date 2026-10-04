import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateInstallmentDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valorOverride?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacaoFinanceiro?: string;
}

export class RejectInstallmentDto {
  @IsString()
  @MaxLength(1000)
  motivo!: string;
}

export class MarkInstallmentPaidDto {
  @IsString()
  @MaxLength(100)
  txidC6!: string;

  @IsString()
  @MaxLength(100)
  endToEndId!: string;
}

export class CancelRepasseDto {
  @IsString()
  @MaxLength(1000)
  motivo!: string;
}
