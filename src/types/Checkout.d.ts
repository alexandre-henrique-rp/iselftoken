/**
 * Interface para dados do checkout
 * Define a estrutura de dados necessária para processar um pagamento
 */
export interface CheckoutData {
  /**
   * Nome completo do usuário
   */
  userName: string;

  /**
   * ID único do usuário
   */
  userId: string;

  /**
   * Valor do produto em formato string (ex: "R$ 1.500,00")
   */
  valor: string;

  /**
   * Nome/título do produto
   */
  productName: string;

  /**
   * Tipo/categoria do produto
   * Ex: "plano", "consultoria", "token", etc.
   */
  productType: string;

  /**
   * Descrição detalhada do produto
   */
  productDescription: string;

  /**
   * Quantidade do produto (opcional, padrão: 1)
   */
  quantidade?: number;

  /**
   * Validade do produto em meses (opcional)
   * Usado para calcular benefícios ou duração
   */
  validity?: number;

  /**
   * Observações adicionais sobre o produto (opcional)
   */
  obs?: string;

  /**
   * Serviços adicionais (opcional)
   * Lista de serviços extras com seus valores
   */
  addServicesDescription?: AdditionalService[];
}

/**
 * Interface para serviços adicionais
 */
export interface AdditionalService {
  description: string;
  value: number;
  quantidade?: number;
}

/**
 * Interface para dados de cupom de desconto
 */
export interface CupomData {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isValid: boolean;
  message?: string;
}

/**
 * Interface para resposta do pagamento
 */
export interface PaymentResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  paymentMethod?: 'credit' | 'pix';
}
