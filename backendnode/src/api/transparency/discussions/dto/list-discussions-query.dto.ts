import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscussionCategory } from '@prisma/client';

export type DiscussionSort = 'recent' | 'oldest' | 'top';

/**
 * Query string para listagem de Discussao.
 *
 * - q: busca textual em title+content (LIKE %q%)
 * - category: filtro por taxonomia
 * - sort: recent|oldest|top (default recent)
 * - page, limit: paginacao (limit max 50)
 */
export class ListDiscussionsQueryDto {
  @ApiPropertyOptional({
    description: 'Busca textual em title+content.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    enum: DiscussionCategory,
    description: 'Filtro por taxonomia.',
  })
  @IsOptional()
  @IsEnum(DiscussionCategory)
  category?: DiscussionCategory;

  @ApiPropertyOptional({
    enum: ['recent', 'oldest', 'top'],
    description: 'Ordenacao. Default recent.',
  })
  @IsOptional()
  @IsEnum(['recent', 'oldest', 'top'])
  sort?: DiscussionSort;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
