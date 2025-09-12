// Força renderização dinâmica para evitar problemas com cookies/sessão em SSR
export const dynamic = 'force-dynamic';

import { TabelaStartupsDoUsuario } from '@/components/business/perfil/tabela-startups-do-usuario';
import { PerfilForm } from '@/components/business/perfil/perfil-form';
import { GetSessionServer } from '@/context/auth';

const request = async (session: SessionNext.Session) => {
  let URL = ''
  if (session.user.role === 'investidor') {
    URL = `${process.env.NEXTAUTH_API_URL}/investidor/${session.user.id}`;
  } else if (session.user.role === 'fundador') {
    URL = `${process.env.NEXTAUTH_API_URL}/startup/${session.user.id}`;
  } else if (session.user.role === 'afiliado') {
    URL = `${process.env.NEXTAUTH_API_URL}/afiliado/${session.user.id}`;
  }

  const user = await fetch(
    `${URL}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${session.refreshToken}`,
      },
    },
  );
  const userData = await user.json();
  return userData;
}

type ApiResponse<T = unknown> = {
  status?: string;
  message?: string;
  data?: T;
  error?: string;
};

type StartupMin = {
  id: string | number;
  fantasia?: string;
  cnpj?: string;
};

type PerfilData = {
  id?: string | number;
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
  // Campos adicionais esperados pelo PerfilForm
  indicados?: unknown[];
  fundador?: boolean;
  afiliado?: boolean;
  persent_ganho?: number;
  [key: string]: unknown;
};

export default async function Perfil() {
  const session = await GetSessionServer();

  let res: ApiResponse<PerfilData> | undefined;
  try {
    res = session ? await request(session) : undefined;
  } catch (error) {
    res = { status: 'error', message: (error as Error).message };
  }

  const isSuccess = res?.status === 'success';
  const message = res?.message ?? (isSuccess ? undefined : 'Não foi possível carregar o perfil.');
  const perfil: PerfilData | undefined = isSuccess ? (res!.data as PerfilData) : undefined;

  const role = (perfil?.role ?? '').toString();
  const isFundador = role === 'fundador';
  const startups = Array.isArray(perfil?.startups) ? (perfil?.startups as StartupMin[]) : [];

  return (
    <section className="container mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Perfil
        </h1>
        {message && (
          <p className={`mt-1 text-sm ${isSuccess ? 'text-zinc-500' : 'text-red-600'}`}>{message}</p>
        )}
      </header>

      {/* Tabela de Startups apenas para fundador, se existir estrutura */}
      {isFundador && (
        <TabelaStartupsDoUsuario startups={startups} disabledActions />
      )}

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
  );
}