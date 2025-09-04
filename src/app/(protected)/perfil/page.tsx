// Força renderização dinâmica para evitar problemas com cookies/sessão em SSR
export const dynamic = 'force-dynamic';

import { TrText } from '@/components/tr-text';
import { PerfilResumo } from '@/components/business/perfil/perfil-resumo';
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
  genero?: string;
  dataNascimento?: string;
  startups?: StartupMin[];
  [key: string]: unknown;
};

export default async function Perfil() {
  const session = await GetSessionServer()
  const res: ApiResponse<PerfilData> = session && await request(session);
  console.log("🚀 ~ Perfil ~ res:", res)
  const perfil: PerfilData | undefined = res?.data as PerfilData | undefined;

  const role = (perfil?.role ?? '').toString();
  const isFundador = role === 'fundador';
  const startups = Array.isArray(perfil?.startups) ? (perfil!.startups as StartupMin[]) : [];

  return (
    <section className="container mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          <TrText k="perfil.title" />
        </h1>
        {res?.message && (
          <p className="text-sm text-zinc-500">{res.message}</p>
        )}
      </header>

      {/* Resumo do usuário (componentizado) */}
      <PerfilResumo
        nome={perfil?.nome}
        email={perfil?.email}
        role={role}
        cidade={perfil?.cidade}
        uf={perfil?.uf}
        pais={perfil?.pais}
        telefone={perfil?.telefone}
      />

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
          telefone: perfil?.telefone,
          cidade: perfil?.cidade,
          uf: perfil?.uf,
          pais: perfil?.pais,
        }}
      />
    </section>
  );
}