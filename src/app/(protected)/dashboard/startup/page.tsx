'use client';

import StartupBasicInfoForm from '@/components/forms/startup-steps/StartupBasicInfoForm';
import StartupCampaignForm from '@/components/forms/startup-steps/StartupCampaignForm';
import StartupWizard from '@/components/forms/startup-steps/StartupWizard';
import type { StartupFormData } from '@/types/startup';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NovaStartupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Estado acumulativo do formulário
  const [formData, setFormData] = useState<Partial<StartupFormData>>({});

  // Avança para o passo 2 salvando os dados do passo 1
  const handleNextStep = (dataStep1: StartupFormData) => {
    setFormData((prev) => ({ ...prev, ...dataStep1 }));
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Volta para o passo 1
  const handleBackStep = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submissão final
  const handleFinalSubmit = async (finalData: StartupFormData) => {
    setIsSubmitting(true);

    try {
      // Mescla com o estado atual para garantir
      const payload = { ...formData, ...finalData };

      console.log('📊 Payload Final da Startup:', {
        ...payload,
        timestamp: new Date().toISOString(),
      });

      // Simulação de API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Aqui entraria a chamada real:
      // await startupService.create(payload);

      // Redirecionamento
      // router.push('/dashboard/sucesso'); // Exemplo
      alert('Startup cadastrada com sucesso! (Simulação)');
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ Erro ao cadastrar startup:', error);
      alert('Erro ao cadastrar. Verifique o console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      confirm(
        'Tem certeza que deseja cancelar? Os dados preenchidos serão perdidos.',
      )
    ) {
      router.back();
    }
  };

  return (
    <div className="layout-clean bg-background text-foreground min-h-screen transition-colors duration-300">
      <div className="container-elegant px-4 py-8 md:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Cabeçalho */}
          <section className="space-y-2 text-center md:text-left">
            <h1 className="font-display flex items-center justify-center gap-3 text-3xl font-bold tracking-tight md:justify-start">
              <span className="text-4xl">🚀</span>
              Nova Startup
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Cadastre sua startup e prepare sua rodada de captação em poucos
              passos.
            </p>
          </section>

          {/* Wizard Visual */}
          <StartupWizard currentStep={currentStep} />

          {/* Conteúdo Dinâmico dos Passos */}
          <div className="transition-all duration-500 ease-in-out">
            {currentStep === 1 ? (
              <StartupBasicInfoForm
                initialData={formData}
                onNext={handleNextStep}
                onCancel={handleCancel}
              />
            ) : (
              <StartupCampaignForm
                initialData={formData}
                onBack={handleBackStep}
                onSubmit={handleFinalSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
