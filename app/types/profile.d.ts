/**
 * @file profile.d.ts
 * @description Tipos e interfaces para perfil do usuário
 */

export interface DadosPessoais {
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  genero: "HOMEM" | "MULHER" | "NAO_INFORMADO" | "";
}

export interface UserProfile {
  id: number;
  email: string;
  nome: string;
  role: string;
  telefone: string;
  data_nascimento: string;
  genero: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  pais: PaisType;
  termosAceitos: boolean;
  politicaAceita: boolean;
  tipo_documento: string;
  reg_documento: string;
  isActive: boolean;
  avatar_id?: number;
  comprovante_id?: number;
  documento_id?: number;
  biofacial_id?: number;
}

export interface PerfilFormData {
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  genero: "HOMEM" | "MULHER" | "NAO_INFORMADO" | "";
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  tipo_documento: string;
  reg_documento: string;
  pais: PaisType;
}

export interface UpdateProfileDTO {
  nome?: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  pais?: PaisType;
  tipo_documento?: string;
  reg_documento?: string;
}
