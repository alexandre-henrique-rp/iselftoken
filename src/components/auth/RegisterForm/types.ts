/**
 * Tipos TypeScript para formulário de cadastro premium
 * Segue clean architecture e boas práticas de TypeScript
 */

export interface FormData {
  /** Nome completo do usuário */
  nome: string;
  /** Email válido para cadastro */
  email: string;
  /** Telefone no formato brasileiro */
  telefone: string;
  /** Senha forte com mínimo 12 caracteres */
  senha: string;
  /** Confirmação de senha */
  confirmarSenha: string;
  /** Aceitação dos termos de uso */
  termosAceitos: boolean;
  /** Aceitação da política de privacidade */
  politicaAceita: boolean;
}

export interface FormErrors {
  nome?: string;
  email?: string;
  telefone?: string;
  senha?: string;
  confirmarSenha?: string;
  termos?: string;
}

export interface RegisterFormProps {
  /** Callback para submissão do formulário */
  onSubmit: (data: FormData) => Promise<{ success: boolean; url: string }>;
  /** Estado de carregamento */
  loading?: boolean;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface FieldConfig {
  label: string;
  placeholder: string;
  type: 'text' | 'email' | 'password' | 'tel';
  validation: ValidationRule;
  autoComplete?: string;
}