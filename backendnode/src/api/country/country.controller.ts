import { Controller, Get, HttpCode, Query } from '@nestjs/common';
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
import { CountryService } from './country.service';
import {
  CityEntity,
  CountryEntity,
  StateEntity,
} from './entities/country.entity';

@Controller('country')
@ApiExtraModels(ResponseEntity, CountryEntity, StateEntity, CityEntity)
@ApiTags('Países')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get()
  // @UseGuards(AuthGuard)
  // @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Listar países, estados e cidades',
    description:
      'Lista países, estados ou cidades conforme os parâmetros enviados. Sem parâmetros retorna países; com country retorna estados; com country + states retorna cidades.',
  })
  @ApiQuery({ name: 'country', required: false, description: 'ID do país' })
  @ApiQuery({ name: 'states', required: false, description: 'ID do estado' })
  @ApiResponse({
    status: 200,
    description: 'Lista retornada com sucesso.',
    content: {
      'application/json': {
        schema: {
          allOf: [
            { $ref: getSchemaPath(ResponseEntity) },
            {
              properties: {
                data: {
                  oneOf: [
                    {
                      type: 'array',
                      items: { $ref: getSchemaPath(CountryEntity) },
                    },
                    {
                      type: 'array',
                      items: { $ref: getSchemaPath(StateEntity) },
                    },
                    {
                      type: 'array',
                      items: { $ref: getSchemaPath(CityEntity) },
                    },
                  ],
                },
              },
            },
          ],
        },
        examples: {
          countries: {
            summary: 'Lista de países',
            value: {
              error: false,
              message: 'Lista de países retornada com sucesso',
              codigo: 200,
              data: [
                {
                  id: 1,
                  name: 'Brasil',
                  native: 'Brasil',
                  iso2: 'BR',
                  iso3: 'BRA',
                  emoji: '🇧🇷',
                  currency: 'BRL',
                  currencyName: 'Real',
                  currencySymbol: 'R$',
                  phonecode: '55',
                  timezones: ['America/Sao_Paulo'],
                },
              ],
            },
          },
          states: {
            summary: 'Lista de estados',
            value: {
              error: false,
              message: 'Lista de estados retornada com sucesso',
              codigo: 200,
              data: [
                {
                  id: 35,
                  name: 'São Paulo',
                  countryCode: 'BR',
                  countryId: 1,
                },
              ],
            },
          },
          cities: {
            summary: 'Lista de cidades',
            value: {
              error: false,
              message: 'Lista de cidades retornada com sucesso',
              codigo: 200,
              data: [
                {
                  id: 3509502,
                  name: 'Campinas',
                  state_id: 35,
                  country_id: 1,
                },
              ],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 502,
    description: 'Erro na busca de países/estados/cidades.',
    type: ErrorEntity,
  })
  findAll(
    @Query('country') country: string = '',
    @Query('states') states: string = '',
  ) {
    return this.countryService.findAll(country, states);
  }
}
