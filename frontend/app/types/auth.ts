export interface AuthTokens {
  token: string;
  refreshToken: string;
  exp: number;
}

export interface AuthResponse {
  id: number;
  email: string;
  nome: string;
  role: "USER" | "ADMIN" | "FINANCEIRO" | "COMPLIANCE";
  isActive: boolean;
  token: string;
  refreshToken: string;
  exp: number;
  sessionId?: string;
  requiresVerification?: boolean;
  subscriptions?: Subscription[];
}

export interface UserAvatar {
  id: number;
  url: string;
  url_sm: string | null;
  url_md: string | null;
  url_web: string | null;
  url_lg: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface UserDocument {
  id: number;
  url: string;
  url_sm: string | null;
  url_md: string | null;
  url_web: string | null;
  url_lg: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface UserWallet {
  id: number;
  balance: string;
  blocked: string;
  currency: string;
}

export interface Payment {
  id: number;
  amount: string;
  method: "PIX" | "CREDIT_CARD" | "BOLETO";
  status: "PENDING" | "PAID" | "FAILED";
}

export interface Plan {
  id: number;
  nome: string;
  slug: string;
  descricao?: string | null;
  preco?: string | number;
  periodoMeses?: number;
  periodo?: string;
  isActive?: boolean;
  recomendado?: boolean;
}

export interface Subscription {
  id: number;
  planId: number;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  startedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
}

export interface Pais {
  /** ID canônico do catálogo Country, usado no PATCH do perfil. */
  id?: number;
  iso3: string;
  nome: string;
  emoji: string;
}

export interface UserData {
  id: number;
  publicId: string;
  email: string;
  nome: string;
  role: "USER" | "ADMIN" | "FINANCEIRO" | "COMPLIANCE";
  telefone: string;
  data_nascimento: string;
  genero: "HOMEM" | "MULHER" | "OUTRO";
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  pais: Pais | string | null;
  /** Bandeira canônica persistida separadamente no backend. */
  bandeira?: string | null;
  tipo_documento:
    | "RG"
    | "CPF"
    | "CNPJ"
    | "PASSPORT"
    | "NATIONAL_ID"
    | "DRIVER_LICENSE"
    | "RESIDENCE_PERMIT";
  reg_documento: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  avatar_id?: number;
  avatar?: UserAvatar;
  comprovante?: UserDocument;
  documento?: UserDocument;
  biofacial?: UserDocument;
  wallet?: UserWallet;
  payments?: Payment[];
  subscriptions?: Subscription[];
  // BUG-FT-005: popula quando o admin rejeita KYC e o KYCProfile foi
  // deletado pelo cleanup (CASE.md:884). Permite /profile exibir
  // "Faça upload novamente" no slot correto, em vez do genérico "Upload".
  lastKycRejectionAt?: string | null;
  lastKycRejectionReason?: string | null;
  lastKycRejectionSlot?: "avatar" | "documento" | "biofacial" | "comprovante" | null;
}

export interface ApiResponse<T> {
  error: boolean;
  message: string;
  codigo: number;
  data: T;
}
