import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransparencyPostType } from '@prisma/client';

/**
 * DTO para criacao de post de transparencia.
 *
 * Validado via ValidationPipe global. Mensagens em PT-BR.
 *
 * Referencia: scripts/PRD_PAGINA_TRANSPARENCIA.md §5.3
 */
export class CreateTransparencyPostDto {
  @ApiProperty({
    description: 'Titulo do post (max 200 chars)',
    example: 'Relatorio Financeiro - Q3 2026',
    maxLength: 200,
  })
  @IsString()
  @MinLength(3, { message: 'Titulo deve ter no minimo 3 caracteres' })
  @MaxLength(200, { message: 'Titulo deve ter no maximo 200 caracteres' })
  title!: string;

  @ApiProperty({
    description:
      'Conteudo em markdown. Suporta headings, listas, links, bold, italic, code. SEM HTML cru.',
    example: '## Q3 2026\n\n- MRR: R$ 50k (+15% vs Q2)\n- Custos: R$ 30k',
  })
  @IsString()
  @MinLength(10, { message: 'Conteudo deve ter no minimo 10 caracteres' })
  content!: string;

  @ApiPropertyOptional({
    description: 'Tipo do post (usado para filtros)',
    enum: TransparencyPostType,
    default: TransparencyPostType.GENERAL,
  })
  @IsOptional()
  @IsEnum(TransparencyPostType, {
    message:
      'Tipo invalido. Use FINANCIAL_REPORT, PRODUCT_MILESTONE, CORPORATE_CHANGE ou GENERAL.',
  })
  type?: TransparencyPostType;

  @ApiPropertyOptional({
    description: 'Mes do periodo de referencia (1-12)',
    example: 9,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @ApiPropertyOptional({
    description: 'Ano do periodo de referencia',
    example: 2026,
    minimum: 2000,
    maximum: 2100,
  })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear?: number;

  @ApiPropertyOptional({
    description:
      'IDs de uploads ja existentes (do modulo /api/uploads) para anexar ao post',
    example: [42, 43],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  attachmentIds?: number[];

  /**
   * Hook para validacao cross-field: se periodMonth for fornecido,
   * periodYear tambem deve ser (e vice-versa).
   */
  // Validador custom seria melhor, mas como class-validator nao tem
  // cross-field nativo em DTOs sem decorator customizado, validamos no service.
  @ValidateNested()
  @Type(() => Object)
  _dummy?: unknown;
}
