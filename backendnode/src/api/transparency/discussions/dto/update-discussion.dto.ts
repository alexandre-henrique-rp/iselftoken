import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { DiscussionCategory } from '@prisma/client';

/**
 * DTO de atualizacao parcial de thread de Discussao.
 *
 * Edit limitada a 24h para autor (validado no service).
 * ADMIN pode editar sem restricao.
 * Todos campos sao opcionais (PATCH = update parcial).
 */
export class UpdateDiscussionDto {
  @ApiPropertyOptional({ minLength: 10, maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(10, 200)
  title?: string;

  @ApiPropertyOptional({ minLength: 20, maxLength: 10000 })
  @IsOptional()
  @IsString()
  @Length(20, 10000)
  content?: string;

  @ApiPropertyOptional({ enum: DiscussionCategory })
  @IsOptional()
  @IsEnum(DiscussionCategory)
  category?: DiscussionCategory;

  @ApiPropertyOptional({ description: 'Opt-in de anonimato editavel.' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
