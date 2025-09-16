export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

export interface DashboardData {
  afiliado_id: number;
  nome: string;
  link_indicacao: string;
  kpis: {
    totalComissoes: number;
    totalClicks: number;
    totalConversions: number;
  };
}

export interface RegisterAffiliateData {
  affiliateId: number;
  referralCode: string;
  referralLink: string;
}

export type ActivateAffiliateData = Record<string, unknown>;

export interface RegisterClickData {
  referralCode: string;
  clickedAt: string;
}

export interface RegisterConversionData {
  afiliado_id: number;
  usuario_id: number;
  conversion_date: string;
}

export interface RegisterEarningData {
  afiliado_id: number;
  usuario_id: number;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface AddMaterialData {
  id: number;
  title: string;
  type: string;
  url: string;
  createdAt: string;
}

// Interfaces para os corpos das requisições
export interface RegisterAffiliateRequest {
  usuario_id: number;
}

export interface ActivateAffiliateRequest {
  usuario_id: number;
}

export interface RegisterClickRequest {
  afiliado_id: number;
  codigo_indicacao: string;
  ip_address: string;
  user_agent: string;
}

export interface RegisterConversionRequest {
  afiliado_id: number;
  usuario_id: number;
  conversion_date: string;
}

export interface RegisterEarningRequest {
  afiliado_id: number;
  usuario_id: number;
  amount: number;
  status: 'pending';
}

export interface AddMaterialRequest {
  title: string;
  type: string;
  url: string;
}