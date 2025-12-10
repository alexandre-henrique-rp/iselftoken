'use client';

import AuthLayoutPremium from '@/components/auth/layout/AuthLayoutPremium';
import {
  validateConfirmarSenha,
  validateSenha,
} from '@/components/auth/RegisterForm/validation';
import ButtonPremium from '@/components/auth/ui/ButtonPremium';
import InputPremium from '@/components/auth/ui/InputPremium';
import PasswordStrength from '@/components/auth/ui/PasswordStrength';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const tema = [
  '/image-01.jpg',
  '/image-02.jpg',
  '/image-03.jpg',
  '/image-04.jpg',
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [heroImage, setHeroImage] = useState<string>(tema[0]);

  // Form State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string | null;
    confirmPassword?: string | null;
  }>({});

  useEffect(() => {
    setHeroImage(tema[Math.floor(Math.random() * tema.length)]);
  }, []);

  // Validation Logic
  const validateField = useCallback(
    (field: 'password' | 'confirmPassword', value: string) => {
      let error = null;
      if (field === 'password') {
        error = validateSenha(value);
      } else if (field === 'confirmPassword') {
        error = validateConfirmarSenha(value, password);
      }
      setErrors((prev) => ({ ...prev, [field]: error }));
      return error;
    },
    [password],
  );

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    validateField('password', value);

    // Se já tiver confirmação, revalida ela
    if (confirmPassword) {
      const confirmError = validateConfirmarSenha(confirmPassword, value);
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setConfirmPassword(value);
    validateField('confirmPassword', value);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação final
    const passwordError = validateSenha(password);
    const confirmError = validateConfirmarSenha(confirmPassword, password);

    setErrors({
      password: passwordError,
      confirmPassword: confirmError,
    });

    if (passwordError || confirmError) {
      toast.error('Corrija os erros no formulário');
      return;
    }

    if (!token) {
      toast.error('Token inválido ou expirado');
      return;
    }

    setLoading(true);
    try {
      console.log('Redefinindo senha:', { password, token });

      // TODO: Implementar lógica de envio para API aqui
      // Exemplo:
      // const response = await fetch('/api/reset-password', { ... });

      toast.success('Senha redefinida com sucesso!', {
        description: 'Você será redirecionado para o login.',
      });

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayoutPremium
      title="iSelfToken"
      backgroundImage={heroImage}
      showLoginLink={false}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-light text-white">
            Redefinir Senha
          </h2>
          <p className="text-sm text-gray-400">
            Crie uma nova senha segura para sua conta.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <InputPremium
              id="password"
              label="Nova Senha"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              error={errors.password || undefined}
              placeholder="Mínimo 12 caracteres"
              required
              autoComplete="new-password"
            />
            <PasswordStrength password={password} />
          </div>

          <InputPremium
            id="confirmPassword"
            label="Confirmar Senha"
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            error={errors.confirmPassword || undefined}
            placeholder="Digite a senha novamente"
            required
            autoComplete="new-password"
          />

          <ButtonPremium
            type="submit"
            size="lg"
            loading={loading}
            disabled={
              loading ||
              !password ||
              !confirmPassword ||
              !!errors.password ||
              !!errors.confirmPassword
            }
            className="w-full bg-[#d500f9] text-white transition-all duration-300 ease-out hover:bg-[#e400e5] hover:text-white hover:shadow-lg hover:shadow-purple-500/40 active:shadow-md"
          >
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
          </ButtonPremium>
        </form>
      </div>
    </AuthLayoutPremium>
  );
}
