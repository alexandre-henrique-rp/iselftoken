export type Country = { code: string; name: string };
export type State = { code: string; name: string };
export type City = { name: string };

export interface LocationService {
  getCountries(): Promise<Country[]>;
  getStates(countryCode: string): Promise<State[]>;
  getCities(countryCode: string, stateCode: string): Promise<City[]>;
}
