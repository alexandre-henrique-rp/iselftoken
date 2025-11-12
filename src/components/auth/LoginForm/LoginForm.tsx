/**
 * LoginForm - Formulário de login premium
 * Design minimalista seguindo padrões iSelfToken
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import InputPremium from '../ui/InputPremium';
import ButtonPremium from '../ui/ButtonPremium';
import { Button } from '@/components/ui/button';

interface LoginFormData {
  email: string;
  senha: string;
}

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<{ success: boolean; url: string }>;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit
}) => {
  const router = useRouter();
  
  // Estado do formulário
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    senha: ''
  });

  // Estado de loading
  const [loading, setLoading] = useState(false);

  // Handler para mudança nos campos
  const handleInputChange = useCallback((field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handler específico para inputs
  const handleTextInputChange = useCallback((field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(field, e.target.value);
  }, [handleInputChange]);

  // Submissão do formulário
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.email || !formData.senha) {
      toast('Preencha todos os campos', {
        description: 'Email e senha são obrigatórios'
      });
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast('Email inválido', {
        description: 'Digite um email válido'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Usa onSubmit customizado ou comportamento padrão
      if (onSubmit) {
        const result = await onSubmit(formData);
        if (result.success && result.url) {
          window.location.href = result.url;
        }
      } else {
        // Comportamento padrão
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.senha,
            redirectPath: "/"
          }),
        });
        
        const result = await response.json();
        
        if (response.ok) {
          toast('Login realizado com sucesso!', {
            description: 'Redirecionando para o dashboard'
          });
          router.push(result.url || '/');
        } else {
          throw new Error(result.message || 'Erro ao fazer login');
        }
      }
    } catch (error) {
      toast('Erro no login', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    } finally {
      setLoading(false);
    }
  }, [formData, onSubmit, router]);

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

      {/* Botão de Submissão */}
      <ButtonPremium
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        disabled={!isFormComplete || loading}
        className="f9] w-full text-[#d500f9] hover:text-white"
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

      {/* Link para Cadastro */}
      <Link href="/register" className="w-full">
        <ButtonPremium
          type="button"
          variant="primary"
          size="lg"
          className="w-full border-2 border-[#d500f9] text-[#d500f9] hover:border-[#d500f9] hover:text-white"
        >
          Crie sua conta
        </ButtonPremium>
      </Link>

      {/* Termos */}
      <div className="text-center text-sm text-gray-400 mt-4">
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