import { ApiProperty } from '@nestjs/swagger';

/**
 * @name CountryEntity
 * @description Entidade de país retornada pela API.
 */
export class CountryEntity {
  @ApiProperty({ description: 'Identificador do país', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome do país', example: 'Brasil' })
  name: string;

  @ApiProperty({ description: 'Nome nativo do país', example: 'Brasil' })
  native: string;

  @ApiProperty({ description: 'ISO2 do país', example: 'BR' })
  iso2: string;

  @ApiProperty({ description: 'ISO3 do país', example: 'BRA' })
  iso3: string;

  @ApiProperty({ description: 'Emoji do país', example: '🇧🇷' })
  emoji: string;

  @ApiProperty({ description: 'Código da moeda', example: 'BRL' })
  currency: string;

  @ApiProperty({ description: 'Nome da moeda', example: 'Real' })
  currencyName: string;

  @ApiProperty({ description: 'Código da moeda', example: 'R$' })
  currencySymbol: string;

  @ApiProperty({ description: 'Código do país', example: '55' })
  phonecode: string;

  @ApiProperty({
    description: 'Timezones do país',
    example: 'America/Sao_Paulo',
  })
  timezones: string[];
}

/**
 * @name StateEntity
 * @description Entidade de estado retornada pela API.
 */
export class StateEntity {
  @ApiProperty({ description: 'Identificador do estado', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome do estado', example: 'São Paulo' })
  name: string;

  @ApiProperty({ description: 'ISO2 do estado', example: 'SP' })
  iso2: string;

  @ApiProperty({ description: 'Latitude do estado', example: '-23.55052' })
  latitude: string;

  @ApiProperty({ description: 'Longitude do estado', example: '-46.6333' })
  longitude: string;

  @ApiProperty({ description: 'Código do país', example: 'BR' })
  countryCode: string;

  @ApiProperty({ description: 'Identificador do país', example: 1 })
  countryId: number;
}

/**
 * @name CityEntity
 * @description Entidade de cidade retornada pela API.
 */
export class CityEntity {
  @ApiProperty({ description: 'Identificador da cidade', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome da cidade', example: 'Campinas' })
  name: string;

  @ApiProperty({ description: 'Latitude do estado', example: '-23.55052' })
  latitude: string;

  @ApiProperty({ description: 'Longitude do estado', example: '-46.6333' })
  longitude: string;

  @ApiProperty({ description: 'Identificador do estado', example: 35 })
  state_id: number;

  @ApiProperty({ description: 'Identificador do país', example: 1 })
  country_id: number;
}
