// Força renderização dinâmica para evitar problemas com cookies/sessão em SSR
export const dynamic = 'force-dynamic';

import { PerfilForm } from '@/components/perfil/perfil-form';
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
  console.log("🚀 ~ Perfil ~ perfil:", perfil)

  const role = perfil?.role;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header da Página com Avatar e Info */}
        <div className="mb-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
              {/* Avatar */}
              <div className="flex justify-center md:justify-start">
                <div className="relative">
                  <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-primary/20 bg-muted md:h-32 md:w-32">
                    {perfil?.avatar ? (
                      <img
                        src={perfil.avatar}
                        alt={perfil?.nome || 'Avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-blue/20">
                        <span className="text-3xl font-bold text-primary md:text-4xl">
                          {perfil?.nome?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Status Indicator */}
                  <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-card bg-green shadow-sm md:h-6 md:w-6" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    {perfil?.nome || 'Usuário'}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground md:text-base">
                    {perfil?.email}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  {perfil?.role && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {perfil.role.charAt(0).toUpperCase() + perfil.role.slice(1)}
                    </span>
                  )}
                  {perfil?.status && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-green/10 px-3 py-1.5 text-sm font-medium text-green">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {perfil.status}
                    </span>
                  )}
                </div>

                {message && (
                  <div className={`rounded-lg p-3 text-sm ${isSuccess ? 'bg-green/10 text-green' : 'bg-red-500/10 text-red-500'}`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}