import RegisterFlow from '@/components/register/RegisterFlow';

const paisesLista = async () => {
  try {
    // Durante o build, usar dados mock em vez de fetch
    if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_API_URL) {
      return {
        error: false,
        message: 'Dados mock para build',
        data: [
          {
            id: 1,
            name: 'Brasil',
            native: 'Brasil',
            iso3: 'BRA',
            phone_code: '+55',
            emoji: '🇧🇷'
          }
        ]
      };
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/location/countries`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar paises:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Erro ao carregar países',
      data: []
    };
  }
};

export default async function RegisterPage() {
  const paises = await paisesLista();
  return <RegisterFlow dataPaises={paises.data || []} error={paises.error || false} message={paises.message || ''} />;
}
