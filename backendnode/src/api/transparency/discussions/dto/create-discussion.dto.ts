import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { DiscussionCategory } from '@prisma/client';

/**
 * DTO de criacao de thread de Discussao da Transparencia.
 *
 * Validacao cross-field:
 * - title 10..200 chars
 * - content 20..10000 chars
 * - category obrigatoria (default GERAL no service se omitida)
 * - isAnonymous opt-in
 *
 * Referencia: CASE.md §[Transparencia] - Discussao e Relatorio Vigente
 */
export class CreateDiscussionDto {
  @ApiProperty({
    minLength: 10,
    maxLength: 200,
    description: 'Titulo da thread (10..200 chars).',
  })
  @IsString()
  @Length(10, 200)
  title!: string;

  @ApiProperty({
    minLength: 20,
    maxLength: 10000,
    description: 'Conteudo da thread em markdown sanitizado (20..10000 chars).',
  })
  @IsString()
  @Length(20, 10000)
  content!: string;

  @ApiPropertyOptional({
    enum: DiscussionCategory,
    description: 'Taxonomia da discussao. Default GERAL.',
  })
  @IsOptional()
  @IsEnum(DiscussionCategory)
  category?: DiscussionCategory;

  @ApiPropertyOptional({
    default: false,
    description:
      'Opt-in de anonimato. Quando true, exibe apenas "PrimeiroNome U.".',
  })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
