import { CheckoutData } from '@/types/Checkout';

// Tipo para validação de dados desconhecidos
interface UnknownData {
  [key: string]: unknown;
  userName?: unknown;
  userId?: unknown;
  valor?: unknown;
  productName?: unknown;
  productType?: unknown;
  productDescription?: unknown;
  validity?: unknown;
  addServicesDescription?: unknown[] | unknown;
}

/**
 * Serviço para gerenciar dados do checkout no localStorage
 */
class CheckoutStorageService {
  private readonly STORAGE_KEY = 'checkout_data';

  /**
   * Salva os dados do checkout no localStorage
   * @param data Dados completos do checkout
   */
  salvarDadosCheckout(data: CheckoutData): void {
    try {
      const dataToStore = {
        ...data,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToStore));
      console.log('✅ Dados do checkout salvos com sucesso:', dataToStore);
    } catch (error) {
      console.error('❌ Erro ao salvar dados do checkout:', error);
      throw new Error('Não foi possível salvar os dados do checkout');
    }
  }

  /**
   * Recupera os dados do checkout do localStorage
   * @returns CheckoutData | null Dados do checkout ou null se não existir
   */
  recuperarDadosCheckout(): CheckoutData | null {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);

      if (!storedData) {
        console.log('⚠️ Nenhum dado de checkout encontrado no localStorage');
        return null;
      }

      const parsedData = JSON.parse(storedData);

      // Validação básica dos dados recuperados
      if (!this.validarDadosCheckout(parsedData)) {
        console.error('❌ Dados do checkout inválidos encontrados');
        this.limparDadosCheckout();
        return null;
      }

      console.log('✅ Dados do checkout recuperados com sucesso:', parsedData);
      return parsedData;
    } catch (error) {
      console.error('❌ Erro ao recuperar dados do checkout:', error);
      this.limparDadosCheckout();
      return null;
    }
  }

  /**
   * Limpa os dados do checkout do localStorage
   */
  limparDadosCheckout(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Dados do checkout removidos com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar dados do checkout:', error);
    }
  }

  /**
   * Valida se os dados do checkout são válidos
   * @param data Dados a serem validados
   * @returns boolean true se dados são válidos
   */
  private validarDadosCheckout(data: unknown): data is CheckoutData {
    const unknownData = data as UnknownData;
    const camposObrigatorios = [
      'userName',
      'userId',
      'valor',
      'productName',
      'productType',
      'productDescription'
    ];

    for (const campo of camposObrigatorios) {
      if (!unknownData[campo] || typeof unknownData[campo] !== 'string') {
        console.error(`❌ Campo obrigatório inválido: ${campo}`);
        return false;
      }
    }

    // Validação de campos opcionais
    if (unknownData.validity && typeof unknownData.validity !== 'number') {
      console.error('❌ Campo validity deve ser um número');
      return false;
    }

    if (unknownData.addServicesDescription && !Array.isArray(unknownData.addServicesDescription)) {
      console.error('❌ Campo addServicesDescription deve ser um array');
      return false;
    }

    // Validação dos serviços adicionais
    if (unknownData.addServicesDescription) {
      const services = Array.isArray(unknownData.addServicesDescription)
        ? unknownData.addServicesDescription
        : [];

      for (const servico of services) {
        if (!servico.description || typeof servico.description !== 'string') {
          console.error('❌ Serviço com description inválida');
          return false;
        }

        if (!servico.value || typeof servico.value !== 'number') {
          console.error('❌ Serviço com value inválido');
          return false;
        }

        if (!servico.quantity || typeof servico.quantity !== 'number') {
          console.error('❌ Serviço com quantity inválido');
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Verifica se existem dados de checkout salvos
   * @returns boolean true se existem dados
   */
  existeDadosCheckout(): boolean {
    return this.recuperarDadosCheckout() !== null;
  }

  /**
   * Calcula o valor total dos serviços adicionais
   * @param checkoutData Dados do checkout
   * @returns number Valor total dos serviços adicionais
   */
  calcularValorServicosAdicionais(checkoutData: CheckoutData): number {
    if (!checkoutData.addServicesDescription || checkoutData.addServicesDescription.length === 0) {
      return 0;
    }

    const total = checkoutData.addServicesDescription.reduce((acc, servico) => {
      return acc + servico.value;
    }, 0);

    console.log(`💰 Valor total dos serviços adicionais: R$ ${total.toFixed(2)}`);
    return total;
  }

  /**
   * Converte valor string em formato monetário para número
   * @param valorString Valor em formato "R$ 1.500,00"
   * @returns number Valor numérico
   */
  parseValorMonetario(valorString: string): number {
    try {
      const valorLimpo = valorString
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();

      const valorNumerico = parseFloat(valorLimpo);

      if (isNaN(valorNumerico)) {
        throw new Error(`Valor monetário inválido: ${valorString}`);
      }

      return valorNumerico;
    } catch (error) {
      console.error('❌ Erro ao converter valor monetário:', error);
      throw new Error('Valor monetário inválido');
    }
  }

  /**
   * Formata número para formato monetário brasileiro
   * @param valor Valor numérico
   * @returns string Valor formatado "R$ 1.500,00"
   */
  /**
   * Abre o checkout em uma nova janela
   * @param checkoutData Dados do checkout
   * @param width Largura da janela (padrão: 1024)
   * @param height Altura da janela (padrão: 768)
   * @returns Window | null A janela aberta ou null se falhar
   */
  abrirCheckout(checkoutData: CheckoutData, width: number = 1024, height: number = 768): Window | null {
    try {
      // Salvar os dados no localStorage primeiro
      this.salvarDadosCheckout(checkoutData);

      // Calcular posição centralizada
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      // Abrir nova janela com a página de checkout
      const checkoutWindow = window.open(
        '/checkout',
        'checkout',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,directories=no`
      );

      if (!checkoutWindow) {
        throw new Error('Não foi possível abrir a janela de checkout');
      }

      console.log('✅ Janela de checkout aberta com sucesso');
      return checkoutWindow;
    } catch (error) {
      console.error('❌ Erro ao abrir checkout:', error);
      return null;
    }
  }

  formatarValorMonetario(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }
}

// Exporta instância singleton do serviço
const checkoutStorageServiceInstance = new CheckoutStorageService();
export default checkoutStorageServiceInstance;
