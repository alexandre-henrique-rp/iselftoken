import { HttpException, Injectable } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CountryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(country: string, states: string) {
    try {
      // P2.16 — `?country=Brasil` (string nome) ou ID invalido caia em NaN
      // e estourava 500. Validamos o parse: se nao for numero, retornamos
      // lista vazia (200) em vez de quebrar.
      const countryId = country ? parseInt(country, 10) : NaN;
      const statesId = states ? parseInt(states, 10) : NaN;
      const hasCountry = Number.isFinite(countryId);
      const hasStates = Number.isFinite(statesId);

      const api =
        hasCountry && hasStates
          ? await this.getCity(countryId, statesId)
          : hasCountry && !hasStates
            ? await this.getStates(countryId)
            : await this.getCountry();

      if (!api) throw new Error('Nenhum dado encontrado');

      return ResponseDto.success(
        hasCountry && hasStates
          ? 'Lista de cidades retornada com sucesso'
          : hasCountry
            ? 'Lista de estados retornada com sucesso'
            : 'Lista de países retornada com sucesso',
        200,
        api,
      );
    } catch (error) {
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Erro na busca',
          error.status || 500,
          error,
        ),
        error.status || 500,
      );
    }
  }

  //************************************
  //**   Funções de busca de dados    **
  //************************************

  async getCountry() {
    try {
      return await this.prisma.country.findMany({
        select: {
          id: true,
          name: true,
          native: true,
          iso2: true,
          iso3: true,
          emoji: true,
          currency: true,
          currency_name: true,
          currency_symbol: true,
          phonecode: true,
          timezones: true,
        },
      });
    } catch (error) {
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Erro na busca de pais',
          error.status || 500,
          error,
        ),
        error.status || 500,
      );
    }
  }

  async getStates(country: number) {
    try {
      return await this.prisma.state.findMany({
        where: {
          country_id: country,
        },
        select: {
          id: true,
          name: true,
          iso2: true,
          latitude: true,
          longitude: true,
          country_code: true,
          country_id: true,
        },
      });
    } catch (error) {
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Erro na busca de estados',
          error.status || 500,
          error,
        ),
        error.status || 500,
      );
    }
  }

  async getCity(country: number, state: number) {
    try {
      return await this.prisma.city.findMany({
        where: {
          country_id: country,
          state_id: state,
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          state_id: true,
          country_id: true,
        },
      });
    } catch (error) {
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Erro na busca de cidades',
          error.status || 500,
          error,
        ),
        error.status || 500,
      );
    }
  }
}
