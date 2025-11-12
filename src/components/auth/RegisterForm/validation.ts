/**
 * Sistema de validações sofisticadas para formulário de cadastro
 * Validações em tempo real com feedback elegante
 */

import { FormData, FormErrors } from './types';
import { validatePhone } from '@/hooks/usePhoneMask';

/**
 * Valida nome completo - apenas letras e espaços
 * @param nome Nome a ser validado
 * @returns Mensagem de erro ou null se válido
 */
export const validateNome = (nome: string): string | null => {
  if (!nome?.trim()) return 'Nome é obrigatório';
  if (nome.length < 3) return 'Nome deve ter pelo menos 3 caracteres';
  if (nome.length > 100) return 'Nome deve ter no máximo 100 caracteres';
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome)) return 'Nome deve conter apenas letras';
  return null;
};

/**
 * Valida email com formato RFC 5322
 * @param email Email a ser validado
 * @returns Mensagem de erro ou null se válido
 */
export const validateEmail = (email: string): string | null => {
  if (!email?.trim()) return 'E-mail é obrigatório';
  
  // Regex mais robusta para validação de email
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return 'E-mail inválido';
  if (email.length > 254) return 'E-mail muito longo';
  
  return null;
};

/**
 * Valida telefone no formato brasileiro usando hook especializado
 * @param telefone Telefone a ser validado
 * @returns Mensagem de erro ou null se válido
 */
export const validateTelefone = (telefone: string): string | null => {
  if (!telefone?.trim()) return 'Telefone é obrigatório';
  
  // Usa validação especializada do hook
  if (!validatePhone(telefone)) {
    return 'Telefone inválido - formato: (XX) XXXXX-XXXX';
  }
  
  return null;
};

/**
 * Valida senha com critérios de segurança
 * @param senha Senha a ser validada
 * @returns Mensagem de erro ou null se válida
 */
export const validateSenha = (senha: string): string | null => {
  if (!senha) return 'Senha é obrigatória';
  if (senha.length < 12) return 'Senha deve ter pelo menos 12 caracteres';
  if (senha.length > 128) return 'Senha muito longa';
  if (!/[A-Z]/.test(senha)) return 'Senha deve ter uma letra maiúscula';
  if (!/[a-z]/.test(senha)) return 'Senha deve ter uma letra minúscula';
  if (!/[0-9]/.test(senha)) return 'Senha deve ter um número';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) {
    return 'Senha deve ter um caractere especial';
  }
  return null;
};

/**
 * Valida confirmação de senha
 * @param confirmarSenha Senha de confirmação
 * @param senha Senha original para comparação
 * @returns Mensagem de erro ou null se válida
 */
export const validateConfirmarSenha = (confirmarSenha: string, senha: string): string | null => {
  if (!confirmarSenha) return 'Confirmação de senha é obrigatória';
  if (confirmarSenha !== senha) return 'Senhas não conferem';
  return null;
};

/**
 * Valida aceitação dos termos
 * @param termosAceitos Estado dos termos
 * @returns Mensagem de erro ou null se válido
 */
export const validateTermos = (termosAceitos: boolean): string | null => {
  if (!termosAceitos) return 'Aceite os termos de uso para continuar';
  return null;
};

/**
 * Valida todos os campos do formulário
 * @param data Dados do formulário
 * @returns Objeto com erros ou vazio se tudo válido
 */
export const validateForm = (data: FormData): FormErrors => {
  const errors: FormErrors = {};

  const nomeError = validateNome(data.nome);
  if (nomeError) errors.nome = nomeError;

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const telefoneError = validateTelefone(data.telefone);
  if (telefoneError) errors.telefone = telefoneError;

  const senhaError = validateSenha(data.senha);
  if (senhaError) errors.senha = senhaError;

  const confirmarSenhaError = validateConfirmarSenha(data.confirmarSenha, data.senha);
  if (confirmarSenhaError) errors.confirmarSenha = confirmarSenhaError;

  const termosError = validateTermos(data.termosAceitos);
  if (termosError) errors.termos = termosError;

  return errors;
};

/**
 * Verifica se o formulário é válido
 * @param data Dados do formulário
 * @returns true se válido, false se houver erros
 */
export const isFormValid = (data: FormData): boolean => {
  const errors = validateForm(data);
  return Object.keys(errors).length === 0;
};

/**
 * Calcula força da senha (0-4)
 * @param senha Senha para análise
 * @returns Nível de força da senha
 */
export const calculatePasswordStrength = (senha: string): number => {
  let strength = 0;
  
  if (!senha) return 0;
  
  if (senha.length >= 12) strength++;
  if (senha.length >= 16) strength++;
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) strength++;
  if (/[0-9]/.test(senha)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) strength++;
  
  return Math.min(strength, 4);
};

/**
 * Retorna descrição textual da força da senha
 * @param strength Nível de força (0-4)
 * @returns Descrição da força
 */
export const getPasswordStrengthLabel = (strength: number): string => {
  const labels = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];
  return labels[strength] || '';
};

/**
 * Retorna cor para indicador de força da senha
 * @param strength Nível de força (0-4)
 * @returns Cor em formato oklch
 */
export const getPasswordStrengthColor = (strength: number): string => {
  const colors = [
    'oklch(0.650 0.008 15)',    // Vermelho sutil
    'oklch(0.680 0.008 30)',    // Laranja sutil
    'oklch(0.720 0.008 60)',    // Amarelo sutil
    'oklch(0.650 0.006 240)',   // Azul sutil
    'oklch(0.650 0.006 150)',   // Verde sutil
  ];
  return colors[strength] || 'oklch(0.450 0.004 49.25)';
};