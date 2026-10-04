import { Controller, Get, Header, HttpCode, Param } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ResponseEntity } from 'src/common/entities/response.entity';
import { SealCatalogItemDto, StartupSealDto } from './dto/seal.dto';
import { SealsService } from './seals.service';

const CATALOG_CACHE = 'public, max-age=600';
const STARTUP_CACHE = 'public, max-age=300';

@Controller('seals')
@ApiExtraModels(ResponseEntity, SealCatalogItemDto, StartupSealDto)
@ApiTags('Seals')
export class SealsController {
  constructor(private readonly service: SealsService) {}

  @Get()
  @HttpCode(200)
  @Header('Cache-Control', CATALOG_CACHE)
  @ApiOperation({
    summary: 'Catálogo público de selos',
    description:
      'Retorna todos os tipos de selos ativos disponíveis na plataforma.',
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
              items: { $ref: getSchemaPath(SealCatalogItemDto) },
            },
          },
        },
      ],
    },
  })
  async getCatalog() {
    return this.service.getCatalog();
  }

  @Get('startup/:id')
  @HttpCode(200)
  @Header('Cache-Control', STARTUP_CACHE)
  @ApiOperation({
    summary: 'Selos atribuídos a uma startup',
    description:
      'Retorna todos os selos ativos atribuídos à startup informada.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(StartupSealDto) },
            },
          },
        },
      ],
    },
  })
  async getByStartup(@Param('id') id: string) {
    return this.service.getByStartup(+id);
  }
}
