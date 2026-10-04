import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDocumentRequestDto {
  @IsInt()
  startupId!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  type!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
