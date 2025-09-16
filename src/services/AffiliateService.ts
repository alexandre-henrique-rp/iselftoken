// services/AffiliateService.ts

// Interfaces para as respostas da API
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

export interface ActivateAffiliateData {}

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

class AffiliateService {
  /**
   * Obtém os dados do dashboard do afiliado.
   * @param {string} token - Token de autenticação (ex: JWT ou token de sessão).
   * @param {number} afiliadoId - O ID do afiliado.
   * @returns {Promise<any>} Dados do dashboard.
   */
  async getAffiliateDashboard(token: string, afiliadoId: number): Promise<ApiResponse<DashboardData>> {
    console.log("--- USANDO DADOS MOCKADOS PARA DASHBOARD DO AFILIADO ---");

    // Simula um pequeno atraso de rede
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockData: DashboardData = {
      afiliado_id: afiliadoId,
      nome: "Consultor de Teste",
      link_indicacao: `consultor${afiliadoId}`,
      kpis: {
        totalComissoes: 1250.50,
        totalClicks: 480,
        totalConversions: 62
      }
    };

    const mockResponse: ApiResponse<DashboardData> = {
      status: "success",
      message: "Dados do dashboard do afiliado (mock)",
      data: mockData
    };

    return Promise.resolve(mockResponse);

    /* CÓDIGO ORIGINAL COMENTADO
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/affiliates/dashboard/${afiliadoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao carregar o dashboard do afiliado');
    }

    return response.json();
    */
  }

  /**
   * Registra um clique no link de indicação.
   * @param {object} data - Dados do clique.
   * @returns {Promise<any>}
   */
  async registerClick(data: RegisterClickRequest): Promise<ApiResponse<RegisterClickData>> {
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/affiliates/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao registrar o clique');
    }

    return response.json();
  }
  async registerAffiliate(data: RegisterAffiliateRequest): Promise<ApiResponse<RegisterAffiliateData>> {
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/affiliates/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao registrar o afiliado');
    }

    return response.json();
  }

  async activateAffiliate(data: ActivateAffiliateRequest): Promise<ApiResponse<ActivateAffiliateData>> {
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/affiliates/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao ativar o afiliado');
    }

    return response.json();
  }

  async registerConversion(data: RegisterConversionRequest): Promise<ApiResponse<RegisterConversionData>> {
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/affiliates/conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao registrar a conversão');
    }

    return response.json();
  }

  async registerEarning(data: RegisterEarningRequest): Promise<ApiResponse<RegisterEarningData>> {
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/affiliates/earning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao registrar a comissão');
    }

    return response.json();
  }

  async addMaterial(data: AddMaterialRequest): Promise<ApiResponse<AddMaterialData>> {
    const response = await fetch(`${process.env.NEXTAUTH_API_URL}/affiliates/materials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao adicionar o material');
    }

    return response.json();
  }
}

export const affiliateService = new AffiliateService();