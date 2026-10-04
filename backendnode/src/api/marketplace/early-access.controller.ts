import { Controller, Get, Header, HttpCode, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorEntity } from 'src/common/dto/error.entity';
import { ResponseEntity } from 'src/common/entities/response.entity';
import { EarlyAccessService } from './early-access.service';
import { EarlyAccessRankingEntity } from './entities/early-access-ranking.entity';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceCardDto } from './dto/marketplace-card.dto';

const PUBLIC_CACHE = 'public, max-age=300';

@Controller('marketplace/early-access')
@ApiExtraModels(ResponseEntity, EarlyAccessRankingEntity, MarketplaceCardDto)
@ApiTags('Marketplace - Early Access')
export class EarlyAccessController {
  constructor(
    private readonly earlyAccessService: EarlyAccessService,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  @Get('ranking')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ranking de Early Access',
    description:
      'Retorna o ranking de startups ordenado por número de reservas Early Access. ' +
      'Útil para exibir na landing page as startups mais populares.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número máximo de itens no ranking (padrão: 10)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Ranking retornado com sucesso.',
    content: {
      'application/json': {
        schema: {
          allOf: [
            { $ref: getSchemaPath(ResponseEntity) },
            {
              properties: {
                data: { $ref: getSchemaPath(EarlyAccessRankingEntity) },
              },
            },
          ],
        },
        examples: {
          success: {
            summary: 'Ranking de Early Access',
            value: {
              error: false,
              message: 'Ranking de Early Access retornado com sucesso',
              codigo: 200,
              data: {
                ranking: [
                  {
                    position: 1,
                    startupId: 'abc-123',
                    startupName: 'Startup XYZ',
                    category: 'Fintech',
                    reservations: 127,
                    logoUrl: 'https://storage.example.com/logo.png',
                  },
                ],
                totalReservations: 1543,
                lastUpdated: '2026-05-02T12:00:00Z',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno ao buscar ranking.',
    type: ErrorEntity,
  })
  getRanking(@Query('limit') limit?: number) {
    const parsedLimit = limit ? Math.min(Math.max(+limit, 1), 50) : 10;
    return this.earlyAccessService.getRanking(parsedLimit);
  }

  @Get('startups')
  @HttpCode(200)
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Startups de Acesso Antecipado',
    description:
      'Retorna startups com captação ativa (OPEN) iniciada nos últimos 20 dias, ' +
      'ordenadas por número de selos ativos DESC, createdAt DESC. Max 15 itens. ' +
      'Cada item inclui campo `rank` incremental (1..N). Regra S0-T02 (marketplace.md).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de startups retornada com sucesso.',
    content: {
      'application/json': {
        schema: {
          allOf: [
            { $ref: getSchemaPath(ResponseEntity) },
            {
              properties: {
                data: {
                  type: 'array',
                  items: {
                    allOf: [
                      { $ref: getSchemaPath(MarketplaceCardDto) },
                      {
                        properties: {
                          rank: { type: 'number', example: 1 },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno ao buscar startups.',
    type: ErrorEntity,
  })
  getStartups() {
    return this.marketplaceService.getEarlyAccessStartups();
  }
}
