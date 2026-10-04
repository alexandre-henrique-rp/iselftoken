import { Controller, Get, Header, HttpCode } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ResponseEntity } from 'src/common/entities/response.entity';
import { CuratedPickDto } from './dto/curated-pick.dto';
import { MarketplaceCardDto } from './dto/marketplace-card.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace/curated-picks')
@ApiExtraModels(ResponseEntity, CuratedPickDto, MarketplaceCardDto)
@ApiTags('Marketplace - Curated Picks')
export class CuratedPicksController {
  constructor(private readonly service: MarketplaceService) {}

  @Get()
  @HttpCode(200)
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({
    summary: 'Curadoria iSelfToken (Picks da Semana)',
    description:
      'Top 3 picks ativos ordenados por publishedAt desc. Cada item ' +
      'inclui o quote do curador e a startup hidratada como MarketplaceCardDto.',
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
              items: { $ref: getSchemaPath(CuratedPickDto) },
            },
          },
        },
      ],
    },
  })
  async list() {
    return this.service.getCuratedPicks();
  }
}
