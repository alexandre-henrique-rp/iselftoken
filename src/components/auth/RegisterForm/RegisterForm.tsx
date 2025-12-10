'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import InputPremium from '../ui/InputPremium';
import ButtonPremium from '../ui/ButtonPremium';
import CheckboxPremium from '../ui/CheckboxPremium';
import PasswordStrength from '../ui/PasswordStrength';

import {
  validateForm,
  validateNome,
  validateEmail,
  validateTelefone,
  validateSenha,
  validateConfirmarSenha,
  validateTermos,
} from './validation';
import { usePhoneMask } from '@/hooks/usePhoneMask';
import generateA2fCode from '@/lib/a2f';

const RegisterForm = () => {
  const router = useRouter();
  const { handlePhoneChange } = usePhoneMask();

  // Estado do formulário
  const [formData, setFormData] = useState<UserType.Register>({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: '',
    termosAceitos: false,
    politicaAceita: false,
  });


  // Estado de loading local
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<UserType.FormErrors>({});

  useEffect(() => {
    localStorage.removeItem('method');
    localStorage.removeItem('redirect');
    localStorage.removeItem('formData');
    localStorage.removeItem('codigo');
  }, []);

  // Validação em tempo real com debounce
  const validateField = useCallback(
    (field: keyof UserType.Register, value: string | boolean) => {
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
          if (typeof value === 'string')
            error = validateConfirmarSenha(value, formData.senha);
          break;
        case 'termosAceitos':
          if (typeof value === 'boolean') error = validateTermos(value);
          break;
      }

      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));

      return error;
    },
    [formData.senha],
  );

  // Handler para mudança nos campos
  const handleInputChange = useCallback(
    (field: keyof UserType.Register, value: string | boolean) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Validação em tempo real (exceto para confirmação de senha)
      if (
        field !== 'confirmarSenha' ||
        (field === 'confirmarSenha' && typeof value === 'string' && value)
      ) {
        validateField(field, value);
      }
    },
    [validateField],
  );

  // Handler específico para inputs de texto
  const handleTextInputChange = useCallback(
    (field: keyof UserType.Register) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        handleInputChange(field, e.target.value);
      },
    [handleInputChange],
  );

  // Handler específico para telefone com máscara automática
  const handleTelefoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formattedPhone = handlePhoneChange(e.target.value);
      handleInputChange('telefone', formattedPhone);
    },
    [handlePhoneChange, handleInputChange],
  );

  // Handler específico para checkboxes
  const handleCheckboxChange = useCallback(
    (field: keyof UserType.Register) => (checked: boolean) => {
      handleInputChange(field, checked);
    },
    [handleInputChange],
  );

  // Submissão do formulário
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Validar todos os campos
      const validationErrors = validateForm(formData);
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        toast('Corrija os erros no formulário', {
          description: 'Verifique os campos destacados',
        });
        return;
      }

      try {
        setLoading(true);
        const codigo = generateA2fCode();
        // ENVIAR O FORM PARA LOCAL STORAGE
        localStorage.setItem('codigo', codigo);
        localStorage.setItem('redirect', '/login');
        localStorage.setItem('method', 'register');

        const result = await fetch(`/api/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            codigo: codigo,
            confirmacaoSenha: formData.confirmarSenha,
          }),
        });
        console.log("🚀 ~ RegisterForm ~ result:", result)

        if (!result.ok) {
          const data = await result.json()
          if (data) {
            throw new Error(JSON.stringify(data, null, 2))
          }
          throw new Error(
            'Erro ao salvar dados do cadastro, codigo: ' + codigo,
          );
        }
        

        // Mostrar sucesso antes de redirecionar
        toast('Cadastro realizado com sucesso!', {
          description: 'Redirecionando para planos...',
          duration: 5000
        });

        setTimeout(() => {
          router.push('/auth');
        }, 500); // Pequeno delay para o toast ser visto
      } catch (error) {
        toast('Erro no cadastro', {
          description:
            error instanceof Error ? error.message : 'Tente novamente',
        });
      } finally {
        setLoading(false);
      }
    },
    [formData, router],
  );

  // Verificar se formulário está completo
  const isFormComplete =
    formData.nome &&
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
                onClick={() =>
                  window.open(
                    'https://iselftoken.net/privacy-policy/',
                    '_blank',
                  )
                }
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

      {/* Botão de Submissão - Botão Principal Elegante */}
      <ButtonPremium
        type="submit"
        size="lg"
        loading={loading}
        disabled={!isFormComplete || loading}
        className="w-full bg-[#d500f9] text-white transition-all duration-300 ease-out hover:bg-[#e400e5] hover:text-white hover:shadow-lg hover:shadow-purple-500/40 active:shadow-md"
      >
        {loading ? 'Processando cadastro...' : 'Criar conta'}
      </ButtonPremium>
    </form>
  );
};

export default RegisterForm;
