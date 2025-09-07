import RegisterFlow from '@/components/register/RegisterFlow';

const paisesLista = async () => {
  try {
    const baseUrl = `${process.env.NEXTAUTH_API_URL}/countries`;
    const response = await fetch(`${baseUrl}`);
    
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
