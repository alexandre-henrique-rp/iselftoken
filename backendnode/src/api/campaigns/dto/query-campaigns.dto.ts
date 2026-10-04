import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum CampaignStatusFilter {
  OPEN = 'OPEN',
  FUNDED = 'FUNDED',
  PAID_OUT = 'PAID_OUT',
}

export class QueryCampaignsDto {
  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Limite por página', default: 25 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Busca por título' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtro por status',
    enum: CampaignStatusFilter,
  })
  @IsOptional()
  @IsEnum(CampaignStatusFilter)
  status?: CampaignStatusFilter;
}
