import countries from '@/data/location/countries.json';
import { City, Country, State, LocationService } from './types';
import { RapidApiLocationProvider } from './providers/rapidapi';

/**
 * Serviço unificado de localização.
 * - Países: base interna (JSON) para máxima performance.
 * - Estados/Cidades: RapidAPI (countries-states-and-cities) com cache em memória.
 */
export class LocationServiceImpl implements LocationService {
  async getCountries(): Promise<Country[]> {
    try {
      const list = await RapidApiLocationProvider.getCountries();
      // Se a API retornar vazio por algum motivo, usa base local
      return (list?.length ? list : (countries as Country[]));
    } catch {
      // Fallback total para base interna
      return countries as Country[];
    }
  }

  async getStates(countryCode: string): Promise<State[]> {
    return RapidApiLocationProvider.getStates(countryCode);
  }

  async getCities(countryCode: string, stateCode: string): Promise<City[]> {
    return RapidApiLocationProvider.getCities(countryCode, stateCode);
  }
}

export const locationService = new LocationServiceImpl();
