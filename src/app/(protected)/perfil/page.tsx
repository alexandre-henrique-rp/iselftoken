// Força renderização dinâmica para evitar problemas com cookies/sessão em SSR
export const dynamic = 'force-dynamic';

import { PerfilForm } from '@/components/business/perfil/perfil-form';
import { GetSessionServer } from '@/context/auth';

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
  avatar?: string;
  tipo_documento?: string;
  reg_documento?: string;
  documento?: string;
  naturalidade?: string;
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
  const res = await request(Number(session?.user?.id || 0));

  const isSuccess = res?.status === 'success';
  const message = !isSuccess && 'Não foi possível carregar o perfil.';
  const perfil: PerfilData | undefined = res?.data

  const role = perfil?.role;

  return (
    <>
    <section className="container mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Perfil
        </h1>
        {message && (
          <p className={`mt-1 text-sm ${isSuccess ? 'text-zinc-500' : 'text-red-600'}`}>{message}</p>
        )}
      </header>
  
      {/* Formulário de edição do perfil (client-side: RHF + Zod) */}
      <PerfilForm
        perfil={{
          id: perfil?.id,
          nome: perfil?.nome,
          email: perfil?.email,
          role: role as "fundador" | "afiliado" | "admin" | "investidor" | undefined,
          telefone: perfil?.telefone,
          cep: perfil?.cep,
          endereco: perfil?.endereco,
          numero: perfil?.numero,
          bairro: perfil?.bairro,
          cidade: perfil?.cidade,
          uf: perfil?.uf,
          pais: perfil?.pais,
          dt_nascimento: perfil?.dataNascimento,
          bio_facial: perfil?.bio_facial,
          avatar: perfil?.avatar,
          tipo_documento: perfil?.tipo_documento,
          reg_documento: perfil?.reg_documento,
          documento: perfil?.documento,
          termos: perfil?.termos,
          status: perfil?.status,
          startups: perfil?.startups,
          indicados: perfil?.indicados,
          fundador: perfil?.fundador,
          afiliado: perfil?.afiliado,
          persent_ganho: perfil?.persent_ganho,
        }}
      />
    </section>
    </>
  );
}