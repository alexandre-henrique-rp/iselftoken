import { CheckoutData } from '@/types/Checkout';

/**
 * Serviço para gerenciar dados do checkout no localStorage
 * Responsável por armazenar e recuperar informações de pagamento
 */
class CheckoutStorageService {
  private static readonly CHECKOUT_KEY = 'checkout_data';

  /**
   * Salva os dados do checkout no localStorage
   * @param data - Dados do checkout a serem armazenados
   * @returns true se salvou com sucesso, false caso contrário
   */
  static salvarDadosCheckout(data: CheckoutData): boolean {
    try {
      if (typeof window === 'undefined') {
        console.warn('localStorage não disponível (SSR)');
        return false;
      }

      // Validação básica dos dados obrigatórios
      if (!data.userName || !data.userId || !data.valor || !data.productName) {
        console.error('Dados obrigatórios do checkout estão faltando');
        return false;
      }

      localStorage.setItem(this.CHECKOUT_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados do checkout:', error);
      return false;
    }
  }

  /**
   * Recupera os dados do checkout do localStorage
   * @returns Dados do checkout ou null se não encontrado
   */
  static recuperarDadosCheckout(): CheckoutData | null {
    try {
      if (typeof window === 'undefined') {
        console.warn('localStorage não disponível (SSR)');
        return null;
      }

      const data = localStorage.getItem(this.CHECKOUT_KEY);
      if (!data) {
        return null;
      }

      return JSON.parse(data) as CheckoutData;
    } catch (error) {
      console.error('Erro ao recuperar dados do checkout:', error);
      return null;
    }
  }

  /**
   * Limpa os dados do checkout do localStorage
   * Deve ser chamado após pagamento concluído ou cancelado
   */
  static limparDadosCheckout(): void {
    try {
      if (typeof window === 'undefined') {
        console.warn('localStorage não disponível (SSR)');
        return;
      }

      localStorage.removeItem(this.CHECKOUT_KEY);
    } catch (error) {
      console.error('Erro ao limpar dados do checkout:', error);
    }
  }

  /**
   * Verifica se existem dados de checkout salvos
   * @returns true se existem dados, false caso contrário
   */
  static temDadosCheckout(): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      return localStorage.getItem(this.CHECKOUT_KEY) !== null;
    } catch (error) {
      console.error('Erro ao verificar dados do checkout:', error);
      return false;
    }
  }

  /**
   * Abre a página de checkout em uma nova janela
   * @param data - Dados do checkout
   * @param windowFeatures - Configurações opcionais da janela (padrão: 1024x768)
   * @returns Referência da janela aberta ou null se falhou
   */
  static abrirCheckout(
    data: CheckoutData,
    windowFeatures: string = 'width=1024,height=768,scrollbars=yes,resizable=yes',
  ): Window | null {
    try {
      if (typeof window === 'undefined') {
        console.warn('window não disponível (SSR)');
        return null;
      }

      // Salva os dados no localStorage
      const salvou = this.salvarDadosCheckout(data);
      if (!salvou) {
        console.error('Falha ao salvar dados do checkout');
        return null;
      }

      // Abre a janela de checkout
      const checkoutWindow = window.open(
        '/checkout',
        'checkout_window',
        windowFeatures,
      );

      return checkoutWindow;
    } catch (error) {
      console.error('Erro ao abrir checkout:', error);
      return null;
    }
  }
}

export default CheckoutStorageService;
