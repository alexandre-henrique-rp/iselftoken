/**
 * Página de Register Premium Simplificada
 * Layout split-screen moderno sem campos de localização
 */

'use client';

import { useSearchParams } from 'next/navigation';
import RegisterForm from '@/components/auth/RegisterForm';
import AuthLayoutPremium from '@/components/auth/layout/AuthLayoutPremium';
import { FormData } from '@/components/auth/RegisterForm/types';
import { LocalStorageService } from '@/types/localStorage';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const planoParam = searchParams.get('plano') as 'investidor' | 'fundador' | 'afiliado' | null;

  // Handler para submissão do formulário (client-side)
  const handleRegisterSubmit = async (formData: FormData): Promise<{ success: boolean; url: string }> => {
    try {
      // Salvar dados no localStorage usando o serviço tipado
      const dadosParaSalvar = {
        ...formData,
        telefone: `+55${formData.telefone}`, // DDI fixo Brasil
        plano: planoParam || 'investidor' // Usar parâmetro da URL ou padrão
      };
      
      LocalStorageService.salvarRegistroPendente(dadosParaSalvar);
      
      // Simular processamento de 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { success: true, url: '/business/plans' };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Erro ao processar registro');
    }
  };

  return (
    <AuthLayoutPremium
      title="iSelfToken"
      backgroundImage="/image-05.jpg"
      showLoginLink={true}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-light text-white mb-2">
            Criar conta
          </h2>
        </div>
        
        <RegisterForm
          onSubmit={handleRegisterSubmit}
          loading={false}
        />
      </div>
    </AuthLayoutPremium>
  );
}