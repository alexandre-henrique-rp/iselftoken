import { CupomData } from '@/types/Checkout';

/**
 * Serviço para validação e aplicação de cupons de desconto
 */
class CupomService {
  /**
   * Valida um cupom de desconto via API
   * @param code Código do cupom a ser validado
   * @param amount Valor total da compra para calcular desconto
   * @returns Promise<CupomData> Dados do cupom validado
   */
  async validarCupom(code: string, amount: number): Promise<CupomData> {
    try {
      console.log(`🔍 Validando cupom: ${code} para valor: R$ ${amount.toFixed(2)}`);

      // Simulação de chamada API - substituir com endpoint real
      const response = await fetch('/api/cupons/validar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          amount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const cupomData = await response.json();
      console.log('✅ Cupom validado com sucesso:', cupomData);

      return cupomData;
    } catch (error) {
      console.error('❌ Erro ao validar cupom:', error);

      // Lógica de fallback para desenvolvimento/teste
      return this.validarCupomFallback(code, amount);
    }
  }

  /**
   * Validação de fallback para cupons (usado quando API não está disponível)
   * @param code Código do cupom
   * @param amount Valor da compra
   * @returns CupomData com dados do cupom validado
   */
  private validarCupomFallback(code: string, amount: number): CupomData {
    const normalizedCode = code.toUpperCase().trim();

    console.log(`🔄 Usando validação fallback para cupom: ${normalizedCode}`);

    // Cupons de teste para desenvolvimento
    const cuponsTeste: Record<string, CupomData> = {
      'DESCONTO10': {
        code: 'DESCONTO10',
        discountType: 'percentage',
        discountValue: 10,
        isValid: true,
        message: '10% de desconto aplicado!'
      },
      'DESCONTO20': {
        code: 'DESCONTO20',
        discountType: 'percentage',
        discountValue: 20,
        isValid: true,
        message: '20% de desconto aplicado!'
      },
      'FIXO50': {
        code: 'FIXO50',
        discountType: 'fixed',
        discountValue: 50,
        isValid: true,
        message: 'R$ 50 de desconto aplicado!'
      },
      'PROMO2025': {
        code: 'PROMO2025',
        discountType: 'percentage',
        discountValue: 15,
        isValid: true,
        message: '15% de desconto especial!'
      }
    };

    const cupom = cuponsTeste[normalizedCode];

    if (!cupom) {
      console.log(`❌ Cupom ${normalizedCode} não encontrado`);
      return {
        code: normalizedCode,
        discountType: 'percentage',
        discountValue: 0,
        isValid: false,
        message: 'Cupom inválido ou não encontrado'
      };
    }

    // Validações adicionais
    if (cupom.discountType === 'fixed' && cupom.discountValue >= amount) {
      console.log(`❌ Valor do desconto (R$ ${cupom.discountValue}) maior que o total (R$ ${amount})`);
      return {
        ...cupom,
        isValid: false,
        message: 'Valor do desconto não pode ser maior que o total da compra'
      };
    }

    console.log(`✅ Cupom ${normalizedCode} validado com sucesso`);
    return cupom;
  }

  /**
   * Calcula o valor do desconto com base no cupom
   * @param cupom Dados do cupom validado
   * @param amount Valor original da compra
   * @returns Valor do desconto
   */
  calcularDesconto(cupom: CupomData, amount: number): number {
    if (!cupom.isValid) {
      return 0;
    }

    let desconto = 0;

    if (cupom.discountType === 'percentage') {
      desconto = amount * (cupom.discountValue / 100);
      console.log(`💰 Desconto percentual: ${cupom.discountValue}% de R$ ${amount.toFixed(2)} = R$ ${desconto.toFixed(2)}`);
    } else if (cupom.discountType === 'fixed') {
      desconto = cupom.discountValue;
      console.log(`💰 Desconto fixo: R$ ${desconto.toFixed(2)}`);
    }

    // Garante que o desconto não seja maior que o valor total
    const descontoFinal = Math.min(desconto, amount);
    if (descontoFinal !== desconto) {
      console.log(`⚠️ Desconto ajustado de R$ ${desconto.toFixed(2)} para R$ ${descontoFinal.toFixed(2)} (não pode exceder o total)`);
    }

    return descontoFinal;
  }

  /**
   * Formata a mensagem de desconto para exibição
   * @param cupom Dados do cupom
   * @param amount Valor original
   * @returns Mensagem formatada
   */
  formatarMensagemDesconto(cupom: CupomData, amount: number): string {
    if (!cupom.isValid) {
      return cupom.message || 'Cupom inválido';
    }

    const desconto = this.calcularDesconto(cupom, amount);

    if (cupom.discountType === 'percentage') {
      return `${cupom.discountValue}% de desconto (-R$ ${desconto.toFixed(2)})`;
    } else {
      return `R$ ${cupom.discountValue.toFixed(2)} de desconto`;
    }
  }
}

// Exporta instância singleton do serviço
const cupomServiceInstance = new CupomService();
export default cupomServiceInstance;