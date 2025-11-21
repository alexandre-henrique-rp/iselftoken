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
   * Validade do produto em meses (opcional)
   * Usado para calcular benefícios ou duração
   */
  validity?: number;

  /**
   * Observações adicionais sobre o produto (opcional)
   */
  obs?: string;
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
