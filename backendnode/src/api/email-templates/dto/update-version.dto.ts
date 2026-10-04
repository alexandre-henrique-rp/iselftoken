import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';

export class UpdateVersionDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  subject?: string;

  @IsString()
  @IsOptional()
  htmlTemplate?: string;

  @IsString()
  @IsOptional()
  textTemplate?: string;

  @IsObject()
  @IsOptional()
  variablesSchema?: Record<string, any>;

  @IsString()
  @IsOptional()
  changeNote?: string;
}
