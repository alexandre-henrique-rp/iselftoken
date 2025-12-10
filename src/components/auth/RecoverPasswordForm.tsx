'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import generateA2fCode from '@/lib/a2f';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

/**
 * Schema de validação para recuperação de senha
 */
const recoverPasswordSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
});

type RecoverPasswordInputs = z.infer<typeof recoverPasswordSchema>;

/**
 * Formulário de recuperação de senha
 * Permite ao usuário solicitar um link de redefinição de senha
 */
export default function RecoverPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoverPasswordInputs>({
    resolver: zodResolver(recoverPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: RecoverPasswordInputs) {
    setIsLoading(true);

    try {
      console.log('Solicitação de recuperação de senha para:', data.email);
      // Simulação de delay
      const codigo = generateA2fCode();
      const api = await fetch(`/api/reload-password`, {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          codigo: codigo,
        }),
      });

      const resp = await api.json();
      if (!api.ok) {
        throw new Error('Erro ao solicitar recuperação de senha');
      }

      if (resp.status !== 'success') {
        throw new Error(resp.message);
      }

      localStorage.setItem('userId', resp.id);

      toast.success('Link de recuperação enviado! Verifique seu email.');

      // Redirecionar após 3 segundos
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      toast.error('Erro ao solicitar recuperação de senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Descrição */}
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-gray-400">
          Informe seu e-mail cadastrado para receber um link de redefinição de
          senha.
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300">
            Email
          </Label>
          <div className="relative">
            <Mail
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500"
              size={18}
            />
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className="border-gray-800 bg-gray-900 pl-10 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
              disabled={isLoading}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-400">{errors.email.message}</p>
          )}
        </div>

        {/* Botão de envio */}
        <Button
          type="submit"
          className="w-full bg-purple-600 text-white transition-colors duration-200 hover:bg-purple-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Enviando...
            </span>
          ) : (
            'Enviar link de recuperação'
          )}
        </Button>
      </form>

      {/* Link de volta para login */}
      <div className="border-t border-gray-800 pt-4">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-gray-400 transition-colors duration-200 hover:text-purple-400"
        >
          <ArrowLeft size={16} />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
