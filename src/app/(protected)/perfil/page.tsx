export const dynamic = 'force-dynamic';
import { GetSessionServer } from '@/context/auth';
import PerfilForm from '@/components/perfil/PerfilForm';

const request = async (id: string | number) => {
  const user = await fetch(
    `http://localhost:3000/api/perfil/${id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  );
  const userData = await user.json();
  console.log("🚀 ~ request ~ userData:", userData)
  return userData;
}

type StartupMin = {
  id: number;
  fantasia?: string;
  cnpj?: string;
};

type PerfilData = {
  id?: number;
  nome?: string;
  email?: string;
  role?: 'investidor' | 'fundador' | 'afiliado' | string;
  cpf?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
  numero?: string;
  complemento?: string;
  genero?: string;
  dataNascimento?: string;
  bio_facial?: string;
  bio_facial_url?: string;
  avatar?: string;
  tipo_documento?: string;
  reg_documento?: string;
  documento?: string;
  documento_url?: string;
  comprovante_residencia?: string;
  comprovante_residencia_url?: string;
  data_emissao?: string;
  estadoCivil?: string;
  profissao?: string;
  termos?: boolean;
  status?: string;
  startups?: StartupMin[];
  indicados?: unknown[];
  fundador?: boolean;
  afiliado?: boolean;
  persent_ganho?: number;
  [key: string]: unknown;
};

export default async function Perfil() {
  const session = await GetSessionServer();
  
  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Usuário não autenticado</p>
      </div>
    );
  }

  const res = await request(Number(session.user.id));
  const perfil: PerfilData | undefined = res?.data;

  return <PerfilForm initialPerfil={perfil} />;
}

// Export types for Client Component
export type { PerfilData };