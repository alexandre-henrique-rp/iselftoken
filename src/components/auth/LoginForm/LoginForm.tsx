'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import InputPremium from '../ui/InputPremium';
import ButtonPremium from '../ui/ButtonPremium';
import generateA2fCode from '@/lib/a2f';

interface LoginFormData {
  email: string;
  senha: string;
}

const LoginForm = () => {
  const router = useRouter();
  const codigo = generateA2fCode();

  // Estado do formulário
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    senha: '',
  });

  // Estado de loading
  const [loading, setLoading] = useState(false);

  // Handler para mudança nos campos
  const handleInputChange = useCallback(
    (field: keyof LoginFormData, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  useEffect(() => {
    (async () => {
      localStorage.removeItem('method');
      localStorage.removeItem('redirect');
      localStorage.removeItem('formData');
      localStorage.removeItem('codigo');
    })();
  }, []);

  // Handler específico para inputs
  const handleTextInputChange = useCallback(
    (field: keyof LoginFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        handleInputChange(field, e.target.value);
      },
    [handleInputChange],
  );

  // Submissão do formulário
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validação básica
      if (!formData.email || !formData.senha) {
        toast('Preencha todos os campos', {
          description: 'Email e senha são obrigatórios',
        });
        return;
      }

      // Validação de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast('Email inválido', {
          description: 'Digite um email válido',
        });
        return;
      }

      try {
        setLoading(true);
        // Comportamento padrão
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.senha,
          }),
        });

        const result = await response.json();
        console.log('🚀 ~ LoginForm ~ result:', result);

        if (response.ok) {
          toast('Login realizado com sucesso!', {
            description: 'Redirecionando para o dashboard',
          });
          const user = result.data;
          localStorage.setItem('method', 'login');
          localStorage.setItem('redirect', '/home');
          localStorage.setItem('formData', JSON.stringify(user));
          localStorage.setItem('codigo', codigo);
          await sendEmail(user.email, user.name, codigo);

          router.push('/auth');
        } else {
          throw new Error(result.message || 'Erro ao fazer login');
        }
      } catch (error) {
        toast('Erro no login', {
          description:
            error instanceof Error ? error.message : 'Tente novamente',
        });
      } finally {
        setLoading(false);
      }
    },
    [codigo, formData.email, formData.senha, router],
  );

  const sendEmail = async (email: string, nome: string, codigo: string) => {
    const emailSend = await fetch('/api/newcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: email,
        nome: nome,
        codigo: codigo,
      }),
    });

    const result = await emailSend.json();

    if (!emailSend.ok) {
      toast('Erro ao enviar email', {
        description: result.message,
      });
      return;
    }

    toast('Email enviado com sucesso', {
      description: 'Verifique seu email',
    });
  };
  // Verificar se formulário está completo
  const isFormComplete = formData.email && formData.senha;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campo Email */}
      <InputPremium
        id="email"
        label="E-mail"
        type="email"
        value={formData.email}
        onChange={handleTextInputChange('email')}
        placeholder="seu@email.com"
        required
        autoComplete="email"
      />

      {/* Campo Senha */}
      <div className="space-y-2">
        <div className="flex items-center justify-between"></div>
        <InputPremium
          id="senha"
          label="Senha"
          type="password"
          value={formData.senha}
          onChange={handleTextInputChange('senha')}
          placeholder="Digite sua senha"
          required
          autoComplete="current-password"
        />
      </div>

      <div>
        <Link
          href="/recuperar-senha"
          className="text-sm text-purple-400 underline underline-offset-4 transition-colors hover:text-purple-300 hover:underline-offset-2"
        >
          Esqueceu a senha?
        </Link>
      </div>

      {/* Botão de Submissão - Botão Principal Elegante */}
      <ButtonPremium
        type="submit"
        size="lg"
        loading={loading}
        disabled={!isFormComplete || loading}
        className="w-full bg-[#d500f9] text-white transition-all duration-300 ease-out hover:bg-[#e400e5] hover:text-white hover:shadow-lg hover:shadow-purple-500/40 active:shadow-md"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </ButtonPremium>

      {/* Divisória */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-900 px-4 text-gray-400">Não tem conta?</span>
        </div>
      </div>

      {/* Link para Cadastro - Botão Cancelar (Outline Sofisticado) */}
      <Link href="/register" className="w-full">
        <ButtonPremium
          type="button"
          size="lg"
          className="w-full border border-[#d500f9] bg-transparent text-[#d500f9] shadow-[0_0_15px_#d500f9] transition-all duration-300 ease-out hover:bg-[#d500f9]/10 hover:text-white hover:shadow-[0_0_25px_#d500f9] active:shadow-[0_0_15px_#d500f9]"
        >
          Crie sua conta
        </ButtonPremium>
      </Link>

      {/* Termos */}
      <div className="mt-4 text-center text-sm text-gray-400">
        Ao entrar, você concorda com os{' '}
        <Link
          href="/termos-de-uso"
          className="text-purple-400 underline underline-offset-4 transition-colors hover:text-purple-300 hover:underline-offset-2"
        >
          Termos de Uso
        </Link>
      </div>
    </form>
  );
};

export default LoginForm;
