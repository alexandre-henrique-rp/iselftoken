import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  IsUrl,
} from 'class-validator';

export class CreateStartupOpinionDto {
  @ApiProperty({ description: 'ID da startup' })
  @IsString()
  startupId: string;

  @ApiProperty({ description: 'Mensagem da opinião', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  mensagem: string;

  @ApiProperty({ description: 'Nome do autor da opinião' })
  @IsString()
  @MaxLength(255)
  autor: string;

  @ApiPropertyOptional({ description: 'Cargos do autor', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cargos?: string[];

  @ApiPropertyOptional({ description: 'URL do YouTube' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtube?: string;

  @ApiPropertyOptional({ description: 'URL do site' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  site?: string;

  @ApiPropertyOptional({ description: 'URL do LinkedIn' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedin?: string;

  @ApiPropertyOptional({ description: 'URL do Instagram' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagram?: string;

  @ApiPropertyOptional({ description: 'URL do Facebook' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebook?: string;
}
