import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @IsString()
  @IsNotEmpty()
  htmlTemplate: string;

  @IsString()
  @IsNotEmpty()
  textTemplate: string;

  @IsObject()
  @IsNotEmpty()
  variablesSchema: Record<string, any>;

  @IsString()
  @IsOptional()
  changeNote?: string;
}
