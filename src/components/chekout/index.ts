
import CheckoutStorageService from '@/services/CheckoutStorageService';
import { AdditionalService, CheckoutData } from '@/types/Checkout';

interface CheckoutProps {
  userName: string;
  userId: string;
  valor: string;
  productName: string;
  productType: string;
  productDescription: string;
  quantidade?: number;
  validity?: number;
  obs?: string;
  addServicesDescription?: AdditionalService[];
}

/**
 * Componente para abrir o checkout em uma nova janela
 * 
 * @param props Dados do produto para checkout
 * @returns void - Abre uma nova janela com o checkout
 */
export default function Checkout({
  userName,
  userId,
  valor,
  productName,
  productType,
  productDescription,
  quantidade,
  validity,
  obs,
  addServicesDescription = [],
}: CheckoutProps) {
  console.log('🛒 Iniciando Checkout com:', {
    userName,
    userId,
    valor,
    productName,
    productType,
    productDescription,
    quantidade,
    validity,
    obs,
    addServicesDescription,
  });

  // Cria objeto com dados completos do checkout
  const checkoutData: CheckoutData = {
    userName,
    userId,
    valor,
    productName,
    productType,
    productDescription,
    quantidade,
    validity,
    obs,
    addServicesDescription,
  };

  console.log('📦 Dados completos do checkout:', checkoutData);

  // Salva dados no localStorage usando o serviço
  try {
    CheckoutStorageService.salvarDadosCheckout(checkoutData);
    console.log('✅ Dados salvos no localStorage com sucesso');
  } catch (error) {
    console.error('❌ Erro ao salvar dados no localStorage:', error);
    throw error;
  }

  // Verificar se os dados foram salvos corretamente
  try {
    const dadosSalvos = localStorage.getItem('checkout_data');
    console.log('🔍 Verificando dados salvos:', dadosSalvos);

    if (dadosSalvos) {
      const parseados = JSON.parse(dadosSalvos);
      console.log('✅ Dados salvos e parseados:', parseados);
    } else {
      console.error('❌ Nenhum dado encontrado no localStorage após salvar');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar dados salvos:', error);
  }

  // Calcula posição centralizada da janela
  const windowWidth = 1025;
  const windowHeight = 768;
  const windowLeft = window.screenX + (window.outerWidth - windowWidth) / 2;
  const windowTop = window.screenY + (window.outerHeight - windowHeight) / 2;

  console.log('🪟 Abrindo janela de checkout:', {
    windowWidth,
    windowHeight,
    windowLeft,
    windowTop,
  });

  // Abre nova janela com checkout
  const checkoutWindow = window.open(
    '/checkout',
    'Checkout',
    `width=${windowWidth},height=${windowHeight},left=${windowLeft},top=${windowTop},resizable=yes,scrollbars=yes`
  );

  // Foco na nova janela
  if (checkoutWindow) {
    checkoutWindow.focus();
    console.log('✅ Janela de checkout aberta e focada');
  } else {
    console.error('❌ Falha ao abrir janela de checkout');
  }

  console.log('🛒 Checkout aberto com dados:', checkoutData);

  // Retorna a referência da janela para monitoramento
  return checkoutWindow;
}
