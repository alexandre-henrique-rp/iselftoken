export const getLocationEnv = () => {
  const key = process.env.RAPIDAPI_KEY;
  const base = process.env.COUNTRIES_API_BASE || 'https://countries-states-and-cities.p.rapidapi.com';
  const host = process.env.COUNTRIES_API_HOST || 'countries-states-and-cities.p.rapidapi.com';

  if (!key) {
    throw new Error('RAPIDAPI_KEY não configurado. Adicione RAPIDAPI_KEY no seu .env.local');
  }

  return { key, base, host };
};
