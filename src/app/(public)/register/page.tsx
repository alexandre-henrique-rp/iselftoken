import RegisterFlow from '@/components/register/RegisterFlow';

const paisesLista = async () =>{
 try {
   const response = await fetch('http://localhost:3000/api/location/countries');
   const data = await response.json();
   return data;
 } catch (error) {
   console.error('Erro ao buscar paises:', error);
   return [];
 }
};

export default async function RegisterPage() {
  const paises = await paisesLista();
  return <RegisterFlow dataPaises={paises.data} error={paises.error} message={paises.message} />;
}
