export interface User {
  id: number;
  publicId: string;
  email: string;
  nome: string;
  role: string;
  telefone: string;
  data_nascimento: Date | string;
  genero: "HOMEM" | "MULHER" | "OUTRO";
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  pais: string;
  tipo_documento: string;
  reg_documento: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  avatar: {
    id: number;
    url: string;
    url_sm: string;
    url_md: string;
    url_lg: string;
    status:
      | "PENDING"
      | "UNDER_REVIEW"
      | "APPROVED"
      | "REJECTED"
      | "NEEDS_RESUBMISSION";
  } | null;
  comprovante: {
    id: number;
    url: string;
    url_sm: string;
    url_md: string;
    url_lg: string;
    status:
      | "PENDING"
      | "UNDER_REVIEW"
      | "APPROVED"
      | "REJECTED"
      | "NEEDS_RESUBMISSION";
  } | null;
  documento: {
    id: number;
    url: string;
    url_sm: string;
    url_md: string;
    url_lg: string;
    status:
      | "PENDING"
      | "UNDER_REVIEW"
      | "APPROVED"
      | "REJECTED"
      | "NEEDS_RESUBMISSION";
  } | null;
  biofacial: {
    id: number;
    url: string;
    url_sm: string;
    url_md: string;
    url_lg: string;
    status:
      | "PENDING"
      | "UNDER_REVIEW"
      | "APPROVED"
      | "REJECTED"
      | "NEEDS_RESUBMISSION";
  };
  wallet: {
    id: number;
    balance: string;
    blocked: string;
    currency: string;
  };
  payments: [
    {
      id: number;
      amount: string;
      method: string;
      status: string;
    },
  ];
  subscriptions: {
    id: number;
    userId?: number;
    planId?: number;
    status: string;
    startedAt: string;
    expiresAt: string;
    plan?: {
      id: number;
      nome?: string;
      slug?: string;
      descricao?: string;
      preco?: string;
      periodoMeses?: number;
      periodo?: string;
      icon?: string;
      visivel?: boolean;
      isActive?: boolean;
      recomendado?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
  }[];
  startups: [
    {
      id: number;
      nome: string;
      slug: string;
      status: string;
    },
  ];
  investments: [
    {
      id: number;
      amount: string;
      tokensQty: number;
      status: string;
    },
  ];
  tokens: [
    {
      id: string;
      hash: string;
      quantity: number;
      purchaseVal: string;
      currentVal: string;
    },
  ];
  tokenHistory: [
    {
      id: number;
      type: string;
      amount: string;
      description: string;
    },
  ];
  auditLogs: [
    {
      id: number;
      action: string;
      entity: string;
      entityId: string;
      createdAt: string;
    },
  ];
}
