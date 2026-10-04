import { Controller, Get, Header, HttpCode, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ResponseEntity } from 'src/common/entities/response.entity';
import { MarketplaceCardDto } from './dto/marketplace-card.dto';
import { MarketplaceService } from './marketplace.service';

const PUBLIC_CACHE = 'public, max-age=300';

@Controller('marketplace')
@ApiExtraModels(ResponseEntity, MarketplaceCardDto)
@ApiTags('Marketplace')
export class MarketplaceController {
  constructor(private readonly service: MarketplaceService) {}

  @Get('picks-of-week')
  @HttpCode(200)
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Picks da Semana',
    description:
      'Retorna startups com captação ativa (OPEN) iniciada nos últimos 7 dias, ' +
      'ordenadas pela captação mais antiga primeiro. Max 15 itens. ' +
      'Regra S0-T03 (marketplace.md). Diferente de /marketplace/curated-picks ' +
      '(curadoria humana fixa).',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(MarketplaceCardDto) },
            },
          },
        },
      ],
    },
  })
  async getPicksOfWeek() {
    return this.service.getPicksOfWeek();
  }

  @Get('featured')
  @HttpCode(200)
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Startups em Destaque',
    description:
      'Retorna até N startups elegíveis ordenadas por score (manual) DESC e createdAt DESC. ' +
      'N é configurável em FinanceConfig[marketplace.featured_limit] (default 10).',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(MarketplaceCardDto) },
            },
          },
        },
      ],
    },
  })
  async getFeatured() {
    return this.service.getFeatured();
  }

  @Get('recently-added')
  @HttpCode(200)
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Startups Recém-Adicionadas',
    description:
      'Retorna até M startups elegíveis mais recentes (createdAt DESC), excluindo IDs já presentes em /featured. ' +
      'M é configurável em FinanceConfig[marketplace.recent_limit] (default 5).',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(MarketplaceCardDto) },
            },
          },
        },
      ],
    },
  })
  async getRecentlyAdded() {
    return this.service.getRecentlyAdded();
  }

  @Get('opportunities')
  @HttpCode(200)
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Oportunidades de Investimento',
    description:
      'Retorna todas as startups elegíveis − (Featured ∪ Recently-added), ' +
      'opcionalmente filtradas por categoria.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: [
      'All',
      'FINTECH',
      'AI',
      'SAAS',
      'HEALTHTECH',
      'EDTECH',
      'BIOTECH',
      'OTHER',
    ],
    description: 'Filtro de categoria (default: All)',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(MarketplaceCardDto) },
            },
          },
        },
      ],
    },
  })
  async getOpportunities(@Query('category') category?: string) {
    return this.service.getOpportunities(category);
  }

  @Get('sector-stats')
  @HttpCode(200)
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Estatísticas de Startups por Setor',
    description:
      'Retorna a contagem de startups elegíveis (APPROVED com campanha OPEN) ' +
      'por categoria, ordenada por count desc. Usado para o grid de categorias na home.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  group: { type: 'string', example: 'fintech' },
                  name: { type: 'string', example: 'FinTech' },
                  count: { type: 'number', example: 12 },
                },
              },
            },
          },
        },
      ],
    },
  })
  async getSectorStats() {
    return this.service.getSectorStats();
  }

  @Get('all')
  @HttpCode(200)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({
    summary: 'Catálogo paginado de startups',
    description:
      'Retorna a lista paginada de startups elegíveis (APPROVED com campanha OPEN). ' +
      'Suporta busca, filtro de setor, ordenação e janela temporal (velocity).',
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'sector', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['trending', 'newest', 'raised', 'valuation', 'deadline'],
  })
  @ApiQuery({
    name: 'velocity',
    required: false,
    enum: ['hot24h', 'week', 'today', 'ending'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: getSchemaPath(MarketplaceCardDto) },
                },
                total: { type: 'number' },
                page: { type: 'number' },
                pageSize: { type: 'number' },
                hasMore: { type: 'boolean' },
              },
            },
          },
        },
      ],
    },
  })
  async getAll(
    @Query('q') q?: string,
    @Query('sector') sector?: string,
    @Query('sort') sort?: string,
    @Query('velocity') velocity?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getAll({
      q,
      sector,
      sort,
      velocity,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
