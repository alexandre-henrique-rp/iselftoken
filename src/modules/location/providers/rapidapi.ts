import { City, State, Country } from '../types';
import { getLocationEnv } from '../env';

// Cache simples em memória com TTL
const cache = new Map<string, { expires: number; data: unknown }>();
const TTL_MS = 1000 * 60 * 30; // 30 min

function setCache<T>(key: string, data: T) {
  cache.set(key, { expires: Date.now() + TTL_MS, data });
}
function getCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.data as T;
}

export class RapidApiLocationProvider {
  static async getCountries(): Promise<Country[]> {
    const cacheKey = 'countries:all';
    const cached = getCache<Country[]>(cacheKey);
    if (cached) return cached;

    const { key, base, host } = getLocationEnv();
    const url = `${base}/countries`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error('Falha ao buscar países');
    const json = await res.json();
    const list = json?.list || json?.data || json || [];
    const countries: Country[] = list.map((c: any) => ({
      code: String(c?.iso2 || c?.iso_2 || c?.code || c?.id || ''),
      name: String(c?.name || c?.country || c?.value || ''),
    })).filter((c: Country) => c.code && c.name);

    setCache(cacheKey, countries);
    return countries;
  }

  static async getStates(countryCode: string): Promise<State[]> {
    const cacheKey = `states:${countryCode}`;
    const cached = getCache<State[]>(cacheKey);
    if (cached) return cached;

    const { key, base, host } = getLocationEnv();

    const url = `${base}/states?country=${encodeURIComponent(countryCode)}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) throw new Error(`Falha ao buscar estados (${countryCode})`);
    const json = await res.json();
    // Ajuste conforme resposta da API (normalizando para {code,name})
    const states: State[] = (json?.list || json?.data || json?.states || json || []).map((s: any) => ({
      code: String(s?.state_code || s?.code || s?.iso2 || s?.iso_2 || s?.id || s?.name),
      name: String(s?.name || s?.state_name || s?.state || s?.value || ''),
    })).filter((s: State) => s.name);

    setCache(cacheKey, states);
    return states;
  }

  static async getCities(countryCode: string, stateCode: string): Promise<City[]> {
    const cacheKey = `cities:${countryCode}:${stateCode}`;
    const cached = getCache<City[]>(cacheKey);
    if (cached) return cached;

    const { key, base, host } = getLocationEnv();

    const url = `${base}/cities?country=${encodeURIComponent(countryCode)}&state=${encodeURIComponent(stateCode)}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) throw new Error(`Falha ao buscar cidades (${countryCode}-${stateCode})`);
    const json = await res.json();
    const cities: City[] = (json?.list || json?.data || json?.cities || json || []).map((c: any) => ({
      name: String(c?.name || c?.city_name || c?.city || c?.value || ''),
    })).filter((c: City) => c.name);

    setCache(cacheKey, cities);
    return cities;
  }
}
