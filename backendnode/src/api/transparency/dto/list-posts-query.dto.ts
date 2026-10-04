import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TransparencyPostType } from '@prisma/client';

/**
 * DTO para query string de listagem de posts.
 * Suporta filtros por tipo e periodo, com paginacao obrigatoria.
 */
export class ListTransparencyPostsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtro por tipo de post',
    enum: TransparencyPostType,
  })
  @IsOptional()
  @IsEnum(TransparencyPostType)
  type?: TransparencyPostType;

  @ApiPropertyOptional({
    description: 'Filtro por ano do periodo',
    example: 2026,
    minimum: 2000,
    maximum: 2100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    description: 'Filtro por mes do periodo (1-12)',
    example: 9,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    description: 'Numero da pagina (default 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === undefined ? 1 : Number(value)))
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade por pagina (default 10, max 50)',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => (value === undefined ? 10 : Number(value)))
  limit?: number = 10;
}
