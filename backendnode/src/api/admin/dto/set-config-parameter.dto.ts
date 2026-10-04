import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SetConfigParameterDto {
  @ApiProperty({
    description: 'Chave do parâmetro de configuração',
    example: 'platformFee',
  })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({
    description: 'Novo valor numérico para o parâmetro',
    example: 0.05,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({
    description:
      'Data de início da vigência em formato ISO 8601 (opcional, default: agora)',
    example: '2026-09-08T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @ApiProperty({
    description: 'Nota explicativa ou motivo da alteração',
    example: 'Ajuste anual de taxa conforme ata da diretoria',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
