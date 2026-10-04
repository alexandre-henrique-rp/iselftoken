import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Query DTO para listagem de campanhas com split financeiro.
 *
 * Filtros opcionais:
 *  - from / to (ISO date string): filtra por `Investment.allocatedAt`
 *  - status: campanha (FUNDED | PAID_OUT | CLOSED | OPEN)
 *  - search: nome/slug da startup
 *  - page / pageSize: paginação (default 1/20)
 *
 * Paginação alinhada com PaginationQueryDto (admin.dto.ts) — mesmo shape
 * externo (`page` em vez de `pagina`) usado em admin-financeiro.controller.
 */
export class FinanceiroSplitQueryDto {
  @ApiProperty({
    required: false,
    description: 'Data inicial (ISO 8601, filtra Investment.allocatedAt)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({
    required: false,
    description: 'Data final (ISO 8601, filtra Investment.allocatedAt)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({
    required: false,
    description: 'Status da campanha',
    enum: ['OPEN', 'CLOSED', 'FUNDED', 'PAID_OUT'],
    example: 'FUNDED',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Busca textual (nome ou slug da startup)',
    example: 'Acme',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Número da página',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Itens por página',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
