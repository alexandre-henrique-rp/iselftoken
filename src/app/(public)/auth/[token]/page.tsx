/**
 * Página de Autenticação por Token Premium
 * Layout split-screen moderno seguindo padrões iSelfToken
 */

import A2FPageClient from '@/components/auth/A2FPageClient';
import AuthLayoutPremium from '@/components/auth/layout/AuthLayoutPremium';

interface AuthParams {
  params: Promise<{
    token: string;
  }>;
}

export default async function A2FPage({ params }: AuthParams) {
  const resolvedParams = await params;
  
  return (
    <AuthLayoutPremium
      title="iSelfToken"
      backgroundImage="/image-05.jpg"
      showLoginLink={false}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-light text-white mb-2">
            Verificação em dois fatores
          </h2>
          <p className="text-sm text-gray-400">
            Informe o código de 6 dígitos enviado para seu e-mail
          </p>
        </div>
        
        <A2FPageClient token={resolvedParams.token} />
      </div>
    </AuthLayoutPremium>
  );
}