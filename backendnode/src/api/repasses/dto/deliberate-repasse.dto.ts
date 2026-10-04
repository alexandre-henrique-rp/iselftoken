import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class DeliberateRepasseDto {
  @IsInt()
  @Min(12)
  @Max(60)
  numeroParcelas!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacao?: string;
}
