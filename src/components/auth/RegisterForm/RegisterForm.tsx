/**
 * RegisterForm - Formulário de cadastro premium simplificado
 * Sem campos de localização, focado na experiência essencial
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import InputPremium from '../ui/InputPremium';
import ButtonPremium from '../ui/ButtonPremium';
import CheckboxPremium from '../ui/CheckboxPremium';
import PasswordStrength from '../ui/PasswordStrength';
import { 
  FormData, 
  FormErrors, 
  RegisterFormProps 
} from './types';
import {
  validateForm,
  validateNome,
  validateEmail,
  validateTelefone,
  validateSenha,
  validateConfirmarSenha,
  validateTermos
} from './validation';
import { usePhoneMask } from '@/hooks/usePhoneMask';

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  loading: externalLoading = false
}) => {
  const router = useRouter();
  const { handlePhoneChange } = usePhoneMask();
  
  // Estado do formulário
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: '',
    termosAceitos: false,
    politicaAceita: false
  });

  // Estado de erros
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Estado de loading local
  const [loading, setLoading] = useState(false);

  // Validação em tempo real com debounce
  const validateField = useCallback((field: keyof FormData, value: string | boolean) => {
    let error = null;
    
    switch (field) {
      case 'nome':
        if (typeof value === 'string') error = validateNome(value);
        break;
      case 'email':
        if (typeof value === 'string') error = validateEmail(value);
        break;
      case 'telefone':
        if (typeof value === 'string') error = validateTelefone(value);
        break;
      case 'senha':
        if (typeof value === 'string') error = validateSenha(value);
        break;
      case 'confirmarSenha':
        if (typeof value === 'string') error = validateConfirmarSenha(value, formData.senha);
        break;
      case 'termosAceitos':
        if (typeof value === 'boolean') error = validateTermos(value);
        break;
    }
    
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
    
    return error;
  }, [formData.senha]);

  // Handler para mudança nos campos
  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Validação em tempo real (exceto para confirmação de senha)
    if (field !== 'confirmarSenha' || (field === 'confirmarSenha' && typeof value === 'string' && value)) {
      validateField(field, value);
    }
  }, [validateField]);

  // Handler específico para inputs de texto
  const handleTextInputChange = useCallback((field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(field, e.target.value);
  }, [handleInputChange]);

  // Handler específico para telefone com máscara automática
  const handleTelefoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = handlePhoneChange(e.target.value);
    handleInputChange('telefone', formattedPhone);
  }, [handlePhoneChange, handleInputChange]);

  // Handler específico para checkboxes
  const handleCheckboxChange = useCallback((field: keyof FormData) => (checked: boolean) => {
    handleInputChange(field, checked);
  }, [handleInputChange]);

  // Submissão do formulário
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos os campos
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      toast('Corrija os erros no formulário', {
        description: 'Verifique os campos destacados'
      });
      return;
    }

    try {
      setLoading(true);
      const result = await onSubmit(formData);
      
      // Mostrar sucesso antes de redirecionar
      toast('Cadastro realizado com sucesso!', {
        description: 'Redirecionando para planos...'
      });
      
      // Redirecionar para URL retornada em caso de sucesso
      if (result.success && result.url) {
        setTimeout(() => {
          window.location.href = result.url;
        }, 500); // Pequeno delay para o toast ser visto
      }
    } catch (error) {
      toast('Erro no cadastro', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    } finally {
      setLoading(false);
    }
  }, [formData, onSubmit]);

  // Verificar se formulário está completo
  const isFormComplete = formData.nome && 
                        formData.email && 
                        formData.telefone && 
                        formData.senha && 
                        formData.confirmarSenha && 
                        formData.termosAceitos && 
                        formData.politicaAceita;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campo Nome */}
      <InputPremium
        id="nome"
        label="Nome completo"
        type="text"
        value={formData.nome}
        onChange={handleTextInputChange('nome')}
        error={errors.nome}
        placeholder="Digite seu nome completo"
        required
        autoComplete="name"
      />

      {/* Campo Email */}
      <InputPremium
        id="email"
        label="E-mail"
        type="email"
        value={formData.email}
        onChange={handleTextInputChange('email')}
        error={errors.email}
        placeholder="seu@email.com"
        required
        autoComplete="email"
      />

      {/* Campo Telefone */}
      <InputPremium
        id="telefone"
        label="Telefone"
        type="tel"
        value={formData.telefone}
        onChange={handleTelefoneChange}
        error={errors.telefone}
        placeholder="(XX) XXXXX-XXXX"
        required
        autoComplete="tel"
      />

      {/* Campo Senha */}
      <div className="space-y-2">
        <InputPremium
          id="senha"
          label="Senha"
          type="password"
          value={formData.senha}
          onChange={handleTextInputChange('senha')}
          error={errors.senha}
          placeholder="Mínimo 12 caracteres"
          required
          autoComplete="new-password"
        />
        <PasswordStrength password={formData.senha} />
      </div>

      {/* Campo Confirmar Senha */}
      <InputPremium
        id="confirmarSenha"
        label="Confirmar senha"
        type="password"
        value={formData.confirmarSenha}
        onChange={handleTextInputChange('confirmarSenha')}
        error={errors.confirmarSenha}
        placeholder="Digite a senha novamente"
        required
        autoComplete="new-password"
      />

      {/* Termos e Políticas */}
      <div className="space-y-4">
        <CheckboxPremium
          id="termos"
          label={
            <span>
              Aceito os{' '}
              <button
                type="button"
                className="text-purple-400 underline underline-offset-4 transition-colors hover:text-purple-300 hover:underline-offset-2"
                onClick={() =>
                  window.open(
                    'https://iselftoken.net/termo-de-uso-para-investidores-iselftoken/',
                    '_blank',
                  )
                }
              >
                Termos de Uso
              </button>{' '}
              da plataforma iSelfToken
            </span>
          }
          checked={formData.termosAceitos}
          onChange={handleCheckboxChange('termosAceitos')}
          required
        />

        <CheckboxPremium
          id="politica"
          label={
            <span>
              Concordo com a{' '}
              <button
                type="button"
                className="text-purple-400 underline underline-offset-4 transition-colors hover:text-purple-300 hover:underline-offset-2"
                onClick={() => router.push('/politicas')}
              >
                Política de Privacidade
              </button>{' '}
              e tratamento de dados
            </span>
          }
          checked={formData.politicaAceita}
          onChange={handleCheckboxChange('politicaAceita')}
          required
        />
      </div>

      {/* Botão de Submissão */}
      <ButtonPremium
        type="submit"
        variant="primary"
        size="lg"
        loading={loading || externalLoading}
        disabled={!isFormComplete || loading || externalLoading}
        className="w-full text-[#d500f9] hover:text-white"
      >
        {loading || externalLoading ? 'Processando cadastro...' : 'Criar conta'}
      </ButtonPremium>
    </form>
  );
};

export default RegisterForm;