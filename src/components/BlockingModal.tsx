'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function BlockingModal() {
  const router = useRouter();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/30 backdrop-blur-sm dark:bg-black/30">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-2xl dark:bg-gray-800">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Conteúdo Exclusivo</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Para ver o resumo completo e mais detalhes sobre esta oportunidade, por favor, faça login ou crie sua conta.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Button onClick={() => router.push('/login')}>Entrar</Button>
          <Button variant="outline" onClick={() => router.push('/register')}>
            Criar Conta
          </Button>
        </div>
      </div>
    </div>
  );
}
